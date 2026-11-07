"""
Aura Local AI - Desktop Native Window Launcher
Uses native Windows Edge Chromium WebView2 via pywebview to display Aura
as a frameless, native Windows desktop application without browser tabs.
"""
import sys
import os
import threading
import time
import uvicorn

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def start_backend():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")

def main():
    # Start FastAPI server in background thread
    server_thread = threading.Thread(target=start_backend, daemon=True)
    server_thread.start()

    time.sleep(1.5)

    # Try launching native WebView window
    try:
        import webview
        window = webview.create_window(
            title="Aura Local AI – Offline Intelligence",
            url="http://127.0.0.1:8000",
            width=1280,
            height=850,
            resizable=True,
            background_color="#131314"
        )
        webview.start()
    except ImportError:
        # Fallback to default browser if pywebview is not yet installed
        import webbrowser
        print("pywebview not installed. Opening in default browser...")
        webbrowser.open("http://127.0.0.1:8000")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Shutting down Aura...")

if __name__ == "__main__":
    main()
