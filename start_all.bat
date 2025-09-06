@echo off
echo ========================================
echo    MyNoteV2 Development Environment
echo ========================================
echo.

echo [1/5] Starting Flask Server with WebSocket...
start "MyNoteV2 Server" cmd /k "cd /d %~dp0server && call venv\Scripts\activate.bat && python app.py"

echo.
echo [2/5] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/5] Testing server connection...
node test_server.js

echo.
echo [4/5] Setting up Android port forwarding...
adb reverse tcp:5000 tcp:5000
if %errorlevel% equ 0 (
    echo ✅ Port forwarding set up successfully!
) else (
    echo ⚠️  Port forwarding failed. Make sure Android device/emulator is connected.
    echo    You can manually run: adb reverse tcp:5000 tcp:5000
)

echo.
echo [5/5] Testing WebSocket connection...
start "WebSocket Test" cmd /k "node test_websocket_auto.js"

echo.
echo ✅ All services started!
echo.
echo 📱 React Native App: npx react-native run-android
echo 🌐 Server: http://localhost:5000
echo 🔌 WebSocket: ws://localhost:5000
echo 🔄 Android Port Forward: adb reverse tcp:5000 tcp:5000
echo.
echo Press any key to close this window...
pause >nul
