@echo off
echo Starting MyNoteV2 Server...
cd /d "%~dp0server"
call venv\Scripts\activate.bat
echo Virtual environment activated
echo Starting Flask server with WebSocket support...
python app.py
pause
