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
  await db.executeSql('INSERT INTO folders (name, user_id) VALUES (?, ?);', [name, uid]);
  const res = await db.executeSql('SELECT * FROM folders WHERE name = ? AND user_id = ? LIMIT 1;', [name, uid]);
  return res[0].rows.item(0);
}

export async function createFolder(name: string): Promise<Folder> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql('INSERT INTO folders (name, user_id) VALUES (?, ?);', [name, uid]);
  const res = await db.executeSql('SELECT * FROM folders WHERE name = ? AND user_id = ? LIMIT 1;', [name, uid]);
  return res[0].rows.item(0);
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?;', [name, id, uid]);
}

export async function deleteFolder(id: number): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  // Do NOT cascade delete notes; FK is SET NULL by design.
  await db.executeSql('DELETE FROM folders WHERE id = ? AND user_id = ?;', [id, uid]);
}

export async function updateFolder(id: number, name: string): Promise<void> {
  const uid = await currentUserIdOrThrow();
  const db = await getDB();
  await db.executeSql('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?;', [name, id, uid]);
}