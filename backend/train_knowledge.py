"""
Aura Local AI - Knowledge Base Trainer & Model Switcher
Ingests training knowledge into local vector storage and activates the fine-tuned Aura model.
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, add_document, save_document_chunks, update_settings, get_all_settings
from app.rag import extract_text_from_file, chunk_text

def train_local_knowledge():
    print("=== TRAINING AURA LOCAL KNOWLEDGE BASE ===")
    init_db()

    manual_path = Path(__file__).resolve().parent / "data" / "training_manual.md"
    if not manual_path.exists():
        print("Training manual not found!")
        return

    text = extract_text_from_file(manual_path, "training_manual.md")
    chunks = chunk_text(text, chunk_size=600, overlap=100)
    
    print(f"Extracted {len(text)} characters into {len(chunks)} training chunks.")

    doc_id = add_document(
        filename="Aura_Core_Knowledge_Manual.md",
        file_type=".md",
        file_size=len(text.encode("utf-8")),
        file_path=str(manual_path),
        chunk_count=len(chunks)
    )

    chunk_records = [{"text": c, "embedding": []} for c in chunks]
    save_document_chunks(doc_id, chunk_records)
    print(f"[SUCCESS] Ingested document ID: {doc_id} with {len(chunks)} chunks.")

    # Update active model to the new trained model: 'aura'
    update_settings({"active_model": "aura"})
    print("[SUCCESS] Active model set to: 'aura'")
    
    settings = get_all_settings()
    print("Current settings active model:", settings.get("active_model"))
    print("\n TRAINING & MODEL ACTIVATION COMPLETED SUCCESSFULLY! ")

if __name__ == "__main__":
    train_local_knowledge()
