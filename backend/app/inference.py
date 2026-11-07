import httpx
import json
import asyncio
import os
import subprocess
import shutil
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.system_specs import get_system_specs

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

class InferenceManager:
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url
        self._ollama_process = None

    async def is_engine_running(self) -> bool:
        """Check if local Ollama daemon is reachable."""
        try:
            async with httpx.AsyncClient(timeout=0.8) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def ensure_ollama_started(self) -> bool:
        """Attempt to spawn Ollama in the background if installed and not running."""
        specs = get_system_specs()
        ollama_path = specs.get("ollama_path")
        if not ollama_path or not os.path.exists(ollama_path):
            return False

        try:
            # Check if already running before launching
            CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0
            DETACHED_PROCESS = 0x00000008 if os.name == "nt" else 0
            self._ollama_process = subprocess.Popen(
                [ollama_path, "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=CREATE_NO_WINDOW | DETACHED_PROCESS,
                close_fds=True
            )
            return True
        except Exception as e:
            print("Failed to auto-start Ollama:", e)
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all models currently installed locally in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = data.get("models", [])
                    formatted = []
                    for m in models:
                        size_bytes = m.get("size", 0)
                        size_gb = round(size_bytes / (1024 ** 3), 2)
                        formatted.append({
                            "name": m.get("name"),
                            "model": m.get("model"),
                            "size_gb": size_gb,
                            "modified_at": m.get("modified_at"),
                            "details": m.get("details", {})
                        })
                    return formatted
        except Exception as e:
            print("Error listing local models:", e)
        return []

    async def stream_chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        top_p: float = 0.9,
        max_tokens: int = 4096,
        gpu_offload: bool = True
    ) -> AsyncGenerator[str, None]:
        """Stream chat tokens via Server-Sent Events from local Ollama instance."""
        specs = get_system_specs()
        logical_cores = specs.get("logical_cores", 8)

        options = {
            "temperature": temperature,
            "top_p": top_p,
            "num_predict": max_tokens,
            "num_thread": logical_cores
        }

        # Enable GPU offload if available and requested
        if gpu_offload and specs.get("has_gpu"):
            options["num_gpu"] = 99  # Offload all layers to RTX 3050

        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": options
        }

        try:
            timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        error_detail = await response.aread()
                        yield f"data: {json.dumps({'error': f'Ollama error ({response.status_code}): {error_detail.decode()}', 'done': True})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            message = chunk.get("message", {})
                            content = message.get("content", "")
                            done = chunk.get("done", False)

                            sse_data = {
                                "content": content,
                                "done": done
                            }

                            if done:
                                sse_data["total_duration"] = chunk.get("total_duration")
                                sse_data["eval_count"] = chunk.get("eval_count")
                                sse_data["eval_duration"] = chunk.get("eval_duration")

                            yield f"data: {json.dumps(sse_data)}\n\n"
                            if done:
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            err_msg = (
                "Cannot connect to local Ollama instance. "
                "Ensure Ollama is running on http://127.0.0.1:11434. "
                "Run `ollama serve` or open the Ollama desktop app."
            )
            yield f"data: {json.dumps({'error': err_msg, 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    async def pull_model_stream(self, model_name: str) -> AsyncGenerator[str, None]:
        """Stream model download/pull progress from Ollama."""
        try:
            timeout = httpx.Timeout(connect=15.0, read=None, write=15.0, pool=15.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/pull", json={"name": model_name, "stream": True}) as res:
                    async for line in res.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            yield f"data: {json.dumps(data)}\n\n"
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'status': 'failed'})}\n\n"

inference_manager = InferenceManager()
