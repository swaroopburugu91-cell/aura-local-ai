import sqlite3
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "aura_ai.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                model TEXT DEFAULT 'llama3.2:3b',
                system_prompt TEXT DEFAULT '',
                pinned INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        
        # Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tokens INTEGER DEFAULT 0,
                files TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
        """)
        
        # Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)
        
        # Document Chunks table for RAG
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                text TEXT NOT NULL,
                embedding TEXT DEFAULT '[]',
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
        """)
        
        # Settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        
        # Default settings seed
        default_settings = {
            "active_model": "llama3.2:3b",
            "temperature": "0.7",
            "top_p": "0.9",
            "max_tokens": "4096",
            "theme": "dark",
            "system_prompt": "You are Aura, an exceptionally intelligent, helpful, and concise local AI assistant. You run 100% offline on the user's laptop. Always provide clear, accurate, and beautifully structured responses with markdown formatting.",
            "gpu_offload": "true",
            "tts_rate": "1.0",
            "tts_voice": "default"
        }
        for k, v in default_settings.items():
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
            
        conn.commit()

# --- Conversation operations ---

def list_conversations(search: str = "") -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        if search:
            cursor.execute("""
                SELECT DISTINCT c.* FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.title LIKE ? OR m.content LIKE ?
                ORDER BY c.pinned DESC, c.updated_at DESC
            """, (f"%{search}%", f"%{search}%"))
        else:
            cursor.execute("SELECT * FROM conversations ORDER BY pinned DESC, updated_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def create_conversation(title: str = "New Chat", model: str = "llama3.2:3b") -> Dict[str, Any]:
    cid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (cid, title, model, now, now)
        )
        conn.commit()
    return {"id": cid, "title": title, "model": model, "pinned": 0, "created_at": now, "updated_at": now}

def get_conversation(cid: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (cid,))
        row = cursor.fetchone()
        return dict(row) if row else None

def update_conversation(cid: str, title: Optional[str] = None, pinned: Optional[int] = None, model: Optional[str] = None):
    with get_db() as conn:
        now = datetime.utcnow().isoformat()
        if title is not None and pinned is not None:
            conn.execute("UPDATE conversations SET title = ?, pinned = ?, updated_at = ? WHERE id = ?", (title, pinned, now, cid))
        elif title is not None:
            conn.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (title, now, cid))
        elif pinned is not None:
            conn.execute("UPDATE conversations SET pinned = ?, updated_at = ? WHERE id = ?", (pinned, now, cid))
        elif model is not None:
            conn.execute("UPDATE conversations SET model = ?, updated_at = ? WHERE id = ?", (model, now, cid))
        conn.commit()

def delete_conversation(cid: str):
    with get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (cid,))
        conn.commit()

# --- Message operations ---

def list_messages(cid: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (cid,))
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            try:
                d["files"] = json.loads(d["files"]) if d["files"] else []
            except Exception:
                d["files"] = []
            result.append(d)
        return result

def add_message(cid: str, role: str, content: str, files: List[Any] = None, tokens: int = 0) -> Dict[str, Any]:
    mid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    files_json = json.dumps(files or [])
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, tokens, files, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (mid, cid, role, content, tokens, files_json, now)
        )
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, cid))
        conn.commit()
    return {"id": mid, "conversation_id": cid, "role": role, "content": content, "tokens": tokens, "files": files or [], "created_at": now}

def clear_messages(cid: str):
    with get_db() as conn:
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
        conn.commit()

# --- Document operations ---

def add_document(filename: str, file_type: str, file_size: int, file_path: str, chunk_count: int = 0) -> str:
    did = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO documents (id, filename, file_type, file_size, file_path, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (did, filename, file_type, file_size, file_path, chunk_count, now)
        )
        conn.commit()
    return did

def list_documents() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
        return [dict(r) for r in cursor.fetchall()]

def delete_document(did: str):
    with get_db() as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (did,))
        conn.commit()

def save_document_chunks(did: str, chunks: List[Dict[str, Any]]):
    with get_db() as conn:
        for idx, chunk in enumerate(chunks):
            cid = str(uuid.uuid4())
            emb_str = json.dumps(chunk.get("embedding", []))
            conn.execute(
                "INSERT INTO document_chunks (id, document_id, chunk_index, text, embedding) VALUES (?, ?, ?, ?, ?)",
                (cid, did, idx, chunk["text"], emb_str)
            )
        conn.execute("UPDATE documents SET chunk_count = ? WHERE id = ?", (len(chunks), did))
        conn.commit()

def get_all_chunks() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.id, c.document_id, c.chunk_index, c.text, c.embedding, d.filename
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
        """)
        results = []
        for row in cursor.fetchall():
            d = dict(row)
            try:
                d["embedding"] = json.loads(d["embedding"])
            except Exception:
                d["embedding"] = []
            results.append(d)
        return results

# --- Settings operations ---

def get_all_settings() -> Dict[str, str]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        return {r["key"]: r["value"] for r in cursor.fetchall()}

def update_settings(updates: Dict[str, str]):
    with get_db() as conn:
        for k, v in updates.items():
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
        conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
