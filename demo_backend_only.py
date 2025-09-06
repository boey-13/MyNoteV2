#!/usr/bin/env python3
"""
Backend-only demonstration script
Usage: python demo_backend_only.py
"""

import sqlite3
import json
from datetime import datetime

def demo_backend():
    """Demonstrate backend data"""
    
    db_path = "server/mynote_sync.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Backend database not found: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        print("🎯 BACKEND DATABASE DEMONSTRATION")
        print("=" * 50)
        
        # Users
        cursor.execute("SELECT * FROM users")
        users = [dict(row) for row in cursor.fetchall()]
        print(f"👥 USERS ({len(users)}):")
        for user in users:
            print(f"  ID: {user['id']}, Username: {user['username']}, Email: {user['email']}")
        print()
        
        # Notes
        cursor.execute("SELECT * FROM notes ORDER BY updated_at DESC LIMIT 10")
        notes = [dict(row) for row in cursor.fetchall()]
        print(f"📝 NOTES (Latest {len(notes)}):")
        for note in notes:
            print(f"  ID: {note['id']}, Title: {note['title'][:40]}...")
            print(f"      User: {note['user_id']}, Updated: {note['updated_at']}")
            print(f"      Dirty: {note.get('dirty', 0)}, Deleted: {note.get('is_deleted', 0)}")
            print()
        
        print("=" * 50)
        print("💡 This shows the backend database with all sync data!")
        print("   - Users are stored with their credentials")
        print("   - Notes have version control and dirty flags")
        print("   - WebSocket events are triggered on changes")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import os
    demo_backend()
