import { getDB } from './sqlite';
import { NoteAsset } from './types';

export async function listAssets(noteId: number): Promise<NoteAsset[]> {
  const db = await getDB();
  const res = await db.executeSql('SELECT * FROM note_assets WHERE note_id = ? ORDER BY created_at DESC;', [noteId]);
  const rows = res[0].rows;
  const out: NoteAsset[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function addImageAsset(noteId: number, path: string): Promise<void> {
  const db = await getDB();
  await db.executeSql(
    'INSERT INTO note_assets (note_id, type, path) VALUES (?, ?, ?);',
    [noteId, 'image', path]
  );
}

export async function removeAsset(assetId: number): Promise<void> {
  const db = await getDB();
  await db.executeSql('DELETE FROM note_assets WHERE id = ?;', [assetId]);
}
