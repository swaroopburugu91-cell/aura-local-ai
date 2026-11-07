import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=== RUNNING AURA LOCAL AI TEST SUITE ===")
    
    # 1. Health & Specs
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print(" [PASS] /api/health:", health["status"], "| GPU:", health["specs"]["gpu_name"], "| Cores:", health["specs"]["logical_cores"])

    # 2. Models
    res = client.get("/api/models")
    assert res.status_code == 200
    models_data = res.json()
    print(" [PASS] /api/models: Active =", models_data["active_model"], "| Recommended count =", len(models_data["recommended"]))

    # 3. Create Conversation
    res = client.post("/api/conversations", json={"title": "Test AI Chat", "model": "llama3.2:3b"})
    assert res.status_code == 200
    conv = res.json()
    cid = conv["id"]
    print(" [PASS] POST /api/conversations: Created chat ID =", cid)

    # 4. List Conversations
    res = client.get("/api/conversations")
    assert res.status_code == 200
    convs = res.json()
    assert any(c["id"] == cid for c in convs)
    print(" [PASS] GET /api/conversations: Found", len(convs), "chats")

    # 5. Document Upload & RAG indexing
    sample_content = (
        "Project Aura Local AI is designed for Windows laptops with NVIDIA RTX GPUs. "
        "It provides 100% offline intelligence without any cloud servers or API keys. "
        "The model llama3.2 3B runs directly in the 6GB VRAM at over 50 tokens per second."
    )
    file_bytes = io.BytesIO(sample_content.encode("utf-8"))
    res = client.post(
        "/api/documents/upload",
        files={"file": ("aura_docs.txt", file_bytes, "text/plain")}
    )
    assert res.status_code == 200, f"Upload failed: {res.text}"
    doc_res = res.json()
    print(" [PASS] POST /api/documents/upload: Indexed doc with", doc_res["chunk_count"], "chunks")

    # 6. List Documents
    res = client.get("/api/documents")
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) > 0
    print(" [PASS] GET /api/documents: Total indexed docs =", len(docs))

    # 7. Settings
    res = client.get("/api/settings")
    assert res.status_code == 200
    settings = res.json()
    print(" [PASS] GET /api/settings: Temperature =", settings.get("temperature"))

    # 8. Frontend Root HTML
    res = client.get("/")
    assert res.status_code == 200
    assert "Aura Local AI" in res.text or "<div id=\"root\">" in res.text
    print(" [PASS] GET / (Frontend serving): Successfully served index.html")

    print("\n ALL BACKEND AND RAG TESTS PASSED SUCCESSFULLY! ")

if __name__ == "__main__":
    run_tests()
