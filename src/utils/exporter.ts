// src/utils/exporter.ts
import RNFS from 'react-native-fs';
import { listNotes } from '../db/notes';
import { listFolders } from '../db/folders';
import { listAssets } from '../db/assets';

export async function exportAllToJson(): Promise<{ path: string; bytes: number }> {
  const [notesAll, folders] = await Promise.all([listNotes(true), listFolders()]);
  const notes = await Promise.all(
    notesAll.map(async (n) => {
      const assets = await listAssets(n.id);
      return { ...n, assets };
    })
  );

  const payload = {
    exported_at: new Date().toISOString(),
    folders,
    notes,
  };

  const json = JSON.stringify(payload, null, 2);
  const dir = `${RNFS.DocumentDirectoryPath}/exports`;
  await RNFS.mkdir(dir);
  const filename = `mynote_export_${Date.now()}.json`;
  const path = `${dir}/${filename}`;
  await RNFS.writeFile(path, json, 'utf8');
  const stat = await RNFS.stat(path);
  return { path, bytes: Number(stat.size) };
}
