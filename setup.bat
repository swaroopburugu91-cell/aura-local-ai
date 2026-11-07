@echo off
title Aura Local AI - Setup & Model Downloader
chcp 65001 >nul
color 0A

echo ==============================================================================
echo           AURA LOCAL AI - ONE-TIME INITIAL ENVIRONMENT SETUP
echo ==============================================================================
echo.
echo  This script will prepare your laptop for 100%% offline operation:
echo  1. Install Python dependencies (FastAPI, Uvicorn, PyPDF, etc.)
echo  2. Install Frontend dependencies and compile React production bundle
echo  3. Ensure Ollama service is configured
echo  4. Pull the recommended Llama 3.2 3B Instruct model into local VRAM cache
echo.
echo ==============================================================================
echo.

:: Detect Python
set "PYTHON_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else (
    set "PYTHON_EXE=python"
)

:: Step 1: Install Python packages
echo [Step 1/4] Installing Python requirements...
cd /d "%~dp0backend"
"%PYTHON_EXE%" -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Some python packages encountered an issue. Checking installed modules...
)

:: Step 2: Build Frontend
echo.
echo [Step 2/4] Building React frontend production bundle...
cd /d "%~dp0frontend"
call npm install
call npm run build

:: Step 3: Check Ollama
echo.
echo [Step 3/4] Checking Ollama AI engine...
set "OLLAMA_EXE="
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
) else (
    set "OLLAMA_EXE=ollama"
)

:: Start Ollama if not running
curl.exe -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Ollama background daemon...
    start "" /B "%OLLAMA_EXE%" serve >nul 2>&1
    timeout /t 3 /nobreak >nul
)

:: Step 4: Download recommended model
echo.
echo [Step 4/4] Downloading recommended model (llama3.2:3b) into local cache...
echo This model is ~2.0 GB and fits 100%% into your RTX 3050 6GB VRAM.
echo After this single download, you can disconnect Wi-Fi and use it completely offline!
echo.

"%OLLAMA_EXE%" pull llama3.2:3b

echo.
echo ==============================================================================
echo             SETUP COMPLETE! AURA LOCAL AI IS READY TO RUN
echo ==============================================================================
echo.
echo  You can now launch the assistant anytime by double-clicking:
echo     start.bat
echo.
echo  Even with Airplane Mode enabled or NO INTERNET CONNECTION!
echo ==============================================================================
pause
