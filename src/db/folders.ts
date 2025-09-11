import { getDB } from './sqlite';
import { getCurrentUserId } from '../utils/session';
import { Folder } from './types';

async function currentUserIdOrThrow(): Promise<number> {
  const uid = await getCurrentUserId();
  if (uid === null || uid === undefined) throw new Error('No active user session');
  return uid;
}

export async function listFolders(): Promise<Folder[]> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql('SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC;', [uid]);
  const rows = res[0].rows;
  const out: Folder[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function getFolderById(id: number): Promise<Folder | null> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const res = await db.executeSql('SELECT * FROM folders WHERE id = ? AND user_id = ? LIMIT 1;', [id, uid]);
  return res[0].rows.length ? (res[0].rows.item(0) as Folder) : null;
}

export async function getOrCreateFolderByName(name: string): Promise<Folder> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  const found = await db.executeSql('SELECT * FROM folders WHERE name = ? AND user_id = ? LIMIT 1;', [name, uid]);
  if (found[0].rows.length) return found[0].rows.item(0);
  
  // If not found locally, create via API
  return await createFolder(name);
}

export async function createFolder(name: string): Promise<Folder> {
  const uid = await currentUserIdOrThrow();
  
  // Call backend API first
  const { postJson } = await import('../utils/api');
  const response = await postJson<{id: number, name: string, created_at: string, updated_at: string}>('/folders', { name });
  
  // Insert into local database
  const db = await getDB();
  await db.executeSql('INSERT INTO folders (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);', 
    [response.id, name, uid, response.created_at, response.updated_at]);
  
  return {
    id: response.id,
    name: response.name,
    user_id: uid,
    created_at: response.created_at,
    updated_at: response.updated_at
  };
}


export async function deleteFolder(id: number): Promise<void> {
  const uid = await currentUserIdOrThrow();
  
  // Call backend API first
  const { del } = await import('../utils/api');
  await del(`/folders/${id}`);
  
  // Delete from local database
  const db = await getDB();
  // Do NOT cascade delete notes; FK is SET NULL by design.
  await db.executeSql('DELETE FROM folders WHERE id = ? AND user_id = ?;', [id, uid]);
}

export async function updateFolder(id: number, name: string): Promise<void> {
  const uid = await currentUserIdOrThrow();
  
  // Call backend API first
  const { putJson } = await import('../utils/api');
  const response = await putJson<{id: number, name: string, updated_at: string}>(`/folders/${id}`, { name });
  
  // Update local database
  const db = await getDB();
  await db.executeSql('UPDATE folders SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?;', 
    [name, response.updated_at, id, uid]);
}