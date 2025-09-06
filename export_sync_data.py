#!/usr/bin/env python3
"""
Export sync data for demonstration purposes
Usage: python export_sync_data.py
"""

import sqlite3
import json
import os
from datetime import datetime

def export_sync_data():
    """Export all sync-related data to JSON for demonstration"""
    
    # Database paths
    backend_db = "server/mynote_sync.db"
    frontend_db = "mynote_sync.db"
    
    if not os.path.exists(backend_db):
        print(f"❌ Backend database not found: {backend_db}")
        return
    
    if not os.path.exists(frontend_db):
        print(f"❌ Frontend database not found: {frontend_db}")
        return
    
    # Connect to databases
    backend_conn = sqlite3.connect(backend_db)
    backend_conn.row_factory = sqlite3.Row
    backend_cursor = backend_conn.cursor()
    
    frontend_conn = sqlite3.connect(frontend_db)
    frontend_conn.row_factory = sqlite3.Row
    frontend_cursor = frontend_conn.cursor()
    
    try:
        # Export backend data
        backend_cursor.execute("SELECT * FROM users")
        backend_users = [dict(row) for row in backend_cursor.fetchall()]
        
        backend_cursor.execute("SELECT * FROM notes ORDER BY updated_at DESC")
        backend_notes = [dict(row) for row in backend_cursor.fetchall()]
        
        # Export frontend data
        frontend_cursor.execute("SELECT * FROM users")
        frontend_users = [dict(row) for row in frontend_cursor.fetchall()]
        
        frontend_cursor.execute("SELECT * FROM notes ORDER BY updated_at DESC")
        frontend_notes = [dict(row) for row in frontend_cursor.fetchall()]
        
        frontend_cursor.execute("SELECT * FROM sync_queue")
        sync_queue = [dict(row) for row in frontend_cursor.fetchall()]
        
        # Create export data
        export_data = {
            "export_time": datetime.now().isoformat(),
            "backend": {
                "users": backend_users,
                "notes": backend_notes
            },
            "frontend": {
                "users": frontend_users,
                "notes": frontend_notes,
                "sync_queue": sync_queue
            },
            "summary": {
                "backend_users_count": len(backend_users),
                "backend_notes_count": len(backend_notes),
                "frontend_users_count": len(frontend_users),
                "frontend_notes_count": len(frontend_notes),
                "pending_sync_count": len(sync_queue)
            }
        }
        
        # Save to JSON
        with open("sync_data.json", "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print("✅ Sync data exported successfully!")
        print(f"📊 Backend: {len(backend_users)} users, {len(backend_notes)} notes")
        print(f"📱 Frontend: {len(frontend_users)} users, {len(frontend_notes)} notes")
        print(f"🔄 Pending sync: {len(sync_queue)} items")
        print(f"💾 Saved to: sync_data.json")
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
    finally:
        backend_conn.close()
        frontend_conn.close()

if __name__ == "__main__":
    export_sync_data()
