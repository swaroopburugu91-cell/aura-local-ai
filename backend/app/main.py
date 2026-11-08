import os
import json
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.database import (
    init_db,
    list_conversations,
    create_conversation,
    get_conversation,
    update_conversation,
    delete_conversation,
    list_messages,
    add_message,
    clear_messages,
    add_document,
    list_documents,
    delete_document,
    save_document_chunks,
    get_all_chunks,
    get_all_settings,
    update_settings,
)
from app.system_specs import get_system_specs
from app.inference import inference_manager
from app.rag import extract_text_from_file, chunk_text, search_relevant_chunks, build_rag_prompt
from app.audio import transcribe_audio_file
from app.supabase_client import supabase_manager
from app.tools import (
    execute_shell_command,
    list_folder_contents,
    read_laptop_file,
    write_laptop_file,
    launch_desktop_application,
    SYSTEM_TOOLS_SCHEMA
)
from app.autonomous_agent import handle_direct_system_intent, execute_action_tag

# Initialize database on startup
init_db()

app = FastAPI(
    title="Aura Local AI Assistant API",
    description="100% Offline AI Assistant Engine powered by local LLMs and hardware acceleration.",
    version="1.0.0"
)

# Enable CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --- Pydantic Models ---

class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    model: Optional[str] = None
    use_rag: bool = True
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    files: Optional[List[str]] = None

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"
    model: Optional[str] = "llama3.2:3b"

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    pinned: Optional[int] = None
    model: Optional[str] = None

class PullModelRequest(BaseModel):
    name: str

class SettingsUpdate(BaseModel):
    settings: dict

# --- System & Health Endpoints ---

@app.get("/api/health")
async def health_check():
    specs = get_system_specs()
    ollama_running = await inference_manager.is_engine_running()
    
    # Auto-attempt start if installed but not running
    if not ollama_running and specs.get("ollama_installed"):
        inference_manager.ensure_ollama_started()
        # Brief yield to give process a moment
        ollama_running = await inference_manager.is_engine_running()

    return {
        "status": "healthy",
        "offline_ready": True,
        "ollama_running": ollama_running,
        "specs": specs
    }

# --- Model Endpoints ---

@app.get("/api/models")
async def get_models():
    specs = get_system_specs()
    installed = await inference_manager.list_models()
    settings = get_all_settings()
    active_model = settings.get("active_model", "llama3.2:3b")

    return {
        "active_model": active_model,
        "installed": installed,
        "recommended": specs.get("recommended_models", []),
        "has_gpu": specs.get("has_gpu", False),
        "gpu_name": specs.get("gpu_name")
    }

@app.post("/api/models/pull")
async def pull_model(req: PullModelRequest):
    return StreamingResponse(
        inference_manager.pull_model_stream(req.name),
        media_type="text/event-stream"
    )

# --- Conversation Endpoints ---

@app.get("/api/conversations")
def get_conversations(q: Optional[str] = None):
    return list_conversations(search=q or "")

@app.post("/api/conversations")
def create_new_conversation(data: ConversationCreate):
    settings = get_all_settings()
    default_model = settings.get("active_model", "llama3.2:3b")
    conv = create_conversation(title=data.title or "New Chat", model=data.model or default_model)
    supabase_manager.sync_conversation(conv)
    return conv

@app.get("/api/conversations/{cid}")
def get_conversation_details(cid: str):
    conv = get_conversation(cid)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = list_messages(cid)
    return {"conversation": conv, "messages": messages}

@app.put("/api/conversations/{cid}")
def update_conversation_details(cid: str, data: ConversationUpdate):
    update_conversation(cid, title=data.title, pinned=data.pinned, model=data.model)
    return {"success": True}

@app.delete("/api/conversations/{cid}")
def delete_conversation_by_id(cid: str):
    delete_conversation(cid)
    return {"success": True}

@app.delete("/api/conversations/{cid}/messages")
def clear_conversation_messages(cid: str):
    clear_messages(cid)
    return {"success": True}

# --- Streaming Chat Endpoint ---

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    conv = get_conversation(req.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    settings = get_all_settings()
    model = req.model or conv.get("model") or settings.get("active_model", "llama3.2:3b")
    system_prompt = req.system_prompt or settings.get(
        "system_prompt",
        "You are Aura, a friendly, ultra-fast, and precise offline AI assistant. Always format responses clearly using Markdown."
    )
    temperature = req.temperature if req.temperature is not None else float(settings.get("temperature", 0.7))
    top_p = req.top_p if req.top_p is not None else float(settings.get("top_p", 0.9))
    max_tokens = req.max_tokens or int(settings.get("max_tokens", 4096))
    gpu_offload = settings.get("gpu_offload", "true").lower() == "true"

    # Save user message to database
    user_msg_rec = add_message(
        cid=req.conversation_id,
        role="user",
        content=req.message,
        files=req.files or []
    )
    supabase_manager.sync_message(user_msg_rec)

    # Automatically set conversation title on first message
    history = list_messages(req.conversation_id)
    if len(history) <= 1:
        # Generate short 4-word title from prompt
        words = req.message.strip().split()
        title = " ".join(words[:5]) if words else "New Chat"
        if len(title) > 30:
            title = title[:27] + "..."
        update_conversation(req.conversation_id, title=title)

    # 1. Direct Autonomous Action Interception
    direct_action = handle_direct_system_intent(req.message)
    if direct_action:
        async def direct_event_generator():
            msg_content = direct_action["message"]
            yield f"data: {json.dumps({'content': msg_content, 'done': False})}\n\n"
            yield f"data: {json.dumps({'done': True, 'eval_count': 30})}\n\n"
            asst_rec = add_message(
                cid=req.conversation_id,
                role="assistant",
                content=msg_content,
                tokens=30
            )
            supabase_manager.sync_message(asst_rec)
        return StreamingResponse(direct_event_generator(), media_type="text/event-stream")

    # RAG Grounding: search indexed chunks if enabled
    prompt_to_send = req.message
    grounded_sources = []
    if req.use_rag:
        all_chunks = get_all_chunks()
        if all_chunks:
            ranked_chunks = search_relevant_chunks(req.message, all_chunks, top_k=4)
            if ranked_chunks:
                prompt_to_send = build_rag_prompt(req.message, ranked_chunks)
                grounded_sources = [
                    {"filename": c[0].get("filename"), "score": round(c[1], 2), "chunk": c[0].get("text")[:100]}
                    for c in ranked_chunks
                ]

    # Assemble conversation context
    messages_payload = [{"role": "system", "content": system_prompt}]
    
    # Include up to last 10 messages for memory context
    for msg in history[-10:-1]:  # previous messages
        messages_payload.append({"role": msg["role"], "content": msg["content"]})
    
    # Current grounded user message
    messages_payload.append({"role": "user", "content": prompt_to_send})

    async def event_generator():
        full_response = []
        # First send sources metadata event if RAG retrieved documents
        if grounded_sources:
            yield f"data: {json.dumps({'sources': grounded_sources, 'done': False})}\n\n"

        async for chunk_str in inference_manager.stream_chat(
            model=model,
            messages=messages_payload,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            gpu_offload=gpu_offload
        ):
            # Parse chunk to collect full response
            if chunk_str.startswith("data: "):
                try:
                    payload = json.loads(chunk_str[6:].strip())
                    content_piece = payload.get("content", "")
                    if content_piece:
                        full_response.append(content_piece)
                    if payload.get("done"):
                        # Check for autonomous action tags and execute them directly
                        final_text = "".join(full_response)
                        cleaned_final, action_info = execute_action_tag(final_text)
                        if action_info:
                            extra_output = cleaned_final[len(final_text):] if len(cleaned_final) > len(final_text) else cleaned_final
                            yield f"data: {json.dumps({'content': extra_output, 'done': False})}\n\n"
                            final_text = cleaned_final

                        if final_text.strip():
                            asst_rec = add_message(
                                cid=req.conversation_id,
                                role="assistant",
                                content=final_text,
                                tokens=payload.get("eval_count", 0)
                            )
                            supabase_manager.sync_message(asst_rec)
                except Exception:
                    pass
            yield chunk_str

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- Document & Knowledge Base Endpoints (RAG) ---

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    file_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{file_id}_{filename}"
    
    # Save file to disk
    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    file_size = len(contents)
    ext = Path(filename).suffix.lower()

    # Extract text
    raw_text = extract_text_from_file(save_path, filename)
    if not raw_text or raw_text.startswith("[Error"):
        raise HTTPException(status_code=400, detail=raw_text or "Failed to extract text from file")

    # Chunk text
    chunks = chunk_text(raw_text, chunk_size=750, overlap=120)
    
    # Save to database
    did = add_document(
        filename=filename,
        file_type=ext,
        file_size=file_size,
        file_path=str(save_path),
        chunk_count=len(chunks)
    )
    
    chunk_records = [{"text": c, "embedding": []} for c in chunks]
    save_document_chunks(did, chunk_records)

    return {
        "id": did,
        "filename": filename,
        "file_type": ext,
        "file_size": file_size,
        "chunk_count": len(chunks),
        "status": "indexed_successfully"
    }

@app.get("/api/documents")
def get_documents():
    return list_documents()

@app.delete("/api/documents/{did}")
def remove_document(did: str):
    delete_document(did)
    return {"success": True}

# --- Settings Endpoints ---

@app.get("/api/settings")
def get_settings():
    return get_all_settings()

@app.post("/api/settings")
def save_settings(data: SettingsUpdate):
    update_settings(data.settings)
    return {"success": True, "settings": get_all_settings()}

# --- Supabase Cloud Sync Endpoints ---

class SupabaseConfig(BaseModel):
    url: str
    key: str

@app.get("/api/supabase/status")
def get_supabase_status():
    return {
        "configured": supabase_manager.is_configured(),
        "url": supabase_manager.url or "",
        "has_key": bool(supabase_manager.key)
    }

@app.post("/api/supabase/config")
def set_supabase_config(cfg: SupabaseConfig):
    supabase_manager.update_credentials(cfg.url, cfg.key)
    update_settings({"supabase_url": cfg.url, "supabase_key": cfg.key})
    return {
        "success": True,
        "configured": supabase_manager.is_configured()
    }

# --- OS Automation & Computer Control Endpoints ---

class ExecCommandRequest(BaseModel):
    command: str

class ListFilesRequest(BaseModel):
    folder_path: Optional[str] = None

class ReadFileRequest(BaseModel):
    file_path: str

class WriteFileRequest(BaseModel):
    file_path: str
    content: str

class LaunchAppRequest(BaseModel):
    app_name: str

@app.post("/api/tools/execute_command")
def api_execute_command(req: ExecCommandRequest):
    return execute_shell_command(req.command)

@app.post("/api/tools/list_files")
def api_list_files(req: ListFilesRequest):
    return list_folder_contents(req.folder_path)

@app.post("/api/tools/read_file")
def api_read_file(req: ReadFileRequest):
    return read_laptop_file(req.file_path)

@app.post("/api/tools/write_file")
def api_write_file(req: WriteFileRequest):
    return write_laptop_file(req.file_path, req.content)

@app.post("/api/tools/launch_app")
def api_launch_app(req: LaunchAppRequest):
    return launch_desktop_application(req.app_name)

# --- Audio Transcription Endpoint ---

@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_path = UPLOAD_DIR / f"temp_{uuid.uuid4()}_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    result = transcribe_audio_file(temp_path)
    if temp_path.exists():
        temp_path.unlink()
    return result

# --- Project Download Endpoint ---
@app.get("/api/download/zip")
def download_project_zip():
    zip_path = Path(r"C:\Users\swaro\Downloads\Aura-Local-AI-Full-Project.zip")
    if zip_path.exists():
        return FileResponse(zip_path, filename="Aura-Local-AI-Full-Project.zip", media_type="application/zip")
    raise HTTPException(status_code=404, detail="ZIP archive not found")

# --- Mount Static Frontend Build (if present) ---
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
