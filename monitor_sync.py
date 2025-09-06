#!/usr/bin/env python3
"""
Real-time sync monitoring script
Run this script to continuously monitor sync status
"""
import time
import os
import subprocess
from datetime import datetime

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def run_export():
    """Run the export script and return the output"""
    try:
        result = subprocess.run(['python', 'export_sync_data.py'], 
                              capture_output=True, text=True, cwd='.')
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def load_sync_data():
    """Load the sync data from JSON file"""
    try:
        import json
        with open('sync_data.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return None

def display_sync_status():
    """Display current sync status"""
    clear_screen()
    print("🔄 Real-time Sync Monitor")
    print("=" * 50)
    print(f"⏰ Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run export
    export_output = run_export()
    print("📊 Export Status:")
    print(export_output)
    print()
    
    # Load and display data
    data = load_sync_data()
    if data:
        stats = data['database_stats']
        print("📈 Database Statistics:")
        print(f"  • Total Notes: {stats['total_notes']}")
        print(f"  • Total Users: {stats['total_users']}")
        print(f"  • Pending Sync: {stats['pending_sync']}")
        print(f"  • Dirty Notes: {stats['dirty_notes']}")
        print()
        
        # Show recent notes
        print("📝 Recent Notes (last 5):")
        for note in data['notes'][:5]:
            dirty_status = "🔴 DIRTY" if note['dirty'] else "✅ SYNCED"
            print(f"  • [{note['id']}] {note['title'][:30]}... (User: {note['username']}) {dirty_status}")
        print()
        
        # Show sync queue
        if data['sync_queue']:
            print("⏳ Sync Queue:")
            for item in data['sync_queue'][:3]:
                print(f"  • {item['action']} - Note {item['note_local_id']} (Remote: {item['remote_id']})")
        else:
            print("✅ Sync Queue: Empty")
        print()
    
    print("Press Ctrl+C to stop monitoring...")

def main():
    """Main monitoring loop"""
    try:
        while True:
            display_sync_status()
            time.sleep(5)  # Update every 5 seconds
    except KeyboardInterrupt:
        print("\n👋 Monitoring stopped.")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
