@echo off
echo ========================================
echo    MyNoteV2 Android Development
echo ========================================
echo.

echo [1/3] Starting Flask Server...
start "MyNoteV2 Server" cmd /k "cd /d %~dp0server && call ..\.venv\Scripts\activate.bat && python app.py"

echo.
echo [2/3] Setting up Android port forwarding...
timeout /t 3 /nobreak >nul
adb reverse tcp:5000 tcp:5000
if %errorlevel% equ 0 (
    echo ✅ Port forwarding: localhost:5000 -> Android:5000
) else (
    echo ❌ Port forwarding failed!
    echo 💡 Make sure Android device/emulator is connected
    echo    Run: adb devices
    pause
    exit /b 1
)

echo.
echo [3/3] Starting React Native Android app...
echo 📱 Starting Android app...
npx react-native run-android

echo.
echo ✅ Android development environment ready!
echo 🌐 Server: http://localhost:5000 (forwarded to Android)
echo 🔌 WebSocket: ws://localhost:5000 (forwarded to Android)
echo.
pause
