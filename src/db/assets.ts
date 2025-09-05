// src/db/assets.ts
import { getDB, nowISO } from './sqlite';

export type NoteAsset = {
  id: number;
  note_id: number;
  type: 'image';
  path: string;       // relative path like /attachments/<noteId>/<file>
  created_at: string;
};

function rowsToArray<T = any>(rows: any): T[] {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function listAssets(noteId: number): Promise<NoteAsset[]> {
  const db = await getDB();
  const res = await db.executeSql(
    'SELECT * FROM note_assets WHERE note_id = ? ORDER BY created_at DESC;',
    [noteId]
  );
  return rowsToArray<NoteAsset>(res[0].rows);
}

export async function addAsset(noteId: number, type: 'image', relPath: string): Promise<NoteAsset> {
  const db = await getDB();
  await db.executeSql(
    'INSERT INTO note_assets (note_id, type, path, created_at) VALUES (?, ?, ?, ?);',
    [noteId, type, relPath, nowISO()]
  );
  const row = await db.executeSql('SELECT * FROM note_assets WHERE id = last_insert_rowid();');
  return row[0].rows.item(0) as NoteAsset;
}

export async function deleteAsset(assetId: number): Promise<void> {
  const db = await getDB();
  await db.executeSql('DELETE FROM note_assets WHERE id = ?;', [assetId]);
}

export async function deleteAssetsByNote(noteId: number): Promise<void> {
  const db = await getDB();
  await db.executeSql('DELETE FROM note_assets WHERE note_id = ?;', [noteId]);
}
