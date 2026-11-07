@echo off
title Aura Local AI - Windows Desktop Packager (.EXE)
chcp 65001 >nul
color 0B

echo ==============================================================================
echo       AURA LOCAL AI - WINDOWS DESKTOP APPLICATION COMPILER (.EXE)
echo ==============================================================================
echo.
echo  This tool packages Aura into a native Windows .exe using PyInstaller and
echo  Windows WebView2, producing a standalone desktop app window without browser tabs.
echo.
echo ==============================================================================

set "PYTHON_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo [1/3] Installing pyinstaller and pywebview...
"%PYTHON_EXE%" -m pip install pyinstaller pywebview

echo.
echo [2/3] Building frontend production assets...
cd /d "%~dp0..\frontend"
call npm run build

echo.
echo [3/3] Compiling standalone executable with PyInstaller...
cd /d "%~dp0..\backend"

"%PYTHON_EXE%" -m PyInstaller ^
    --name="AuraLocalAI" ^
    --onedir ^
    --windowed ^
    --add-data="app;app" ^
    --add-data="data;data" ^
    --add-data="..\frontend\dist;..\frontend\dist" ^
    --hidden-import="uvicorn.logging" ^
    --hidden-import="uvicorn.loops" ^
    --hidden-import="uvicorn.loops.auto" ^
    --hidden-import="uvicorn.protocols" ^
    --hidden-import="uvicorn.protocols.http" ^
    --hidden-import="uvicorn.protocols.http.auto" ^
    --hidden-import="uvicorn.lifespan" ^
    --hidden-import="uvicorn.lifespan.on" ^
    desktop_app.py

echo.
echo ==============================================================================
echo  BUILD COMPLETE!
echo  Your executable is ready in:
echo     backend\dist\AuraLocalAI\AuraLocalAI.exe
echo ==============================================================================
pause
