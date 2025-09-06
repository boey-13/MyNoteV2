/**
 * 数据库检查和修复工具
 */
import { getDB } from '../db/sqlite';

export async function checkDatabaseSchema(): Promise<void> {
  const db = await getDB();
  
  console.log('🔍 检查数据库结构...');
  
  // 1. Check current schema version
  try {
    const versionResult = await db.executeSql('SELECT value FROM app_meta WHERE key = ?', ['schema_version']);
    const currentVersion = versionResult[0].rows.length > 0 ? parseInt(versionResult[0].rows.item(0).value) : 0;
    console.log(`📊 当前数据库版本: ${currentVersion}`);
  } catch (e) {
    console.log('❌ 无法读取schema版本，可能数据库未初始化');
  }
  
  // 2. Check if notes table has dirty column
  try {
    const notesResult = await db.executeSql('PRAGMA table_info(notes)');
    const columns = [];
    for (let i = 0; i < notesResult[0].rows.length; i++) {
      columns.push(notesResult[0].rows.item(i).name);
    }
    console.log(`📋 notes表列: ${columns.join(', ')}`);
    console.log(`✅ notes表有dirty列: ${columns.includes('dirty')}`);
  } catch (e) {
    console.log('❌ 无法检查notes表结构');
  }
  
  // 3. Check if sync_queue table exists
  try {
    const syncQueueResult = await db.executeSql('SELECT name FROM sqlite_master WHERE type="table" AND name="sync_queue"');
    const tableExists = syncQueueResult[0].rows.length > 0;
    console.log(`✅ sync_queue表存在: ${tableExists}`);
    
    if (tableExists) {
      // Check sync_queue table structure
      const structureResult = await db.executeSql('PRAGMA table_info(sync_queue)');
      const columns = [];
      for (let i = 0; i < structureResult[0].rows.length; i++) {
        columns.push(structureResult[0].rows.item(i).name);
      }
      console.log(`📋 sync_queue表列: ${columns.join(', ')}`);
      console.log(`✅ sync_queue表有action列: ${columns.includes('action')}`);
    }
  } catch (e) {
    console.log('❌ 无法检查sync_queue表');
  }
}

export async function forceCreateSyncQueue(): Promise<void> {
  const db = await getDB();
  
  console.log('🔧 强制创建sync_queue表...');
  
  try {
    // Drop old table (if exists)
    await db.executeSql('DROP TABLE IF EXISTS sync_queue');
    console.log('🗑️ 删除旧sync_queue表');
    
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
    console.log('✅ 创建sync_queue表');
    
    // Create indexes
    await db.executeSql('CREATE INDEX idx_syncq_user ON sync_queue(user_id, created_at)');
    console.log('✅ 创建索引');
    
    // Update schema version
    await db.executeSql('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', ['schema_version', '7']);
    console.log('✅ 更新schema版本到7');
    
  } catch (e) {
    console.error('❌ 强制创建失败:', e);
    throw e;
  }
}
