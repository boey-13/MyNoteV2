#!/usr/bin/env python3
"""
View sync data in a human-readable format
Usage: python view_sync.py
"""

import json
import os
from datetime import datetime

def view_sync_data():
    """Display sync data in a readable format"""
    
    if not os.path.exists("sync_data.json"):
        print("❌ sync_data.json not found. Run export_sync_data.py first.")
        return
    
    with open("sync_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print("=" * 60)
    print("📊 SYNC DATA DEMONSTRATION")
    print("=" * 60)
    print(f"🕐 Export Time: {data['export_time']}")
    print()
    
    # Summary
    summary = data['summary']
    print("📈 SUMMARY:")
    print(f"  Backend: {summary['backend_users_count']} users, {summary['backend_notes_count']} notes")
    print(f"  Frontend: {summary['frontend_users_count']} users, {summary['frontend_notes_count']} notes")
    print(f"  Pending Sync: {summary['pending_sync_count']} items")
    print()
    
    # Backend Users
    print("👥 BACKEND USERS:")
    for user in data['backend']['users']:
        print(f"  ID: {user['id']}, Username: {user['username']}, Email: {user['email']}")
    print()
    
    # Backend Notes
    print("📝 BACKEND NOTES (Latest 5):")
    for note in data['backend']['notes'][:5]:
        print(f"  ID: {note['id']}, Title: {note['title'][:30]}...")
        print(f"      User: {note['user_id']}, Updated: {note['updated_at']}")
        print(f"      Dirty: {note.get('dirty', 0)}, Deleted: {note.get('is_deleted', 0)}")
        print()
    
    # Frontend Users
    print("👤 FRONTEND USERS:")
    for user in data['frontend']['users']:
        print(f"  ID: {user['id']}, Username: {user['username']}, Email: {user['email']}")
    print()
    
    # Frontend Notes
    print("📱 FRONTEND NOTES (Latest 5):")
    for note in data['frontend']['notes'][:5]:
        print(f"  ID: {note['id']}, Title: {note['title'][:30]}...")
        print(f"      User: {note['user_id']}, Updated: {note['updated_at']}")
        print(f"      Dirty: {note.get('dirty', 0)}, Deleted: {note.get('is_deleted', 0)}")
        print()
    
    # Sync Queue
    if data['frontend']['sync_queue']:
        print("🔄 PENDING SYNC QUEUE:")
        for item in data['frontend']['sync_queue']:
            print(f"  ID: {item['id']}, User: {item['user_id']}, Action: {item['action']}")
            print(f"      Note ID: {item['note_id']}, Created: {item['created_at']}")
            print()
    else:
        print("✅ No pending sync items")
    
    print("=" * 60)
    print("💡 This demonstrates the sync system working between frontend and backend!")
    print("=" * 60)

if __name__ == "__main__":
    view_sync_data()
