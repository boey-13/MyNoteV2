import { getDB } from './sqlite';
import { Folder } from './types';

export async function listFolders(): Promise<Folder[]> {
  const db = await getDB();
  const res = await db.executeSql('SELECT * FROM folders ORDER BY name ASC;');
  const rows = res[0].rows;
  const out: Folder[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function getOrCreateFolderByName(name: string): Promise<Folder> {
  const db = await getDB();
  const found = await db.executeSql('SELECT * FROM folders WHERE name = ? LIMIT 1;', [name]);
  if (found[0].rows.length) return found[0].rows.item(0);
  await db.executeSql('INSERT INTO folders (name) VALUES (?);', [name]);
  const res = await db.executeSql('SELECT * FROM folders WHERE name = ? LIMIT 1;', [name]);
  return res[0].rows.item(0);
}

export async function createFolder(name: string): Promise<Folder> {
  const db = await getDB();
  await db.executeSql('INSERT INTO folders (name) VALUES (?);', [name]);
  const res = await db.executeSql('SELECT * FROM folders WHERE name = ? LIMIT 1;', [name]);
  return res[0].rows.item(0);
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const db = await getDB();
  await db.executeSql('UPDATE folders SET name = ? WHERE id = ?;', [name, id]);
}

export async function deleteFolder(id: number): Promise<void> {
  const db = await getDB();
  // Do NOT cascade delete notes; FK is SET NULL by design.
  await db.executeSql('DELETE FROM folders WHERE id = ?;', [id]);
}
