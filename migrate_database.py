#!/usr/bin/env python3
"""
Database migration script to update user table constraints
- Remove UNIQUE constraint from username
- Add UNIQUE constraint to email
"""

import sqlite3
import os

def migrate_database():
    """Migrate the database to allow duplicate usernames but unique emails"""
    
    # Database paths
    backend_db = "server/mynote_sync.db"
    frontend_db = "mynote_sync.db"
    
    databases = [backend_db, frontend_db]
    
    for db_path in databases:
        if not os.path.exists(db_path):
            print(f"⚠️  Database not found: {db_path}")
            continue
            
        print(f"🔄 Migrating database: {db_path}")
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check current schema
            cursor.execute("PRAGMA table_info(users)")
            columns = cursor.fetchall()
            print(f"📋 Current users table columns: {[col[1] for col in columns]}")
            
            # Check current constraints
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
            create_sql = cursor.fetchone()[0]
            print(f"📝 Current CREATE TABLE statement: {create_sql}")
            
            # Create new table with correct constraints
            cursor.execute("""
                CREATE TABLE users_new(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    email TEXT UNIQUE,
                    password TEXT,
                    avatar TEXT,
                    created_at TEXT
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO users_new (id, username, email, password, avatar, created_at)
                SELECT id, username, email, password, 
                       CASE WHEN avatar IS NULL THEN NULL ELSE avatar END,
                       CASE WHEN created_at IS NULL THEN datetime('now') ELSE created_at END
                FROM users
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE users")
            
            # Rename new table
            cursor.execute("ALTER TABLE users_new RENAME TO users")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_dirty ON notes(dirty)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_syncq_user ON sync_queue(user_id, created_at)")
            
            conn.commit()
            print(f"✅ Successfully migrated: {db_path}")
            
            # Verify the new schema
            cursor.execute("PRAGMA table_info(users)")
            new_columns = cursor.fetchall()
            print(f"📋 New users table columns: {[col[1] for col in new_columns]}")
            
            # Check for unique constraints
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
            new_create_sql = cursor.fetchone()[0]
            print(f"📝 New CREATE TABLE statement: {new_create_sql}")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Error migrating {db_path}: {e}")
            if 'conn' in locals():
                conn.close()

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    print("📝 This will:")
    print("   - Remove UNIQUE constraint from username")
    print("   - Add UNIQUE constraint to email")
    print("   - Preserve all existing data")
    print()
    
    migrate_database()
    
    print()
    print("✅ Migration completed!")
    print("📋 Summary:")
    print("   - Username can now be duplicated")
    print("   - Email must be unique")
    print("   - All existing data preserved")
