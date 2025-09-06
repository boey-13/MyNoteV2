import { getDB, nowISO } from './sqlite';

export async function enqueueDelete(userId: number, noteLocalId: number | null, remoteId: string) {
  console.log(`enqueueDelete called with: userId=${userId}, noteLocalId=${noteLocalId}, remoteId=${remoteId}`);
  
  // 参数验证
  if (userId === undefined || userId === null) {
    throw new Error(`Invalid userId: ${userId}`);
  }
  if (remoteId === undefined || remoteId === null) {
    throw new Error(`Invalid remoteId: ${remoteId}`);
  }
  
  const db = await getDB();
  
  // 使用更简单的方法：直接执行SQL，不使用事务
  try {
    const result = await db.executeSql(
      `INSERT INTO sync_queue(user_id, action, note_local_id, remote_id, created_at)
       VALUES (?, 'DELETE', ?, ?, ?)`,
      [userId, noteLocalId, remoteId, nowISO()]
    );
    
    console.log(`Successfully inserted into sync_queue: userId=${userId}, noteLocalId=${noteLocalId}, remoteId=${remoteId}`);
    console.log(`Insert result:`, result);
    
  } catch (error: any) {
    console.error(`Failed to insert into sync_queue:`, error);
    console.error(`Error type:`, typeof error);
    console.error(`Error message:`, error?.message || 'No message');
    throw new Error(`Database insert failed: ${error?.message || String(error) || 'Unknown error'}`);
  }
}

export async function listQueue(userId: number, limit = 50) {
  const db = await getDB();
  return new Promise<any[]>((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT * FROM sync_queue WHERE user_id=? ORDER BY created_at ASC LIMIT ?`,
        [userId, limit],
        (_, rs) => {
          const arr: any[] = [];
          for (let i = 0; i < rs.rows.length; i++) arr.push(rs.rows.item(i));
          resolve(arr);
        },
        (_, e) => { reject(e); return false; }
      );
    });
  });
}

export async function removeQueueItem(id: number) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(`DELETE FROM sync_queue WHERE id=?`, [id], () => resolve(), (_, e) => { reject(e); return false; });
    });
  });
}

export async function bumpQueueAttempt(id: number, err: string) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE sync_queue SET try_count = try_count + 1, last_error = ? WHERE id = ?`,
        [err.slice(0, 500), id],
        () => resolve(),
        (_, e) => { reject(e); return false; }
      );
    });
  });
}

export async function countDeleteQueue(userId: number): Promise<number> {
  const db = await getDB();
  return new Promise<number>((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT COUNT(*) AS n FROM sync_queue WHERE user_id=?`,
        [userId],
        (_, rs) => resolve(rs.rows.item(0)?.n ?? 0),
        (_, e) => { reject(e); return false; }
      );
    });
  });
}
