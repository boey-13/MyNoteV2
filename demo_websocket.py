#!/usr/bin/env python3
"""
WebSocket demonstration script for teacher presentation
Usage: python demo_websocket.py
"""

import requests
import time
import json

def demo_websocket():
    """Demonstrate WebSocket functionality"""
    
    base_url = "http://localhost:5000"
    
    print("🎯 WEBSOCKET DEMONSTRATION")
    print("=" * 50)
    print("This script demonstrates real-time sync functionality")
    print("Make sure your React Native app is running and connected!")
    print()
    
    # Test 1: Create a note
    print("1️⃣ Creating a note...")
    create_data = {
        "title": "[DEMO] WebSocket Test Note",
        "content": "This note was created via API to test WebSocket push",
        "folder_id": 1,
        "is_favorite": 0
    }
    
    try:
        response = requests.post(f"{base_url}/api/notes/upsert", 
                               json=create_data,
                               headers={"X-User": "1"})
        if response.status_code == 200:
            note_data = response.json()
            note_id = note_data['id']
            print(f"✅ Note created successfully! ID: {note_id}")
        else:
            print(f"❌ Failed to create note: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error creating note: {e}")
        return
    
    print()
    time.sleep(2)
    
    # Test 2: Update the note
    print("2️⃣ Updating the note...")
    update_data = {
        "title": "[DEMO] WebSocket Test Note - UPDATED",
        "content": "This note was updated via API to test WebSocket push",
        "version": 2
    }
    
    try:
        response = requests.post(f"{base_url}/api/notes/upsert", 
                               json={**update_data, "id": note_id},
                               headers={"X-User": "1"})
        if response.status_code == 200:
            print("✅ Note updated successfully!")
        else:
            print(f"❌ Failed to update note: {response.status_code}")
    except Exception as e:
        print(f"❌ Error updating note: {e}")
    
    print()
    time.sleep(2)
    
    # Test 3: Delete the note
    print("3️⃣ Deleting the note...")
    try:
        response = requests.delete(f"{base_url}/api/notes/{note_id}",
                                 headers={"X-User": "1"})
        if response.status_code == 200:
            print("✅ Note deleted successfully!")
        else:
            print(f"❌ Failed to delete note: {response.status_code}")
    except Exception as e:
        print(f"❌ Error deleting note: {e}")
    
    print()
    print("🎯 DEMONSTRATION COMPLETE!")
    print("=" * 50)
    print("Expected behavior in your React Native app:")
    print("  - WebSocket should receive 'note_updated' events")
    print("  - App should automatically sync and refresh")
    print("  - Settings page should show 'Realtime: Connected'")
    print("  - Note list should update automatically")
    print()
    print("💡 Check your Metro console for WebSocket logs!")

if __name__ == "__main__":
    demo_websocket()
