import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

AUDIO_TEMP_DIR = Path(__file__).resolve().parent.parent / "uploads" / "audio"
AUDIO_TEMP_DIR.mkdir(parents=True, exist_ok=True)

def transcribe_audio_file(file_path: Path) -> Dict[str, Any]:
    """Transcribe audio file locally using faster-whisper or whisper if installed."""
    # Try faster-whisper
    try:
        from faster_whisper import WhisperModel
        # Use tiny or base for instant offline speed
        model = WhisperModel("tiny", device="auto", compute_type="int8")
        segments, info = model.transcribe(str(file_path), beam_size=5)
        text = " ".join([segment.text for segment in segments]).strip()
        return {"success": True, "text": text, "language": info.language, "engine": "faster-whisper"}
    except ImportError:
        pass

    # Try openai-whisper
    try:
        import whisper
        model = whisper.load_model("tiny")
        result = model.transcribe(str(file_path))
        return {"success": True, "text": result.get("text", "").strip(), "engine": "whisper"}
    except ImportError:
        pass

    return {
        "success": False,
        "error": "Offline Whisper is not installed in Python. You can install it with `pip install faster-whisper` or use the browser's built-in offline Speech-to-Text directly.",
        "text": ""
    }

def synthesize_speech(text: str, output_path: Path) -> bool:
    """Generate offline TTS audio using pyttsx3 (Windows SAPI5)."""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.save_to_file(text, str(output_path))
        engine.runAndWait()
        return True
    except Exception as e:
        print("TTS error:", e)
        return False
