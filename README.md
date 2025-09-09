# 🌤️ MyNote - Advanced Note-Taking App

A modern, feature-rich note-taking application built with React Native, featuring real-time synchronization, weather integration, and enterprise-grade security.

## ✨ Features

- 📝 **Rich Text Editing** - Create and edit notes with rich formatting
- 🌤️ **Weather Integration** - Add real-time weather data to your notes
- 🔄 **Real-time Sync** - Synchronize notes across multiple devices
- 🔐 **Secure Authentication** - Password encryption and secure user management
- 📁 **Folder Organization** - Organize notes into custom folders
- ⭐ **Favorites System** - Mark important notes as favorites
- 🗑️ **Recycle Bin** - Soft delete with restore functionality
- 🔍 **Advanced Search** - Search through notes with filters
- 📱 **Cross-platform** - Works on Android and iOS
- 🎨 **Modern UI** - Beautiful, intuitive user interface

## 🏗️ Architecture

### Three API Servers (UECS3253 Compliant)
1. **🌐 Web-based API**: OpenWeatherMap (Weather data)
2. **🔌 WebSocket API**: Local WebSocket server (Real-time sync)
3. **🌐 Web-based API**: Local REST API (User management & data)

### Tech Stack
- **Frontend**: React Native, TypeScript
- **Backend**: Python Flask, Flask-SocketIO
- **Database**: SQLite + AsyncStorage + File System
- **Authentication**: SHA256 password hashing with salt
- **APIs**: OpenWeatherMap, Custom REST/WebSocket
- **Navigation**: Stack + Drawer + Tab Navigation
- **Components**: 3+ Third-party components with external stylesheets

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Git

### 1. Prerequisites Check
```bash
# Check Node.js version (requires 16+)
node --version

# Check Python version (requires 3.8+)
python --version

# Check Android SDK and ADB
adb --version
```

### 2. Clone the Repository
```bash
git clone <your-repository-url>
cd MyNoteV2
```

### 3. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Verify Setup (Optional but Recommended)
```bash
# Check if everything is configured correctly
python check_setup.py
```

**Expected output:**
- ✅ Node.js version check
- ✅ Python version check  
- ✅ Database files found
- ✅ All dependencies installed

### 5. Configure API Keys

#### OpenWeatherMap API (Required for weather features)
1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key
4. Copy the example file and add your key:
```bash
cp src/config/apiKeys.example.ts src/config/apiKeys.ts
# Then edit src/config/apiKeys.ts with your actual API key
```

### 6. Database Setup

#### Run Database Migration (if needed)
```bash
python migrate_database.py
```

### 7. Start the Application

#### Option A: Use Batch Scripts (Windows)
```bash
# Start backend server
start_server.bat

# In a new terminal, start React Native
npm start
```

#### Option B: Manual Start

**Terminal 1 - Backend Server:**
```bash
cd server
python app.py
```

**Terminal 2 - React Native Metro:**
```bash
npm start
```

**Terminal 3 - Run on Device/Emulator:**
```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## 📱 Running on Device

### Android
1. Enable Developer Options and USB Debugging on your device
2. Connect device via USB
3. **Set up port forwarding** (required for backend connection):
   ```bash
   adb reverse tcp:5000 tcp:5000
   ```
4. Run `npm run android`

### iOS
1. Open `ios/MyNoteV2.xcworkspace` in Xcode
2. Select your device/simulator
3. Click Run

## 🔄 Real-time Sync Monitoring

### Sync Status JSON
The application automatically generates a real-time sync status file at `server/sync_status.json` that tracks:
- User registrations
- Note creations, updates, and deletions
- Database statistics
- Recent operations history
- WebSocket connections

### View Sync Status
```bash
# Via API endpoint
curl http://localhost:5000/api/sync-status

# Or view the JSON file directly
cat server/sync_status.json
```

### Test Sync Functionality
```bash
# Run the sync demo script
cd server
python test_sync_demo.py
```

This will:
1. Register a test user
2. Create and update notes
3. Show real-time sync statistics
4. Display the sync status JSON file location

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Backend Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# Database
DATABASE_URL=sqlite:///mynote_sync.db

# API Keys
OPENWEATHER_API_KEY=your_openweather_api_key
```

### Network Configuration
- **Backend Server**: `http://localhost:5000`
- **WebSocket**: `ws://localhost:5000`
- **Android Emulator**: `http://10.0.2.2:5000`

## 🗂️ Project Structure

```
MyNoteV2/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # App screens
│   ├── navigation/         # Navigation configuration
│   ├── db/                # Database operations
│   ├── utils/             # Utility functions
│   ├── theme/             # Theme and styling
│   └── config/            # Configuration files
├── server/                # Backend server
│   ├── app.py            # Flask application
│   └── mynote_sync.db    # SQLite database
├── android/              # Android-specific code
├── ios/                  # iOS-specific code
└── assets/              # Images, fonts, etc.
```

## 🔐 Security Features

- **Password Hashing**: SHA256 with random salt
- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: Parameterized queries
- **Secure Storage**: Encrypted local storage

## 🌤️ Weather Integration

The app integrates with OpenWeatherMap API to provide:
- Current weather conditions
- Global city support
- Weather data insertion into notes
- Real-time weather updates

## 🔄 Real-time Features

- **Live Sync**: Notes sync across devices in real-time
- **WebSocket Connection**: Persistent connection for instant updates
- **Conflict Resolution**: Automatic handling of concurrent edits

## 🐛 Troubleshooting

### Common Issues

#### 1. Metro bundler issues
```bash
# Clear Metro cache
npx react-native start --reset-cache
```

#### 2. Android build issues
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

#### 3. iOS build issues
```bash
# Clean and reinstall pods
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..
npm run ios
```

#### 4. Backend connection issues
- Ensure backend server is running on port 5000
- Check firewall settings
- Verify API keys are correctly configured

#### 5. Weather API not working
- Verify OpenWeatherMap API key is valid
- Check internet connection
- Ensure API key has sufficient quota

#### 6. WebSocket Connection Issues
If you see "WebSocket disconnected" or connection issues:

**Check Server Status:**
```bash
# Make sure Flask server is running
python check_setup.py
```

**Common Solutions:**
1. **Port 5000 already in use:**
   ```bash
   # Find process using port 5000
   netstat -ano | findstr :5000
   # Kill the process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

2. **Firewall blocking connection:**
   - Add Python/Flask to Windows Firewall exceptions
   - Or temporarily disable firewall for testing

3. **Android port forwarding not working:**
   ```bash
   # Check if device is connected
   adb devices
   # Reset port forwarding
   adb reverse --remove tcp:5000
   adb reverse tcp:5000 tcp:5000
   ```
   
   **Manual Solution:** If the above doesn't work, manually run:
   ```bash
   adb reverse tcp:5000 tcp:5000
   ```

4. **WebSocket not connecting on web:**
   - Check browser console for errors
   - Ensure server is running with WebSocket support
   - Try refreshing the page

5. **Connection timeout:**
   - Check internet connection
   - Verify server is accessible at http://localhost:5000
   - Restart the server

**Debug WebSocket Connection:**
```bash
# Test WebSocket connection manually
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:5000/socket.io/
```

### Debug Mode
Enable debug logging by setting:
```typescript
// In src/utils/api.ts
const DEBUG = true;
```

## 📊 API Documentation

### Local REST API Endpoints
- `POST /api/users/register` - User registration
- `GET /api/notes` - Get user notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### WebSocket Events
- `connect` - Establish connection
- `sync_note` - Sync note changes
- `note_updated` - Note update notification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Notes

### Adding New Features
1. Create components in `src/components/`
2. Add screens in `src/screens/`
3. Update navigation in `src/navigation/`
4. Add database operations in `src/db/`

### Database Migrations
When modifying database schema:
1. Update `server/app.py` schema
2. Create migration script
3. Test migration on development database
4. Document changes in README

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React Native](https://reactnative.dev/) - Mobile framework
- [OpenWeatherMap](https://openweathermap.org/) - Weather data API
- [Flask](https://flask.palletsprojects.com/) - Python web framework
- [SQLite](https://www.sqlite.org/) - Database engine


---

**Happy Note-Taking! 📝✨**