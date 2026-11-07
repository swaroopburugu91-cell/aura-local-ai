import subprocess
import os
import platform
import shutil
import re
from typing import Dict, Any, Optional

def get_system_specs() -> Dict[str, Any]:
    """Retrieve detailed hardware specs including CPU, RAM, GPU (RTX 3050), and Ollama status."""
    info = {
        "os": platform.system() + " " + platform.release(),
        "cpu_name": os.environ.get("PROCESSOR_IDENTIFIER", platform.processor()),
        "logical_cores": os.cpu_count() or 4,
        "total_ram_gb": 16.0,
        "free_ram_gb": 8.0,
        "gpu_name": "Unknown",
        "total_vram_mb": 0,
        "free_vram_mb": 0,
        "gpu_temp_c": None,
        "cuda_version": None,
        "driver_version": None,
        "has_gpu": False,
        "ollama_installed": False,
        "ollama_path": None,
        "recommended_models": []
    }

    # RAM detection via ctypes/PowerShell
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            info["total_ram_gb"] = round(stat.ullTotalPhys / (1024 ** 3), 2)
            info["free_ram_gb"] = round(stat.ullAvailPhys / (1024 ** 3), 2)
    except Exception:
        pass

    # GPU detection via nvidia-smi
    try:
        smi_out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,temperature.gpu,driver_version", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=3
        ).strip()
        if smi_out:
            parts = [p.strip() for p in smi_out.split(",")]
            if len(parts) >= 5:
                info["gpu_name"] = parts[0]
                info["total_vram_mb"] = int(float(parts[1]))
                info["free_vram_mb"] = int(float(parts[2]))
                info["gpu_temp_c"] = int(float(parts[3]))
                info["driver_version"] = parts[4]
                info["has_gpu"] = True
    except Exception:
        # Check standard default for this machine if nvidia-smi had transient error
        pass

    # Ollama detection
    ollama_exec = shutil.which("ollama")
    if not ollama_exec:
        default_ollama = os.path.expanduser(r"~\AppData\Local\Programs\Ollama\ollama.exe")
        if os.path.exists(default_ollama):
            ollama_exec = default_ollama

    if ollama_exec:
        info["ollama_installed"] = True
        info["ollama_path"] = ollama_exec

    # Model recommendations tailored to hardware
    vram_gb = info["total_vram_mb"] / 1024 if info["total_vram_mb"] else 0
    if vram_gb >= 5.5:  # e.g. RTX 3050 6GB
        info["recommended_models"] = [
            {
                "name": "llama3.2:3b",
                "tag": "llama3.2:3b",
                "size_gb": 2.0,
                "badge": "Fastest (Recommended)",
                "description": "Meta Llama 3.2 3B Instruct. Runs 100% in RTX 3050 VRAM at 55+ tok/s. Exceptional coding, reasoning, and offline performance.",
                "gpu_support": "Full 100% GPU Offload"
            },
            {
                "name": "qwen2.5:3b",
                "tag": "qwen2.5:3b",
                "size_gb": 1.9,
                "badge": "Top Code & Math",
                "description": "Qwen 2.5 3B Instruct. Outstanding for multi-language coding (Python, C++, Java, JS), math problem solving, and structured answers.",
                "gpu_support": "Full 100% GPU Offload"
            },
            {
                "name": "llama3.1:8b",
                "tag": "llama3.1:8b",
                "size_gb": 4.7,
                "badge": "Maximum Intelligence",
                "description": "Meta Llama 3.1 8B Instruct. Fits in 6GB VRAM at Q4_K_M. Supreme reasoning, complex debugging, and deep document summarization.",
                "gpu_support": "Full or Hybrid GPU Offload"
            },
            {
                "name": "qwen2.5:1.5b",
                "tag": "qwen2.5:1.5b",
                "size_gb": 1.0,
                "badge": "Battery Saver",
                "description": "Ultra-lightweight model for high power efficiency and instant responses even on battery power.",
                "gpu_support": "Full 100% GPU Offload"
            }
        ]
    else:
        info["recommended_models"] = [
            {
                "name": "llama3.2:3b",
                "tag": "llama3.2:3b",
                "size_gb": 2.0,
                "badge": "Recommended",
                "description": "Balanced high-performance 3B model for CPU and low VRAM.",
                "gpu_support": "CPU / Partial GPU"
            },
            {
                "name": "qwen2.5:1.5b",
                "tag": "qwen2.5:1.5b",
                "size_gb": 1.0,
                "badge": "Lightweight",
                "description": "Super fast, lightweight model with minimal RAM footprint.",
                "gpu_support": "CPU Friendly"
            }
        ]

    return info

if __name__ == "__main__":
    import pprint
    pprint.pprint(get_system_specs())
