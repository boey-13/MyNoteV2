# 🚀 Quick Start Guide for MyNote

This guide will get you up and running with MyNote in under 10 minutes!

## ⚡ Super Quick Start (3 steps)

### 1. Clone and Install
```bash
git clone <your-repository-url>
cd MyNoteV2
npm install
```

### 2. Setup Backend
```bash
# Windows
.venv\Scripts\activate
pip install flask flask-socketio

# macOS/Linux
source .venv/bin/activate
pip install flask flask-socketio
```

### 3. Run Everything
```bash
# Terminal 1: Start backend
start_server.bat  # Windows
# OR
cd server && python app.py  # macOS/Linux

# Terminal 2: Start React Native
npm start

# Terminal 3: Run on device
npm run android  # Android
npm run ios      # iOS
```

## 🔑 API Key Setup (Optional - for weather features)

1. Get free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Open `src/config/apiKeys.ts`
3. Replace `YOUR_API_KEY_HERE` with your actual key

## ✅ That's it!

Your app should now be running! The weather features will work once you add the API key.

## 🆘 Need Help?

- **App won't start?** → Check [Troubleshooting](#troubleshooting) in main README
- **Weather not working?** → Add your OpenWeatherMap API key
- **Database errors?** → Run `python migrate_database.py`
- **WebSocket disconnected?** → Check server is running, try manual command: `adb reverse tcp:5000 tcp:5000`

## 📱 What You'll See

1. **Login/Register Screen** - Create your account
2. **Home Screen** - View all your notes
3. **Edit Note Screen** - Create/edit notes with weather integration
4. **Search Screen** - Find notes quickly
5. **Profile Screen** - Manage your account

Enjoy your new note-taking app! 📝✨
