# PowerShell script to start MyNoteV2 Server
Write-Host "Starting MyNoteV2 Server..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\server"
& ".\venv\Scripts\Activate.ps1"
Write-Host "Virtual environment activated" -ForegroundColor Yellow
Write-Host "Starting Flask server with WebSocket support..." -ForegroundColor Cyan
python app.py
