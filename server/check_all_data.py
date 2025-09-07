#!/usr/bin/env python3
import sqlite3
import os

def check_database(db_path, db_name):
    print(f"\n=== Checking {db_name} Database ===")
    if not os.path.exists(db_path):
        print(f"❌ Database file does not exist: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check table structure
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📋 Table list: {[table[0] for table in tables]}")
        
        # Check users table
        if ('users',) in tables:
            print(f"\n👥 === User Data ===")
            cursor.execute("PRAGMA table_info(users)")
            columns = cursor.fetchall()
            print(f"📊 users table structure: {[col[1] for col in columns]}")
            
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            print(f"👥 User count: {user_count}")
            
            if user_count > 0:
                # Check available columns first
                cursor.execute("PRAGMA table_info(users)")
                user_columns = [col[1] for col in cursor.fetchall()]
                
                # Build query based on actual column names
                if 'created_at' in user_columns:
                    cursor.execute("SELECT id, username, email, created_at FROM users ORDER BY id")
                    users = cursor.fetchall()
                    print("👤 User list:")
                    for user in users:
                        print(f"   ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Created: {user[3]}")
                else:
                    cursor.execute("SELECT id, username, email FROM users ORDER BY id")
                    users = cursor.fetchall()
                    print("👤 User list:")
                    for user in users:
                        print(f"   ID: {user[0]}, Username: {user[1]}, Email: {user[2]}")
            else:
                print("ℹ️ No user data")
        else:
            print("❌ users table not found")
        
        # Check notes table
        if ('notes',) in tables:
            print(f"\n📝 === Notes Data ===")
            cursor.execute("PRAGMA table_info(notes)")
            columns = cursor.fetchall()
            print(f"📊 notes table structure: {[col[1] for col in columns]}")
            
            cursor.execute("SELECT COUNT(*) FROM notes")
            note_count = cursor.fetchone()[0]
            print(f"📝 Note count: {note_count}")
            
            if note_count > 0:
                cursor.execute("SELECT id, user_id, title, content, updated_at, is_deleted, is_favorite FROM notes ORDER BY id")
                notes = cursor.fetchall()
                print("📄 Notes list:")
                for note in notes:
                    content_preview = note[3][:50] + "..." if len(note[3]) > 50 else note[3]
                    deleted_status = "Deleted" if note[5] else "Active"
                    favorite_status = "⭐" if note[6] else ""
                    print(f"   ID: {note[0]}, User ID: {note[1]}, Title: {note[2]}")
                    print(f"       Content: {content_preview}")
                    print(f"       Status: {deleted_status} {favorite_status}, Updated: {note[4]}")
                    print()
            else:
                print("ℹ️ No notes data")
        else:
            print("❌ notes table not found")
        
        # Check folders table
        if ('folders',) in tables:
            print(f"\n📁 === Folders Data ===")
            cursor.execute("SELECT COUNT(*) FROM folders")
            folder_count = cursor.fetchone()[0]
            print(f"📁 Folder count: {folder_count}")
            
            if folder_count > 0:
                cursor.execute("SELECT id, name, user_id, created_at FROM folders ORDER BY id")
                folders = cursor.fetchall()
                print("📂 Folders list:")
                for folder in folders:
                    print(f"   ID: {folder[0]}, Name: {folder[1]}, User ID: {folder[2]}, Created: {folder[3]}")
            else:
                print("ℹ️ No folders data")
        
        # Check sync queue table
        if ('sync_queue',) in tables:
            print(f"\n🔄 === Sync Queue Data ===")
            cursor.execute("SELECT COUNT(*) FROM sync_queue")
            sync_count = cursor.fetchone()[0]
            print(f"🔄 Sync queue count: {sync_count}")
            
            if sync_count > 0:
                cursor.execute("SELECT id, user_id, action, note_id, created_at FROM sync_queue ORDER BY id")
                sync_items = cursor.fetchall()
                print("📋 Sync queue list:")
                for item in sync_items:
                    print(f"   ID: {item[0]}, User ID: {item[1]}, Action: {item[2]}, Note ID: {item[3]}, Created: {item[4]}")
            else:
                print("ℹ️ No sync queue data")
        
        conn.close()
        print(f"\n✅ {db_name} database check completed")
        
    except Exception as e:
        print(f"❌ Error checking {db_name} database: {e}")

def main():
    print("🔍 Database Comprehensive Check Tool")
    print("=" * 50)
    
    # Check backend database
    backend_db = 'mynote_sync.db'
    check_database(backend_db, 'Backend Database')
    
    # Check root directory database (if exists)
    root_db = '../mynote_sync.db'
    if os.path.exists(root_db):
        check_database(root_db, 'Root Directory Database')
    else:
        print(f"\nℹ️ Root directory database does not exist: {root_db}")
    
    print(f"\n💡 Note: Frontend app uses local SQLite database 'mynote.db'")
    print(f"   Backend server uses database 'server/mynote_sync.db'")
    print(f"   Both databases sync data through API")
    
    print("\n🎉 Check completed!")

if __name__ == "__main__":
    main()
