import os
import re
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pypdf

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Common stop words for clean TF-IDF term frequency calculation
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she",
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

def extract_text_from_file(file_path: Path, filename: str) -> str:
    """Extract raw text from PDF, TXT, MD, CSV, or source code files."""
    ext = Path(filename).suffix.lower()
    
    if ext == ".pdf":
        text_content = []
        try:
            reader = pypdf.PdfReader(str(file_path))
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(f"--- Page {i + 1} ---\n{page_text}")
            return "\n\n".join(text_content)
        except Exception as e:
            return f"[Error extracting PDF: {str(e)}]"
    else:
        # Text/code files
        encodings = ["utf-8", "latin-1", "cp1252"]
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"[Error reading file: {str(e)}]"
        return "[Error: Unable to decode file content]"

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    """Split text into overlapping chunks respecting paragraph or sentence boundaries."""
    if not text.strip():
        return []

    # Clean text
    text = re.sub(r"\r\n", "\n", text)
    paragraphs = text.split("\n\n")
    
    chunks = []
    current_chunk = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        para_len = len(para)
        
        # If single paragraph is larger than chunk_size, split by sentences
        if para_len > chunk_size:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                sent_len = len(sentence)
                if current_len + sent_len > chunk_size and current_chunk:
                    chunk_str = " ".join(current_chunk)
                    chunks.append(chunk_str)
                    # retain overlap
                    overlap_chars = 0
                    overlap_chunk = []
                    for item in reversed(current_chunk):
                        overlap_chunk.insert(0, item)
                        overlap_chars += len(item)
                        if overlap_chars >= overlap:
                            break
                    current_chunk = overlap_chunk
                    current_len = sum(len(x) for x in current_chunk)
                current_chunk.append(sentence)
                current_len += sent_len
        else:
            if current_len + para_len > chunk_size and current_chunk:
                chunk_str = "\n\n".join(current_chunk)
                chunks.append(chunk_str)
                # retain last paragraph for overlap if possible
                current_chunk = [current_chunk[-1]] if len(current_chunk) > 1 else []
                current_len = sum(len(x) for x in current_chunk)
            current_chunk.append(para)
            current_len += para_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks

def tokenize(text: str) -> List[str]:
    """Lowercase tokenization removing punctuation and stop words."""
    words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
    return [w for w in words if w not in STOP_WORDS]

def compute_tf_vector(text: str) -> Dict[str, float]:
    """Calculate term frequencies for text."""
    tokens = tokenize(text)
    if not tokens:
        return {}
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    total = len(tokens)
    return {k: v / total for k, v in counts.items()}

def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Calculate cosine similarity between two sparse term vectors."""
    common_keys = set(vec1.keys()) & set(vec2.keys())
    if not common_keys:
        return 0.0
    dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
    norm1 = math.sqrt(sum(v * v for v in vec1.values()))
    norm2 = math.sqrt(sum(v * v for v in vec2.values()))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)

def search_relevant_chunks(query: str, all_chunks: List[Dict[str, Any]], top_k: int = 4) -> List[Tuple[Dict[str, Any], float]]:
    """Rank chunks by relevance to query using hybrid TF-IDF keyword overlap + density scoring."""
    if not query.strip() or not all_chunks:
        return []
    
    query_vec = compute_tf_vector(query)
    query_tokens = set(tokenize(query))
    if not query_tokens:
        return []
        
    scores: List[Tuple[Dict[str, Any], float]] = []

    for chunk in all_chunks:
        text = chunk.get("text", "")
        chunk_vec = compute_tf_vector(text)
        cos_score = cosine_similarity(query_vec, chunk_vec)
        
        # Exact keyword boost for code/technical identifiers
        chunk_lower = text.lower()
        exact_match_score = 0.0
        for token in query_tokens:
            if token in chunk_lower:
                exact_match_score += 0.25
                
        final_score = cos_score + exact_match_score
        if final_score > 0.05:
            scores.append((chunk, final_score))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]

def build_rag_prompt(query: str, retrieved_chunks: List[Tuple[Dict[str, Any], float]]) -> str:
    """Format retrieved document chunks as grounded context for the LLM."""
    if not retrieved_chunks:
        return query
    
    context_blocks = []
    for idx, (chunk, score) in enumerate(retrieved_chunks, 1):
        filename = chunk.get("filename", "Uploaded Document")
        text = chunk.get("text", "").strip()
        context_blocks.append(f"[Source {idx} - {filename}]:\n{text}")

    context_str = "\n\n".join(context_blocks)
    rag_prompt = (
        f"Use the following grounded offline document excerpts to accurately answer the question. "
        f"Cite relevant sources where helpful.\n\n"
        f"--- RELEVANT DOCUMENT EXCERPTS ---\n"
        f"{context_str}\n"
        f"--- END OF EXCERPTS ---\n\n"
        f"User Question: {query}"
    )
    return rag_prompt

if __name__ == "__main__":
    sample_text = """
    Aura Local AI is an offline AI assistant that runs on Windows with local hardware acceleration.
    It leverages NVIDIA RTX 3050 GPUs with 6GB VRAM to offload transformer layers.
    Document indexing is performed locally using smart sentence chunking and vector similarity.
    All data remains on the local laptop without sending anything to cloud servers.
    """
    chunks = chunk_text(sample_text, chunk_size=120, overlap=30)
    print(f"Generated {len(chunks)} chunks.")
    for i, c in enumerate(chunks):
        print(f"Chunk {i+1}: {c[:60]}...")
