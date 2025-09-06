@echo off
echo ========================================
echo    MyNoteV2 Backend Server Startup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)
echo ✓ Python found

echo.
echo [2/4] Setting up virtual environment...
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)
echo ✓ Virtual environment ready

echo.
echo [3/4] Installing dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo WARNING: Some dependencies may not have installed correctly
    echo Continuing anyway...
)
echo ✓ Dependencies installed

echo.
echo [4/4] Starting Flask server...
cd server
echo.
echo ========================================
echo    Server starting on http://localhost:5000
echo    Press Ctrl+C to stop the server
echo ========================================
echo.
python app.py

echo.
echo Server stopped.
pause
