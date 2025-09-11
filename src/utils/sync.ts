import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB, nowISO } from '../db/sqlite';
import { listQueue, removeQueueItem, bumpQueueAttempt } from '../db/syncQueue';
import { getJson, postJson, del } from './api';
import { showToast } from '../components/Toast';
import { getCurrentUserId } from './session';
import { getItem } from './storage';

const LAST_KEY = (uid: number) => `sync.last.${uid}`;

let SYNC_IN_FLIGHT = false;
let AUTO_SYNC_INTERVAL: NodeJS.Timeout | null = null;

async function pushDeleteQueue(uid: number) {
  const items = await listQueue(uid, 50);
  for (const it of items) {
    try {
      if (!it.remote_id) { await removeQueueItem(it.id); continue; }
      await del(`/notes/${encodeURIComponent(it.remote_id)}`);
      await removeQueueItem(it.id);
    } catch (e: any) {
      await bumpQueueAttempt(it.id, String(e?.message || e));
      if (/timeout|Network/i.test(String(e))) {
        throw e; // Re-throw network errors to be caught by main sync function
      }
    }
  }
}

async function pushDirty(uid: number): Promise<number> {
  const db = await getDB();
  let pushedCount = 0;
  await new Promise<void>((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(
        `SELECT * FROM notes WHERE dirty=1 AND user_id=? ORDER BY updated_at ASC`,
        [uid],
        async (_, rs) => {
          try {
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
                    [res.id ? String(res.id) : n.remote_id, res.version ?? n.version, res.updated_at ?? n.updated_at, n.id],
                    () => resv(),
                    () => { rej(new Error("update failed")); return false; }
                  );
                });
              });
              pushedCount++;
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (_, e) => { reject(e); return false; }
      );
    });
  });
  return pushedCount;
}

async function pull(uid: number): Promise<number> {
  const since = await AsyncStorage.getItem(LAST_KEY(uid));
  const qs = since ? `?updated_after=${encodeURIComponent(since)}` : '';
  const data = await getJson<any>(`/notes${qs}`);
  
  // Support both old array format and new object format
  const rows = Array.isArray(data) ? data : (data.items ?? []);
  const serverNow = Array.isArray(data) ? null : data.server_now ?? null;
  
  const db = await getDB();
  let pulledCount = 0;

  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      for (const r of rows) {
        tx.executeSql(
          `SELECT * FROM notes WHERE user_id=? AND remote_id=? LIMIT 1`,
          [uid, String(r.remote_id)],
          (_, rs) => {
            const local = rs.rows.length ? rs.rows.item(0) : null;
            if (!local) {
              // Insert locally
              tx.executeSql(
                `INSERT INTO notes (title, content, folder_id, user_id, is_favorite, is_deleted, updated_at, version, remote_id, dirty)
                 VALUES (?,?,?,?,?,?,?,?,?,0)`,
                [r.title ?? '', r.content ?? '', r.folder_id ?? null, uid,
                 r.is_favorite ? 1 : 0, r.is_deleted ? 1 : 0,
                 r.updated_at ?? nowISO(), r.version ?? 1, String(r.remote_id)]
              );
              pulledCount++;
            } else {
              if (local.dirty) return; // Local changes exist, wait for upload
              if ((r.updated_at || '') > (local.updated_at || '')) {
                tx.executeSql(
                  `UPDATE notes SET title=?, content=?, folder_id=?, is_favorite=?, is_deleted=?, updated_at=?, version=?, dirty=0 WHERE id=?`,
                  [r.title ?? '', r.content ?? '', r.folder_id ?? null,
                   r.is_favorite ? 1 : 0, r.is_deleted ? 1 : 0,
                   r.updated_at ?? nowISO(), r.version ?? local.version, local.id]
                );
                pulledCount++;
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

  // Use server_now if available, otherwise use max(updated_at) as bookmark to avoid missing same-second data
  const maxUpdated = rows.reduce(
    (m: string, r: any) => (r.updated_at && r.updated_at > m ? r.updated_at : m),
    since || '1970-01-01T00:00:00Z'
  );
  await AsyncStorage.setItem(LAST_KEY(uid), serverNow ?? maxUpdated ?? nowISO());
  
  return pulledCount;
}

export async function runFullSync(showToastUi = true): Promise<{pushed: number; deleted: number; pulled: number}> {
  if (SYNC_IN_FLIGHT) { 
    if (showToastUi) showToast.error('Sync is already running'); 
    return { pushed:0, deleted:0, pulled:0 }; 
  }
  SYNC_IN_FLIGHT = true;
  const uid = (await getCurrentUserId()) ?? 1;

  const result = { pushed: 0, deleted: 0, pulled: 0 };
  try {
    if (showToastUi) showToast.success('Sync started');

    // Delete queue
    const delItems = await listQueue(uid, 999);
    await pushDeleteQueue(uid);
    result.deleted = delItems.length;

    // Dirty data
    const pushed = await pushDirty(uid);
    result.pushed = pushed;

    // Download
    const pulled = await pull(uid);
    result.pulled = pulled;

    if (showToastUi) showToast.success(`Synced • +${result.pulled} / ↑${result.pushed} / ✖︎${result.deleted}`);
  } catch (e: any) {
    const errorMessage = String(e?.message || e);
    let userFriendlyMessage = "Sync failed";
    
    // Provide more user-friendly error messages
    if (errorMessage.includes("timeout") || errorMessage.includes("Network")) {
      userFriendlyMessage = "Sync failed: No internet connection. Please check your network and try again.";
    } else if (errorMessage.includes("UNAUTHORIZED") || errorMessage.includes("401")) {
      userFriendlyMessage = "Sync failed: Authentication error. Please restart the app.";
    } else if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
      userFriendlyMessage = "Sync failed: Server error. Please try again later.";
    } else {
      userFriendlyMessage = `Sync failed: ${errorMessage}`;
    }
    
    if (showToastUi) showToast.error(userFriendlyMessage);
  } finally {
    SYNC_IN_FLIGHT = false;
  }
  return result;
}

// Auto sync functions
export async function isAutoSyncEnabled(): Promise<boolean> {
  try {
    const enabled = await getItem('autoSyncEnabled');
    return enabled === 'true';
  } catch (error) {
    console.log('Error checking auto sync setting:', error);
    return false;
  }
}

export async function startAutoSync(): Promise<void> {
  // Clear any existing interval
  if (AUTO_SYNC_INTERVAL) {
    clearInterval(AUTO_SYNC_INTERVAL);
  }

  // Check if auto sync is enabled
  const enabled = await isAutoSyncEnabled();
  if (!enabled) {
    return;
  }

  // Start auto sync every 5 seconds
  AUTO_SYNC_INTERVAL = setInterval(async () => {
    try {
      const stillEnabled = await isAutoSyncEnabled();
      if (!stillEnabled) {
        stopAutoSync();
        return;
      }

      // Only sync if not already syncing
      if (!SYNC_IN_FLIGHT) {
        await runFullSync(false); // Don't show toast for auto sync
      }
    } catch (error) {
      console.log('Auto sync error:', error);
    }
  }, 5000); // 5 seconds

  console.log('Auto sync started');
}

export function stopAutoSync(): void {
  if (AUTO_SYNC_INTERVAL) {
    clearInterval(AUTO_SYNC_INTERVAL);
    AUTO_SYNC_INTERVAL = null;
    console.log('Auto sync stopped');
  }
}

// Initialize auto sync on app start
export async function initializeAutoSync(): Promise<void> {
  const enabled = await isAutoSyncEnabled();
  if (enabled) {
    await startAutoSync();
  }
}
