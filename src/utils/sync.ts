import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB, nowISO } from '../db/sqlite';
import { listQueue, removeQueueItem, bumpQueueAttempt } from '../db/syncQueue';
import { getJson, postJson, del } from './api';
import { showToast } from '../components/Toast';

const LAST_KEY = (uid: number) => `sync.last.${uid}`; // 先固定 uid=1，用时传 1 即可

async function pushDeleteQueue(uid: number) {
  const items = await listQueue(uid, 50);
  for (const it of items) {
    try {
      if (!it.remote_id) { await removeQueueItem(it.id); continue; }
      await del(`/notes/${encodeURIComponent(it.remote_id)}`);
      await removeQueueItem(it.id);
    } catch (e: any) {
      await bumpQueueAttempt(it.id, String(e?.message || e));
      if (/timeout|Network/i.test(String(e))) break; // 网络问题：先停，留给下次
    }
  }
}

async function pushDirty(uid: number) {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT * FROM notes WHERE dirty=1 AND user_id=? ORDER BY updated_at ASC`,
        [uid],
        async (_, rs) => {
          for (let i = 0; i < rs.rows.length; i++) {
            const n = rs.rows.item(i);
            const payload = {
              id: n.remote_id ?? null,
              title: n.title ?? '',
              content: n.content ?? '',
              folder_id: n.folder_id ?? null,
              is_favorite: n.is_favorite ? 1 : 0,
              is_deleted: n.is_deleted ? 1 : 0,
              updated_at: n.updated_at,
              version: n.version ?? 1,
            };
            const res = await postJson<{id:string|number, version:number, updated_at:string}>(`/notes/upsert`, payload);
            await new Promise<void>((resv, rej) => {
              db.transaction(txx => {
                txx.executeSql(
                  `UPDATE notes SET dirty=0, remote_id=?, version=?, updated_at=? WHERE id=?`,
                  [String(res.id ?? n.remote_id ?? ''), res.version ?? n.version, res.updated_at ?? n.updated_at, n.id],
                  () => resv(),
                  () => { rej(new Error("update failed")); return false; }
                );
              });
            });
          }
          resolve();
        },
        (_, e) => { reject(e); return false; }
      );
    });
  });
}

async function pull(uid: number) {
  const since = await AsyncStorage.getItem(LAST_KEY(uid));
  const qs = since ? `?updated_after=${encodeURIComponent(since)}` : '';
  const rows = await getJson<any[]>(`/notes${qs}`);
  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      for (const r of rows) {
        tx.executeSql(
          `SELECT * FROM notes WHERE user_id=? AND remote_id=? LIMIT 1`,
          [uid, String(r.remote_id)],
          (_, rs) => {
            const local = rs.rows.length ? rs.rows.item(0) : null;
            if (!local) {
              // 插入本地
              tx.executeSql(
                `INSERT INTO notes (title, content, folder_id, user_id, is_favorite, is_deleted, updated_at, version, remote_id, dirty)
                 VALUES (?,?,?,?,?,?,?,?,?,0)`,
                [r.title ?? '', r.content ?? '', r.folder_id ?? null, uid,
                 r.is_favorite ? 1 : 0, r.is_deleted ? 1 : 0,
                 r.updated_at ?? nowISO(), r.version ?? 1, String(r.remote_id)]
              );
            } else {
              if (local.dirty) return; // 本地有改动，等上行
              if ((r.updated_at || '') > (local.updated_at || '')) {
                tx.executeSql(
                  `UPDATE notes SET title=?, content=?, folder_id=?, is_favorite=?, is_deleted=?, updated_at=?, version=?, dirty=0 WHERE id=?`,
                  [r.title ?? '', r.content ?? '', r.folder_id ?? null,
                   r.is_favorite ? 1 : 0, r.is_deleted ? 1 : 0,
                   r.updated_at ?? nowISO(), r.version ?? local.version, local.id]
                );
              }
            }
          }
        );
      }
    }, (error) => {
      reject(error);
    }, () => {
      resolve();
    });
  });

  await AsyncStorage.setItem(LAST_KEY(uid), nowISO());
}

export async function runFullSync(showToastUi = true) {
  const uid = 1; // 先固定；以后接入登录改为当前用户 ID
  try {
    if (showToastUi) showToast.success("Sync started");
    await pushDeleteQueue(uid);
    await pushDirty(uid);
    await pull(uid);
    if (showToastUi) showToast.success("Sync completed");
  } catch (e: any) {
    showToast.error(`Sync failed: ${String(e?.message || e)}`);
  }
}
