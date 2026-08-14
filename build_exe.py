import os
import sys
import subprocess

def build_standalone_exe():
    """Builds Vedika Desktop Mascot into a single standalone Windows .exe binary using PyInstaller."""
    print("=== Building Vedika Desktop Mascot Standalone Executable (.exe) ===")

    # Install PyInstaller if missing
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name=VedikaDesktopMascot",
        "--onefile",
        "--windowed",
        "--add-data=assets;assets",
        "--add-data=user_profile.json;.",
        "--add-data=settings.json;.",
        "--hidden-import=PySide6.QtCore",
        "--hidden-import=PySide6.QtWidgets",
        "--hidden-import=PySide6.QtGui",
        "--hidden-import=PySide6.QtWebSockets",
        "--hidden-import=PySide6.QtMultimedia",
        "--hidden-import=google.genai",
        "--hidden-import=engine.user_profile",
        "--hidden-import=engine.memory",
        "--hidden-import=engine.presentation_manager",
        "main.py"
    ]

    print(f"Running PyInstaller command:\n{' '.join(cmd)}")
    subprocess.check_call(cmd)

    exe_path = os.path.join("dist", "VedikaDesktopMascot.exe")
    if os.path.exists(exe_path):
        print(f"\n✅ BUILD SUCCESSFUL! Standalone Executable created at:\n{os.path.abspath(exe_path)}\n")
    else:
        print("\n❌ Build completed but executable was not found in dist/")

if __name__ == "__main__":
    build_standalone_exe()
