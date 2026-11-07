import httpx
import time
import json

def test_local_model():
    print("Testing real local model inference (llama3.2:3b)...")
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": "llama3.2:3b",
        "prompt": "Write a fast Python function to check prime and explain in 2 bullets.",
        "stream": False,
        "options": {
            "num_gpu": 99,
            "temperature": 0.7
        }
    }
    
    t0 = time.time()
    with httpx.Client(timeout=60.0) as client:
        res = client.post(url, json=payload)
    t1 = time.time()
    
    if res.status_code == 200:
        data = res.json()
        eval_count = data.get("eval_count", 0)
        eval_duration = data.get("eval_duration", 1) / 1e9  # seconds
        tok_per_sec = round(eval_count / eval_duration, 2) if eval_duration > 0 else 0
        total_time = round(t1 - t0, 2)
        
        print("\n=== LOCAL AI INFERENCE SUCCESSFUL ===")
        print(f"Total Response Time: {total_time}s")
        print(f"Tokens Generated: {eval_count} tokens")
        print(f"Inference Speed: {tok_per_sec} tokens/second")
        print(f"\n--- Model Response ---\n{data.get('response')}\n----------------------")
    else:
        print("Inference error:", res.status_code, res.text)

if __name__ == "__main__":
    test_local_model()
