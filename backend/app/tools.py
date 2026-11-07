"""
Aura Local AI - System Automation & Computer Action Engine
Gives the AI the ability to automate tasks, run terminal commands, manage files,
and launch applications across your Windows laptop.
"""
import os
import subprocess
import shutil
import platform
from pathlib import Path
from typing import Dict, Any, List

# Common user directories on Windows
USER_HOME = Path.home()
DESKTOP_DIR = USER_HOME / "Desktop"
DOCUMENTS_DIR = USER_HOME / "Documents"
DOWNLOADS_DIR = USER_HOME / "Downloads"

def execute_shell_command(command: str, timeout: int = 30) -> Dict[str, Any]:
    """Execute a PowerShell / CMD command on the laptop and return stdout/stderr."""
    try:
        CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=CREATE_NO_WINDOW
        )
        return {
            "success": res.returncode == 0,
            "stdout": res.stdout.strip(),
            "stderr": res.stderr.strip(),
            "exit_code": res.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": f"Command timed out after {timeout} seconds", "exit_code": -1}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": str(e), "exit_code": -1}

def list_folder_contents(folder_path: str = None) -> Dict[str, Any]:
    """List files and subfolders in any directory on the laptop."""
    target = Path(folder_path) if folder_path else USER_HOME
    if not target.is_absolute():
        target = USER_HOME / target

    if not target.exists():
        return {"success": False, "error": f"Path '{target}' does not exist"}

    try:
        items = []
        for p in target.iterdir():
            try:
                is_dir = p.is_dir()
                size = p.stat().st_size if not is_dir else 0
                items.append({
                    "name": p.name,
                    "is_directory": is_dir,
                    "size_bytes": size,
                    "size_readable": f"{round(size/1024, 1)} KB" if not is_dir else "Folder"
                })
            except Exception:
                continue
        # Sort folders first, then files
        items.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
        return {"success": True, "path": str(target), "count": len(items), "items": items[:100]}
    except Exception as e:
        return {"success": False, "error": str(e)}

def read_laptop_file(file_path: str, max_lines: int = 300) -> Dict[str, Any]:
    """Read contents of any text, code, or document file on the laptop."""
    target = Path(file_path)
    if not target.is_absolute():
        target = USER_HOME / target

    if not target.exists():
        return {"success": False, "error": f"File '{target}' not found"}

    encodings = ["utf-8", "latin-1", "cp1252"]
    for enc in encodings:
        try:
            with open(target, "r", encoding=enc) as f:
                lines = [f.readline() for _ in range(max_lines)]
                content = "".join(lines)
                return {"success": True, "path": str(target), "content": content}
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": False, "error": "Unable to decode file as text"}

def write_laptop_file(file_path: str, content: str) -> Dict[str, Any]:
    """Create or edit a file anywhere on the laptop."""
    target = Path(file_path)
    if not target.is_absolute():
        target = USER_HOME / target

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": str(target), "bytes_written": len(content)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def launch_desktop_application(app_name: str) -> Dict[str, Any]:
    """Launch an application on Windows (e.g. notepad, calc, code, chrome, explorer)."""
    app_lower = app_name.lower().strip()
    shortcuts = {
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "calc": "calc.exe",
        "explorer": "explorer.exe",
        "files": "explorer.exe",
        "code": "code",
        "vs code": "code",
        "vscode": "code",
        "chrome": "chrome",
        "browser": "start http://localhost:8000"
    }

    target = shortcuts.get(app_lower, app_name)
    try:
        if target.startswith("start "):
            subprocess.Popen(target, shell=True)
        else:
            subprocess.Popen([target], shell=True)
        return {"success": True, "launched": target}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Available action definitions for prompt grounding
SYSTEM_TOOLS_SCHEMA = [
    {
        "name": "execute_shell_command",
        "description": "Run any terminal / PowerShell command to automate tasks, create directories, run scripts, or inspect system state.",
        "params": ["command"]
    },
    {
        "name": "list_folder_contents",
        "description": "Explore and list files in any folder (Desktop, Downloads, Documents, etc.).",
        "params": ["folder_path"]
    },
    {
        "name": "read_laptop_file",
        "description": "Read the contents of a file on the laptop.",
        "params": ["file_path"]
    },
    {
        "name": "write_laptop_file",
        "description": "Create or overwrite a file anywhere on the laptop.",
        "params": ["file_path", "content"]
    },
    {
        "name": "launch_desktop_application",
        "description": "Open any desktop app like VS Code, Notepad, Calculator, Explorer, etc.",
        "params": ["app_name"]
    }
]
