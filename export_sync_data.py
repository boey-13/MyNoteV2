#!/usr/bin/env python3
"""
Export sync data to JSON file for real-time monitoring
"""
import sqlite3
import json
import os
from datetime import datetime

def export_sync_data():
    # Database path
    db_path = "server/mynote_sync.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all users
    cursor.execute("SELECT * FROM users ORDER BY id")
    users = [dict(row) for row in cursor.fetchall()]
    
    # Get all notes with user info
    cursor.execute("""
        SELECT n.*, u.username 
        FROM notes n 
        LEFT JOIN users u ON n.user_id = u.id 
        ORDER BY n.updated_at DESC
    """)
    notes = [dict(row) for row in cursor.fetchall()]
    
    # Get sync queue
    cursor.execute("""
        SELECT sq.*, u.username 
        FROM sync_queue sq 
        LEFT JOIN users u ON sq.user_id = u.id 
        ORDER BY sq.created_at DESC
    """)
    sync_queue = [dict(row) for row in cursor.fetchall()]
    
    # Get database stats
    cursor.execute("SELECT COUNT(*) as total_notes FROM notes")
    total_notes = cursor.fetchone()['total_notes']
    
    cursor.execute("SELECT COUNT(*) as total_users FROM users")
    total_users = cursor.fetchone()['total_users']
    
    cursor.execute("SELECT COUNT(*) as pending_sync FROM sync_queue")
    pending_sync = cursor.fetchone()['pending_sync']
    
    cursor.execute("SELECT COUNT(*) as dirty_notes FROM notes WHERE dirty = 1")
    dirty_notes = cursor.fetchone()['dirty_notes']
    
    # Create export data
    export_data = {
        "export_time": datetime.now().isoformat(),
        "database_stats": {
            "total_notes": total_notes,
            "total_users": total_users,
            "pending_sync": pending_sync,
            "dirty_notes": dirty_notes
        },
        "users": users,
        "notes": notes,
        "sync_queue": sync_queue
    }
    
    # Write to JSON file
    output_file = "sync_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Sync data exported to {output_file}")
    print(f"📊 Stats: {total_notes} notes, {total_users} users, {pending_sync} pending sync, {dirty_notes} dirty")
    
    conn.close()
    return output_file

if __name__ == "__main__":
    export_sync_data()
