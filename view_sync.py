#!/usr/bin/env python3
"""
Quick view of sync data
"""
import json
import os
from datetime import datetime

def view_sync_data():
    """View current sync data"""
    if not os.path.exists('sync_data.json'):
        print("❌ No sync data found. Run 'python export_sync_data.py' first.")
        return
    
    with open('sync_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("🔄 Sync Data Overview")
    print("=" * 40)
    print(f"📅 Export Time: {data['export_time']}")
    print()
    
    stats = data['database_stats']
    print("📊 Statistics:")
    print(f"  • Total Notes: {stats['total_notes']}")
    print(f"  • Total Users: {stats['total_users']}")
    print(f"  • Pending Sync: {stats['pending_sync']}")
    print(f"  • Dirty Notes: {stats['dirty_notes']}")
    print()
    
    # Show users
    print("👥 Users:")
    for user in data['users']:
        print(f"  • ID {user['id']}: {user['username']} ({user['email'] or 'No email'})")
    print()
    
    # Show recent notes
    print("📝 Recent Notes:")
    for note in data['notes'][:10]:
        dirty_status = "🔴 DIRTY" if note['dirty'] else "✅ SYNCED"
        print(f"  • [{note['id']}] {note['title'][:40]}... (User: {note['username']}) {dirty_status}")
    print()
    
    # Show sync queue
    if data['sync_queue']:
        print("⏳ Sync Queue:")
        for item in data['sync_queue']:
            print(f"  • {item['action']} - Note {item['note_local_id']} (Remote: {item['remote_id']})")
    else:
        print("✅ Sync Queue: Empty")

if __name__ == "__main__":
    view_sync_data()
