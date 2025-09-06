/**
 * Database check and repair utilities
 */
import { getDB } from '../db/sqlite';

export async function checkDatabaseSchema(): Promise<void> {
  const db = await getDB();
  
  console.log('🔍 Checking database structure...');
  
  // 1. Check current schema version
  try {
    const versionResult = await db.executeSql('SELECT value FROM app_meta WHERE key = ?', ['schema_version']);
    const currentVersion = versionResult[0].rows.length > 0 ? parseInt(versionResult[0].rows.item(0).value) : 0;
    console.log(`📊 Current database version: ${currentVersion}`);
  } catch (e) {
    console.log('❌ Cannot read schema version, database may not be initialized');
  }
  
  // 2. Check if notes table has dirty column
  try {
    const notesResult = await db.executeSql('PRAGMA table_info(notes)');
    const columns = [];
    for (let i = 0; i < notesResult[0].rows.length; i++) {
      columns.push(notesResult[0].rows.item(i).name);
    }
    console.log(`📋 notes table columns: ${columns.join(', ')}`);
    console.log(`✅ notes table has dirty column: ${columns.includes('dirty')}`);
  } catch (e) {
    console.log('❌ Cannot check notes table structure');
  }
  
  // 3. Check if sync_queue table exists
  try {
    const syncQueueResult = await db.executeSql('SELECT name FROM sqlite_master WHERE type="table" AND name="sync_queue"');
    const tableExists = syncQueueResult[0].rows.length > 0;
    console.log(`✅ sync_queue table exists: ${tableExists}`);
    
    if (tableExists) {
      // Check sync_queue table structure
      const structureResult = await db.executeSql('PRAGMA table_info(sync_queue)');
      const columns = [];
      for (let i = 0; i < structureResult[0].rows.length; i++) {
        columns.push(structureResult[0].rows.item(i).name);
      }
      console.log(`📋 sync_queue table columns: ${columns.join(', ')}`);
      console.log(`✅ sync_queue table has action column: ${columns.includes('action')}`);
    }
  } catch (e) {
    console.log('❌ Cannot check sync_queue table');
  }
}

export async function forceCreateSyncQueue(): Promise<void> {
  const db = await getDB();
  
  console.log('🔧 Force creating sync_queue table...');
  
  try {
    // Drop old table (if exists)
    await db.executeSql('DROP TABLE IF EXISTS sync_queue');
    console.log('🗑️ Dropped old sync_queue table');
    
    // Create new table
    await db.executeSql(`
      CREATE TABLE sync_queue(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        note_local_id INTEGER,
        remote_id TEXT,
        try_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      )
    `);
    console.log('✅ Created sync_queue table');
    
    // Create indexes
    await db.executeSql('CREATE INDEX idx_syncq_user ON sync_queue(user_id, created_at)');
    console.log('✅ Created indexes');
    
    // Update schema version
    await db.executeSql('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', ['schema_version', '7']);
    console.log('✅ Updated schema version to 7');
    
  } catch (e) {
    console.error('❌ Force creation failed:', e);
    throw e;
  }
}
