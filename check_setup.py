#!/usr/bin/env python3
"""
MyNoteV2 Setup Checker
This script checks if your development environment is properly configured.
"""

import os
import sys
import subprocess
import json

def check_python():
    """Check Python installation and version."""
    print("🐍 Checking Python...")
    try:
        result = subprocess.run([sys.executable, '--version'], 
                              capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"   ✓ {version}")
        return True
    except Exception as e:
        print(f"   ❌ Python not found: {e}")
        return False

def check_node():
    """Check Node.js installation."""
    print("📦 Checking Node.js...")
    try:
        result = subprocess.run(['node', '--version'], 
                              capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"   ✓ {version}")
        return True
    except Exception as e:
        print(f"   ❌ Node.js not found: {e}")
        return False

def check_npm_packages():
    """Check if npm packages are installed."""
    print("📦 Checking npm packages...")
    if not os.path.exists('package.json'):
        print("   ❌ package.json not found")
        return False
    
    if not os.path.exists('node_modules'):
        print("   ❌ node_modules not found. Run 'npm install'")
        return False
    
    print("   ✓ npm packages installed")
    return True

def check_python_packages():
    """Check if Python packages are installed."""
    print("🐍 Checking Python packages...")
    try:
        import flask
        import flask_socketio
        print("   ✓ Flask packages installed")
        return True
    except ImportError as e:
        print(f"   ❌ Missing Python packages: {e}")
        print("   💡 Run: pip install -r requirements.txt")
        return False

def check_api_keys():
    """Check if API keys are configured."""
    print("🔑 Checking API keys...")
    api_keys_file = 'src/config/apiKeys.ts'
    if not os.path.exists(api_keys_file):
        print("   ❌ API keys file not found")
        print("   💡 Copy src/config/apiKeys.example.ts to src/config/apiKeys.ts")
        return False
    
    with open(api_keys_file, 'r') as f:
        content = f.read()
        if '08179ed34733004bdc1f31078bf7a375' in content:
            print("   ✓ API keys configured")
            return True
        else:
            print("   ⚠️  API keys not configured (weather features will not work)")
            print("   💡 Get API key from https://openweathermap.org/api")
            return False
    
    print("   ✓ API keys configured")
    return True

def check_database():
    """Check if database exists."""
    print("🗄️  Checking database...")
    db_files = ['mynote_sync.db', 'server/mynote_sync.db']
    found_db = False
    
    for db_file in db_files:
        if os.path.exists(db_file):
            print(f"   ✓ Database found: {db_file}")
            found_db = True
            break
    
    if not found_db:
        print("   ⚠️  No database found (will be created on first run)")
    
    return True

def main():
    """Run all checks."""
    print("=" * 50)
    print("   MyNoteV2 Development Environment Check")
    print("=" * 50)
    print()
    
    checks = [
        check_python,
        check_node,
        check_npm_packages,
        check_python_packages,
        check_api_keys,
        check_database,
    ]
    
    passed = 0
    total = len(checks)
    
    for check in checks:
        if check():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"   Results: {passed}/{total} checks passed")
    print("=" * 50)
    
    if passed == total:
        print("🎉 All checks passed! You're ready to develop!")
        print()
        print("Next steps:")
        print("1. Start backend: start_server.bat (Windows) or ./start_server.sh (macOS/Linux)")
        print("2. Start React Native: npm start")
        print("3. Run on device: npm run android/ios")
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print()
        print("Quick fixes:")
        print("- Install dependencies: npm install && pip install -r requirements.txt")
        print("- Configure API keys: Copy src/config/apiKeys.example.ts to src/config/apiKeys.ts")
        print("- Get weather API key: https://openweathermap.org/api")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
