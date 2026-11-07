@echo off
title Aura Local AI - Offline Gemini Experience
chcp 65001 >nul
color 0B

echo ==============================================================================
echo        AURA LOCAL AI - 100%% OFFLINE INTELLIGENCE ASSISTANT
echo ==============================================================================
echo.
echo  Hardware Acceleration: NVIDIA GeForce RTX 3050 Laptop GPU (6GB VRAM)
echo  Active Engine: Local Ollama + FastAPI + SQLite Vector RAG
echo  Status: No Internet Connection Required
echo.
echo ==============================================================================

:: Find Python executable
set "PYTHON_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_EXE=python"
    ) else (
        where py >nul 2>&1
        if %errorlevel% equ 0 (
            set "PYTHON_EXE=py"
        )
    )
)

if "%PYTHON_EXE%"=="" (
    color 0C
    echo [ERROR] Python was not found on your system!
    echo Please install Python 3.10+ from python.org and add it to your PATH.
    pause
    exit /b 1
)

:: Ensure Ollama is running
echo [1/3] Checking Ollama Local Inference Daemon...
curl.exe -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Starting local Ollama service in background...
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        start "" /B "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve >nul 2>&1
    ) else (
        start "" /B ollama serve >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
) else (
    echo [*] Ollama is active and ready.
)

:: Navigate to project directory
cd /d "%~dp0backend"

:: Launch browser in 2 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8000'"

:: Launch FastAPI Web Server
echo.
echo [2/3] Starting Aura Local AI Unified Server on http://localhost:8000 ...
echo [3/3] Opening your browser...
echo.
echo ==============================================================================
echo  Aura Local AI is running! Press Ctrl+C in this terminal to shut down.
echo ==============================================================================
echo.

"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

pause
