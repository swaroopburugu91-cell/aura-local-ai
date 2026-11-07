import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

class SupabaseManager:
    def __init__(self, url: str = SUPABASE_URL, key: str = SUPABASE_KEY):
        self.url = url
        self.key = key
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.url and self.key:
            try:
                from supabase import create_client
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print("Notice: Supabase client initialization skipped:", e)
                self.client = None

    def is_configured(self) -> bool:
        return self.client is not None

    def update_credentials(self, url: str, key: str):
        self.url = url
        self.key = key
        self._init_client()

    def sync_conversation(self, conv: Dict[str, Any]) -> bool:
        """Sync a conversation record to Supabase if configured."""
        if not self.client:
            return False
        try:
            payload = {
                "id": conv["id"],
                "title": conv["title"],
                "model": conv.get("model", "llama3.2:3b"),
                "system_prompt": conv.get("system_prompt", ""),
                "pinned": bool(conv.get("pinned", 0)),
                "updated_at": conv.get("updated_at")
            }
            self.client.table("conversations").upsert(payload).execute()
            return True
        except Exception as e:
            print("Supabase conversation sync warning:", e)
            return False

    def sync_message(self, msg: Dict[str, Any]) -> bool:
        """Sync a message record to Supabase if configured."""
        if not self.client:
            return False
        try:
            payload = {
                "id": msg["id"],
                "conversation_id": msg["conversation_id"],
                "role": msg["role"],
                "content": msg["content"],
                "tokens": msg.get("tokens", 0),
                "created_at": msg.get("created_at")
            }
            self.client.table("messages").upsert(payload).execute()
            return True
        except Exception as e:
            print("Supabase message sync warning:", e)
            return False

    def sync_document(self, doc: Dict[str, Any]) -> bool:
        """Sync document metadata to Supabase if configured."""
        if not self.client:
            return False
        try:
            payload = {
                "id": doc["id"],
                "filename": doc["filename"],
                "file_type": doc["file_type"],
                "file_size": doc["file_size"],
                "chunk_count": doc.get("chunk_count", 0),
                "created_at": doc.get("created_at")
            }
            self.client.table("documents").upsert(payload).execute()
            return True
        except Exception as e:
            print("Supabase document sync warning:", e)
            return False

supabase_manager = SupabaseManager()
