# Aura Local AI – The 100% Offline Gemini Experience

An intelligent, beautiful, Gemini-inspired personal AI assistant that runs **100% locally on your Windows laptop**, completely offline with **zero internet connection**, zero API keys, and zero cloud tracking.

---

## 💻 Hardware Inspection & Model Optimization

Based on the inspection of your Windows laptop:
- **CPU**: AMD Ryzen (Zen 3+/4 Architecture), **12 Logical Processors**
- **System RAM**: **15.19 GB (~16 GB DDR)**
- **GPU**: **NVIDIA GeForce RTX 3050 Laptop GPU with 6GB Dedicated VRAM (6144 MB)**, Driver 617.42, CUDA 13.4
- **Storage**: ~325 GB Free SSD Space
- **OS**: Windows 11 64-bit

### 🎯 Recommended Offline AI Models for Your Hardware

| Model | Size | VRAM Usage | Speed (Tokens/s) | Offload | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`llama3.2:3b`** *(Recommended)* | 2.0 GB | ~2.4 GB | **55 - 75 tok/s** | **100% GPU** | **Lightning fast everyday assistant, general Q&A, instant chat** |
| **`qwen2.5:3b`** | 1.9 GB | ~2.3 GB | **50 - 70 tok/s** | **100% GPU** | **Superior code generation (Python, C++, Java, JS) & Math** |
| **`llama3.1:8b`** | 4.7 GB | ~5.1 GB | **25 - 35 tok/s** | **GPU + RAM** | **Maximum intelligence, complex logic, multi-step debugging** |
| **`qwen2.5:1.5b`** | 1.0 GB | ~1.3 GB | **80+ tok/s** | **100% GPU** | **Battery saver mode & minimal power draw** |

---

## 🌟 Key Features

1. **100% Offline Operation**:
   - Zero cloud API calls, zero telemetry, no login or credit card required.
   - Starts and operates cleanly without Wi-Fi or with Airplane Mode enabled.
2. **NVIDIA RTX 3050 GPU Acceleration**:
   - Automatically offloads transformer layers into the 6GB VRAM for up to 60+ tokens/second.
   - Built-in CPU fallback utilizing all 12 processor threads if memory is constrained.
3. **Local Document Knowledge Base (RAG)**:
   - Upload and index PDF files (`pypdf`), text notes (`.txt`, `.md`), and source code (`.py`, `.js`, `.cpp`, `.java`, `.html`, `.csv`).
   - Grounded responses with source citations using local semantic chunking and hybrid TF-IDF + cosine similarity search.
4. **Offline Speech-to-Text & Text-to-Speech**:
   - Offline voice dictation via native browser speech recognition.
   - Text-to-Speech audio playback using pre-installed Windows voices (David, Zira, Mark) with customizable speech speed.
5. **Gemini-Inspired User Interface**:
   - Floating pill-shaped input capsule with auto-expanding textarea.
   - Collapsible sidebar with multi-chat sessions categorized by recency.
   - Instant search across conversation history.
   - Pin, rename, and delete conversations.
   - Markdown rendering with syntax-highlighted code blocks, line numbers, and 1-click code copying.
   - Regenerate response and stop generation controls.
   - Hardware telemetry badge showing active model, VRAM utilization, and temperature.
   - Dark mode (charcoal theme) and Light mode.
6. **Robust SQLite Persistence**:
   - All chats, settings, user preferences, and document embeddings persist locally in `backend/data/aura_ai.db`.

---

## 📁 Project Structure

```
aura-local-ai/
│
├── start.bat                     <-- One-click Windows startup script
├── setup.bat                     <-- One-time initial setup and model downloader
├── README.md                     <-- Documentation and offline user guide
│
├── backend/                      <-- Python FastAPI Offline Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               <-- FastAPI app, routes & static file server
│   │   ├── database.py           <-- SQLite schema, conversations, messages, settings
│   │   ├── inference.py          <-- Ollama streaming client & hardware offload
│   │   ├── rag.py                <-- PDF/text extraction, chunking, similarity search
│   │   ├── system_specs.py       <-- Hardware detection (RTX 3050 VRAM, RAM, CPU)
│   │   └── audio.py              <-- Speech-to-text & TTS endpoints
│   ├── data/
│   │   └── aura_ai.db            <-- Local SQLite database
│   ├── uploads/                  <-- Uploaded documents & parsed chunks
│   ├── desktop_app.py            <-- Native Windows WebView desktop runner
│   ├── test_suite.py             <-- Comprehensive backend & RAG test suite
│   └── requirements.txt          <-- Python dependencies
│
├── frontend/                     <-- React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       <-- Gemini-inspired collapsible sidebar & search
│   │   │   ├── ChatArea.jsx      <-- Messages view, suggestions, typewriter streaming
│   │   │   ├── MessageInput.jsx  <-- Floating capsule input, file chips, mic
│   │   │   ├── MarkdownRenderer.jsx <-- Code syntax highlighter with copy button
│   │   │   ├── ModelManagerModal.jsx <-- Hardware meters, model switch & puller
│   │   │   ├── KnowledgeBaseModal.jsx <-- Document library & RAG manager
│   │   │   └── SettingsModal.jsx <-- Hyperparameters (temperature, top_p, prompt)
│   │   ├── services/
│   │   │   └── api.js            <-- SSE streaming client, API communication
│   │   ├── App.jsx               <-- Main UI application container
│   │   ├── main.jsx              <-- React entrypoint
│   │   └── index.css             <-- Tailwind styles, custom scrollbars, animations
│   ├── dist/                     <-- Pre-compiled production build served by FastAPI
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── scripts/
    └── package_desktop.bat       <-- Packages app into a standalone Windows .exe
```

---

## 🚀 Quickstart Guide

### 1. One-Click Setup (First Time Only)
Double-click `setup.bat` (or open Command Prompt):
```cmd
cd C:\Users\swaro\.gemini\antigravity\scratch\aura-local-ai
setup.bat
```
This will:
- Install Python requirements (`fastapi`, `uvicorn`, `pypdf`, `httpx`, `python-multipart`).
- Build the React production bundle.
- Pull the recommended **`llama3.2:3b`** model into your local Ollama cache (~2.0 GB).

### 2. Daily Offline Launch
Double-click `start.bat`:
- Auto-starts Ollama in the background.
- Launches the unified server on `http://localhost:8000`.
- Automatically opens your default web browser to the chat interface.
- **Works 100% offline without any internet connection!**

---

## 📦 Packaging as a Windows Desktop App (.EXE)

To compile Aura Local AI into a standalone `.exe` desktop application without browser tabs:
1. Double-click `scripts\package_desktop.bat` (or run in cmd):
   ```cmd
   cd C:\Users\swaro\.gemini\antigravity\scratch\aura-local-ai\scripts
   package_desktop.bat
   ```
2. The script bundles the FastAPI backend, the React frontend, and Windows Edge Chromium WebView2 into:
   ```
   backend\dist\AuraLocalAI\AuraLocalAI.exe
   ```
3. You can create a desktop shortcut to `AuraLocalAI.exe` and launch it like any native Windows app!

---

## ⌨️ Keyboard Shortcuts

- `Enter`: Send message
- `Shift + Enter`: Insert new line in prompt box
- `Ctrl + N`: Start a new chat session
- `Escape`: Stop streaming generation or dismiss open modals

---

## 🛡️ Privacy & Security Guarantee
All processing is local to your machine. No telemetry, prompt data, uploaded files, or responses leave your laptop.
