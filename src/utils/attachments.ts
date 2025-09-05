// src/utils/attachments.ts
// Pick images and manage files/DB for both note and draft.
// Also supports inline images: returns rel paths and rewrites HTML on save.

import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import { addAsset, deleteAsset } from '../db/assets';

export const ATTACH_ROOT_REL = '/attachments';
const DRAFTS_SUB = '/_drafts';

export function relDirForNote(noteId: number) { return `${ATTACH_ROOT_REL}/${noteId}`; }
export function relDirForDraft(draftKey: number | 'new') { return `${ATTACH_ROOT_REL}${DRAFTS_SUB}/${draftKey}`; }
function absFromRel(rel: string) { return `${RNFS.DocumentDirectoryPath}${rel}`; }
export function toImageUri(relPath: string) { return 'file://' + absFromRel(relPath); }

function ensureExt(name?: string | null) {
  if (!name) return 'jpg';
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'jpg';
  return name.slice(dot + 1).toLowerCase() || 'jpg';
}

type PermRes = 'granted' | 'denied' | 'blocked';

async function ensureGalleryPermission(): Promise<PermRes> {
  if (Platform.OS !== 'android') return 'granted';
  const api = typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10) || 0;
  if (api >= 33) return 'granted'; // Android 13+: Photo Picker, no permission needed.
  const res = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
  );
  if (res === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (res === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

function throwByPerm(p: PermRes): never {
  if (p === 'blocked') {
    throw Object.assign(new Error('Gallery permission permanently denied. Open Settings to enable.'), { openSettings: true });
  }
  throw new Error('Gallery permission denied');
}

/** ===== Existing note: attach images and return the new relative paths ===== */
export async function attachImagesAndReturnRels(noteId: number): Promise<string[]> {
  const perm = await ensureGalleryPermission();
  if (perm !== 'granted') throwByPerm(perm);

  const options: ImageLibraryOptions = { mediaType: 'photo', selectionLimit: 0, includeBase64: false };
  const result = await launchImageLibrary(options);
  if (result.didCancel || !result.assets || result.assets.length === 0) return [];

  const dirRel = relDirForNote(noteId);
  await RNFS.mkdir(absFromRel(dirRel));

  const addedRels: string[] = [];
  for (const a of result.assets) {
    const src = a.uri; if (!src) continue;
    const ext = ensureExt(a.fileName);
    const outName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const rel = `${dirRel}/${outName}`;
    try {
      await RNFS.copyFile(src, absFromRel(rel));
      await addAsset(noteId, 'image', rel);
      addedRels.push(rel);
    } catch (e) { console.warn('[Attach] copy failed', src, e); }
  }
  return addedRels;
}

/** Back-compat: old API which just returns count. */
export async function pickImagesAndAttach(noteId: number): Promise<number> {
  const rels = await attachImagesAndReturnRels(noteId);
  return rels.length;
}

/** ===== Draft: pick images for draft and return relative paths ===== */
export async function pickImagesForDraft(draftKey: number | 'new'): Promise<string[]> {
  const perm = await ensureGalleryPermission();
  if (perm !== 'granted') throwByPerm(perm);

  const options: ImageLibraryOptions = { mediaType: 'photo', selectionLimit: 0, includeBase64: false };
  const result = await launchImageLibrary(options);
  if (result.didCancel || !result.assets || result.assets.length === 0) return [];

  const dirRel = relDirForDraft(draftKey);
  await RNFS.mkdir(absFromRel(dirRel));
  const added: string[] = [];

  for (const a of result.assets) {
    const src = a.uri; if (!src) continue;
    const ext = ensureExt(a.fileName);
    const outName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const rel = `${dirRel}/${outName}`;
    try {
      await RNFS.copyFile(src, absFromRel(rel));
      added.push(rel);
    } catch (e) { console.warn('[DraftAttach] copy failed', src, e); }
  }
  return added;
}

/** Move all draft images to the final note folder and create DB rows. */
export async function moveDraftAttachmentsToNote(draftKey: number | 'new', noteId: number): Promise<number> {
  const fromRel = relDirForDraft(draftKey);
  const fromAbs = absFromRel(fromRel);
  const toRelDir = relDirForNote(noteId);
  const toAbsDir = absFromRel(toRelDir);
  const exists = await RNFS.exists(fromAbs);
  if (!exists) return 0;
  await RNFS.mkdir(toAbsDir);

  const files = await RNFS.readDir(fromAbs);
  let ok = 0;
  for (const f of files) {
    if (!f.isFile()) continue;
    const toRel = `${toRelDir}/${f.name}`;
    try {
      await RNFS.moveFile(f.path, absFromRel(toRel));
      await addAsset(noteId, 'image', toRel);
      ok++;
    } catch (e) { console.warn('[DraftAttach] move failed', f.path, e); }
  }
  try { await RNFS.unlink(fromAbs); } catch {}
  return ok;
}

/** Delete a single draft image file. */
export async function removeDraftAttachment(relPath: string): Promise<void> {
  try {
    const abs = absFromRel(relPath);
    const exists = await RNFS.exists(abs);
    if (exists) await RNFS.unlink(abs);
  } catch (e) { console.warn('[DraftAttach] unlink failed', relPath, e); }
}

/** Remove entire draft attachments folder. */
export async function clearDraftAttachments(draftKey: number | 'new'): Promise<void> {
  const dir = absFromRel(relDirForDraft(draftKey));
  try { if (await RNFS.exists(dir)) await RNFS.unlink(dir); } catch {}
}

/** Remove both file and DB row for an existing note asset. */
export async function removeAssetFileAndRow(assetId: number, relPath: string): Promise<void> {
  try {
    const abs = absFromRel(relPath);
    const exists = await RNFS.exists(abs);
    if (exists) await RNFS.unlink(abs);
  } catch (e) {
    console.warn('[Attach] unlink failed', relPath, e);
  }
  await deleteAsset(assetId);
}

/** Rewrite HTML <img src="file:///.../attachments/_drafts/{key}/..."> to final note dir. */
export function rewriteDraftImageSrc(html: string, draftKey: number | 'new', noteId: number): string {
  if (!html) return html;
  const fromAbs = absFromRel(relDirForDraft(draftKey));
  const toAbs = absFromRel(relDirForNote(noteId));
  // Replace both file://absolute and absolute (safety)
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = html.replace(new RegExp(esc('file://' + fromAbs), 'g'), 'file://' + toAbs);
  out = out.replace(new RegExp(esc(fromAbs), 'g'), toAbs);
  return out;
}
