// src/db/notes.ts
import { getDB, nowISO } from './sqlite';
import { getCurrentUserId } from '../utils/session';
import { Note } from './types';
import { enqueueDelete } from './syncQueue';

function mapRows<T = any>(rows: any): T[] {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

async function currentUserIdOrThrow(): Promise<number> {
  const uid = await getCurrentUserId();
  if (!uid && uid !== 0) throw new Error('No active user session');
  return uid;
}

/** ===== Basic listings ===== */
export async function listNotes(includeDeleted = false): Promise<Note[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql(
    includeDeleted
      ? 'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC;'
      : 'SELECT * FROM notes WHERE is_deleted = 0 AND user_id = ? ORDER BY updated_at DESC;',
    [uid]
  );
  return mapRows<Note>(res[0].rows);
}

export async function listDeleted(): Promise<Note[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql(
    'SELECT * FROM notes WHERE is_deleted = 1 AND user_id = ? ORDER BY deleted_at DESC, updated_at DESC;',
    [uid]
  );
  return mapRows<Note>(res[0].rows);
}

export async function listFavorites(limit = 5): Promise<Note[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql(
    'SELECT * FROM notes WHERE is_deleted = 0 AND is_favorite = 1 AND user_id = ? ORDER BY updated_at DESC LIMIT ?;',
    [uid, limit]
  );
  return mapRows<Note>(res[0].rows);
}

export async function listNotesByFolder(folderId: number | null): Promise<Note[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  if (folderId == null) {
    const res = await db.executeSql('SELECT * FROM notes WHERE folder_id IS NULL AND is_deleted = 0 AND user_id = ? ORDER BY updated_at DESC;', [uid]);
    return mapRows<Note>(res[0].rows);
  }
  const res = await db.executeSql('SELECT * FROM notes WHERE folder_id = ? AND is_deleted = 0 AND user_id = ? ORDER BY updated_at DESC;', [folderId, uid]);
  return mapRows<Note>(res[0].rows);
}

/** ===== CRUD ===== */
export async function getNote(id: number): Promise<Note | null> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql('SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1;', [id, uid]);
  return res[0].rows.length ? (res[0].rows.item(0) as Note) : null;
}

export async function createNote(input: { title: string; content?: string; folder_id?: number | null; }): Promise<Note> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const now = nowISO();
  const { title, content = '', folder_id = null } = input;
  await db.executeSql(
    `INSERT INTO notes (title, content, folder_id, user_id, is_favorite, is_deleted, created_at, updated_at, version, dirty)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, 1, 1);`,
    [title, content, folder_id, uid, now, now]
  );
  const row = await db.executeSql('SELECT * FROM notes WHERE id = last_insert_rowid();');
  return row[0].rows.item(0) as Note;
}

export async function updateNote(id: number, changes: Partial<Pick<Note,'title'|'content'|'folder_id'|'is_favorite'>>): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const fields: string[] = [];
  const params: any[] = [];
  if (changes.title !== undefined) { fields.push('title = ?'); params.push(changes.title); }
  if (changes.content !== undefined) { fields.push('content = ?'); params.push(changes.content); }
  if (changes.folder_id !== undefined) { fields.push('folder_id = ?'); params.push(changes.folder_id); }
  if (changes.is_favorite !== undefined) { fields.push('is_favorite = ?'); params.push(changes.is_favorite); }
  fields.push('updated_at = ?'); params.push(nowISO());
  fields.push('version = version + 1');
  fields.push('dirty = 1');
  params.push(uid, id);
  const sql = `UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?;`;
  await db.executeSql(sql, params);
}

export async function softDeleteNote(id: number): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql(
    'UPDATE notes SET is_deleted = 1, deleted_at = ?, updated_at = ?, version = version + 1, dirty = 1 WHERE id = ? AND user_id = ?;',
    [nowISO(), nowISO(), id, uid]
  );
}

export async function restoreNote(id: number): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql(
    'UPDATE notes SET is_deleted = 0, deleted_at = NULL, updated_at = ?, version = version + 1, dirty = 1 WHERE id = ? AND user_id = ?;',
    [nowISO(), id, uid]
  );
}

export async function deleteNotePermanent(id: number): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  
  // First, get the remote_id before deleting
  const res = await db.executeSql('SELECT remote_id FROM notes WHERE id = ? AND user_id = ?;', [id, uid]);
  const remoteId = res[0].rows.length ? res[0].rows.item(0).remote_id : null;
  
  // If it has a remote_id, enqueue the delete
  if (remoteId) {
    await enqueueDelete(uid, id, remoteId);
  }
  
  // Then delete locally
  await db.executeSql('DELETE FROM notes WHERE id = ? AND user_id = ?;', [id, uid]);
}

export async function toggleFavorite(id: number, fav: boolean): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql(
    'UPDATE notes SET is_favorite = ?, updated_at = ?, version = version + 1, dirty = 1 WHERE id = ? AND user_id = ?;',
    [fav ? 1 : 0, nowISO(), id, uid]
  );
}

/** Set or clear folder for a note (null to clear). */
export async function setNoteFolder(noteId: number, folderId: number | null): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql(
    'UPDATE notes SET folder_id = ?, updated_at = ?, version = version + 1, dirty = 1 WHERE id = ? AND user_id = ?;',
    [folderId, nowISO(), noteId, uid]
  );
}

/** ===== Batch operations (Step 5) ===== */
export async function restoreNotes(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const ph = placeholders(ids.length);
  await db.executeSql(
    `UPDATE notes SET is_deleted = 0, deleted_at = NULL, updated_at = ?, version = version + 1, dirty = 1 WHERE id IN (${ph}) AND user_id = ?;`,
    [nowISO(), ...ids, uid]
  );
}

export async function deleteNotesPermanent(ids: number[]): Promise<void> {
  if (!ids.length) return;
  
  // 临时修复：如果没有用户会话，使用默认用户ID=1
  let uid = await getCurrentUserId();
  if (!uid) {
    uid = 1; // 使用guest用户ID
  }
  
  const db = await getDB();
  
  try {
    // 先获取所有笔记的remote_id信息（在删除前）
    const ph = placeholders(ids.length);
    const res = await db.executeSql(`SELECT id, remote_id FROM notes WHERE id IN (${ph}) AND user_id = ?;`, [...ids, uid]);
    
    console.log(`Found ${res[0].rows.length} notes to delete`);
    
    // 将有remote_id的笔记加入删除队列
    console.log(`User ID for enqueue: ${uid} (type: ${typeof uid})`);
    for (let i = 0; i < res[0].rows.length; i++) {
      const row = res[0].rows.item(i);
      console.log(`Processing row: id=${row.id}, remote_id=${row.remote_id} (type: ${typeof row.remote_id})`);
      if (row.remote_id) {
        try {
          console.log(`Enqueueing delete for note ${row.id} with remote_id ${row.remote_id}`);
          await enqueueDelete(uid, row.id, row.remote_id);
          console.log(`Successfully enqueued delete for note ${row.id}`);
        } catch (enqueueError) {
          console.error(`Failed to enqueue delete for note ${row.id}:`, enqueueError);
          console.error(`Error details:`, {
            uid: uid,
            noteId: row.id,
            remoteId: row.remote_id,
            error: enqueueError
          });
          // 继续执行，不因为队列失败而停止删除
        }
      } else {
        console.log(`Note ${row.id} has no remote_id, skipping queue`);
      }
    }
    
    // 然后执行本地删除
    await db.executeSql(`DELETE FROM notes WHERE id IN (${ph}) AND user_id = ?;`, [...ids, uid]);
    console.log(`Successfully deleted ${ids.length} notes locally`);
  } catch (error) {
    console.error('Delete operation failed:', error);
    throw error;
  }
}

export async function emptyRecycleBin(): Promise<void> {
  // 临时修复：如果没有用户会话，使用默认用户ID=1
  let uid = await getCurrentUserId();
  if (!uid) {
    uid = 1; // 使用guest用户ID
  }
  
  const db = await getDB();
  await db.executeSql('DELETE FROM notes WHERE is_deleted = 1 AND user_id = ?;', [uid]);
}

export async function toggleFavorites(ids: number[], fav: boolean): Promise<void> {
  if (!ids.length) return;
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const ph = placeholders(ids.length);
  await db.executeSql(
    `UPDATE notes SET is_favorite = ?, updated_at = ?, version = version + 1, dirty = 1 WHERE id IN (${ph}) AND user_id = ?;`,
    [fav ? 1 : 0, nowISO(), ...ids, uid]
  );
}

/** ===== Search / Sort / Filter (Step 6) ===== */

export type SearchSort = 'updated_desc' | 'title_asc' | 'favorite_first';
export type SearchOptions = {
  includeDeleted?: boolean;      // default false
  favoritesOnly?: boolean;       // default false
  folderId?: number | null;      // undefined = any; null = only NULL; number = exact id
  sort?: SearchSort;             // default 'updated_desc'
  limit?: number;                // optional
  offset?: number;               // optional
};

export async function searchNotes(query: string, opts: SearchOptions = {}): Promise<Note[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const q = (query ?? '').trim();
  const terms = q ? q.split(/\s+/) : [];

  const where: string[] = [];
  const params: any[] = [];

  // user filter (always first)
  where.push('user_id = ?');
  params.push(uid);

  // deleted filter
  if (!opts.includeDeleted) {
    where.push('is_deleted = 0');
  }

  // favorites filter
  if (opts.favoritesOnly) {
    where.push('is_favorite = 1');
  }

  // folder filter
  if (opts.folderId === null) {
    where.push('folder_id IS NULL');
  } else if (typeof opts.folderId === 'number') {
    where.push('folder_id = ?');
    params.push(opts.folderId);
  }

  // text terms (AND between terms, OR within title/content)
  for (const t of terms) {
    where.push('(title LIKE ? OR content LIKE ?)');
    const like = `%${t}%`;
    params.push(like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let orderBy = 'ORDER BY updated_at DESC';
  switch (opts.sort) {
    case 'title_asc':
      orderBy = 'ORDER BY LOWER(title) ASC, updated_at DESC';
      break;
    case 'favorite_first':
      orderBy = 'ORDER BY is_favorite DESC, updated_at DESC';
      break;
    default:
      orderBy = 'ORDER BY updated_at DESC';
  }

  const pagination =
    typeof opts.limit === 'number'
      ? ` LIMIT ${Math.max(0, opts.limit)} OFFSET ${Math.max(0, opts.offset || 0)}`
      : '';

  const sql = `SELECT * FROM notes ${whereSql} ${orderBy}${pagination};`;
  const res = await db.executeSql(sql, params);
  return mapRows<Note>(res[0].rows);
}

// db/notes.ts —— 新增：统计 / 列出 dirty 笔记

/** 统计待上传数量（dirty=1） */
export async function countDirtyNotes(userId: number): Promise<number> {
  const db = await getDB();
  return new Promise<number>((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT COUNT(*) AS n FROM notes WHERE dirty = 1 AND user_id = ?`,
        [userId],
        (_, rs) => resolve(rs.rows.item(0)?.n ?? 0),
        (_, e) => { reject(e); return false; }
      );
    });
  });
}

/** 列出待上传的笔记（ID/标题/时间），默认最多 50 条，按更新时间升序 */
export async function listDirtyNotes(
  userId: number,
  limit = 50
): Promise<Array<{ id: number; title: string; updated_at: string; remote_id?: string | null }>> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT id, title, updated_at, remote_id
           FROM notes
          WHERE dirty = 1 AND user_id = ?
          ORDER BY updated_at ASC
          LIMIT ?`,
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
