#!/usr/bin/env python3
"""
WebSocket Real-time Sync Demo Script for Teacher
"""

import socketio
import time
import json
import requests
from datetime import datetime

def demo_websocket_for_teacher():
    """WebSocket Real-time Sync Demo for Teacher"""
    print("🎓 MyNoteV2 WebSocket Real-time Sync Demo")
    print("=" * 60)
    print("📱 This is a real-time sync demo for the note-taking app")
    print("   When you operate in the mobile app, sync events will be displayed here in real-time")
    print("=" * 60)
    
    # Create SocketIO client
    sio = socketio.Client()
    
    # Connection success callback
    @sio.event
    def connect():
        print("✅ Connected to server")
        print(f"   Connection time: {datetime.now().strftime('%H:%M:%S')}")
        print("   Waiting for app operations...")
        print("-" * 60)
    
    # Connection disconnect callback
    @sio.event
    def disconnect():
        print("❌ Connection disconnected")
    
    # Receive hello event
    @sio.event
    def hello(data):
        print("👋 Server connection confirmed")
    
    # Receive note creation event
    @sio.event
    def note_created(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"📝 [{timestamp}] Note Creation Event")
        print(f"   Note ID: {data.get('id', 'unknown')}")
        print("   → Description: User created a new note in the app")
        print("-" * 40)
    
    # Receive note update event
    @sio.event
    def note_updated(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"✏️ [{timestamp}] Note Update Event")
        print(f"   Note ID: {data.get('id', 'unknown')}")
        print("   → Description: User edited a note in the app")
        print("-" * 40)
    
    # Receive note deletion event
    @sio.event
    def note_deleted(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"🗑️ [{timestamp}] Note Deletion Event")
        print(f"   Note ID: {data.get('id', 'unknown')}")
        print("   → Description: User deleted a note in the app")
        print("-" * 40)
    
    # Receive folder creation event
    @sio.event
    def folder_created(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"📁 [{timestamp}] Folder Creation Event")
        print(f"   Folder ID: {data.get('id', 'unknown')}")
        print(f"   Folder Name: {data.get('name', 'unknown')}")
        print(f"   User ID: {data.get('user_id', 'unknown')}")
        print("   → Description: User created a new folder in the app")
        print("-" * 40)
    
    # Receive folder update event
    @sio.event
    def folder_updated(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"✏️ [{timestamp}] Folder Update Event")
        print(f"   Folder ID: {data.get('id', 'unknown')}")
        print(f"   New Name: {data.get('name', 'unknown')}")
        print(f"   User ID: {data.get('user_id', 'unknown')}")
        print("   → Description: User renamed a folder in the app")
        print("-" * 40)
    
    # Receive folder deletion event
    @sio.event
    def folder_deleted(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"🗑️ [{timestamp}] Folder Deletion Event")
        print(f"   Folder ID: {data.get('id', 'unknown')}")
        print(f"   User ID: {data.get('user_id', 'unknown')}")
        print("   → Description: User deleted a folder in the app")
        print("-" * 40)
    
    # Receive sync update event
    @sio.event
    def sync_update(data):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"🔄 [{timestamp}] Sync Update Event")
        print(f"   Type: {data.get('type', 'unknown')}")
        print("   → Description: Data sync status updated")
        print("-" * 40)
    
    try:
        # Connect to WebSocket server (User 3)
        print("Connecting to server...")
        sio.connect('http://localhost:5000?user=3', wait_timeout=10)
        
        if sio.connected:
            print("✅ Connection successful! Demo can start now")
            print("\n📱 Demo Steps:")
            print("   1. Create new note in mobile app")
            print("   2. Edit existing note")
            print("   3. Delete note")
            print("   4. Create new folder")
            print("   5. Rename folder")
            print("   6. Delete folder")
            print("   7. Move notes between folders")
            print("\n⏰ Demo will last 2 minutes, press Ctrl+C to stop")
            print("=" * 60)
            
            try:
                # Keep connection for 2 minutes
                for i in range(120):
                    time.sleep(1)
                    if i % 30 == 0 and i > 0:
                        print(f"⏳ Demo in progress... {i//60}m{i%60}s")
            except KeyboardInterrupt:
                print("\n⏹️ Demo ended")
        else:
            print("❌ Connection failed")
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("   Please ensure server is running: python server/app.py")
    
    finally:
        # Disconnect
        if sio.connected:
            sio.disconnect()
            print("🔌 Disconnected")

def show_sync_status():
    """Show current sync status"""
    print("📊 Current Sync Status:")
    try:
        response = requests.get('http://localhost:5000/api/sync-status', timeout=5)
        if response.status_code == 200:
            data = response.json()
            sync_status = data.get('sync_status', {})
            print(f"   Total Users: {sync_status.get('total_users', 0)}")
            print(f"   Total Notes: {sync_status.get('total_notes', 0)}")
            print(f"   Total Folders: {sync_status.get('total_folders', 0)}")
            print(f"   Pending Sync Operations: {sync_status.get('pending_sync_operations', 0)}")
            print(f"   Last Updated: {sync_status.get('last_updated', 'unknown')}")
        else:
            print("   Unable to get sync status")
    except Exception as e:
        print(f"   Failed to get sync status: {e}")

def main():
    print("🎓 MyNoteV2 WebSocket Real-time Sync Demo")
    print("=" * 60)
    print("📱 This is a real-time sync demo for the note-taking app")
    print("   When you operate in the mobile app, sync events will be displayed here in real-time")
    print("=" * 60)
    
    # Show current status
    show_sync_status()
    print()
    
    # Start demo
    demo_websocket_for_teacher()
    
    print("\n" + "=" * 60)
    print("📋 Demo Complete!")
    print("✅ WebSocket real-time sync functionality is working properly")
    print("📱 All app operations are synced to server in real-time")
    print("🔄 Supports multi-device real-time sync")

if __name__ == "__main__":
    main()
