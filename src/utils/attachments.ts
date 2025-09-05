// src/utils/attachments.ts
// Pick images from gallery, copy into app's private folder, and store a DB record.
// Also supports "draft attachments" for new notes before they have an id.

import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import { addAsset, deleteAsset } from '../db/assets';

export const ATTACH_ROOT_REL = '/attachments';         // base folder under DocumentDirectoryPath
const DRAFTS_SUB = '/_drafts';                          // attachments/_drafts/<draftKey>

function relDirForNote(noteId: number) { return `${ATTACH_ROOT_REL}/${noteId}`; }
function relDirForDraft(draftKey: number | 'new') { return `${ATTACH_ROOT_REL}${DRAFTS_SUB}/${draftKey}`; }
function absFromRel(rel: string) { return `${RNFS.DocumentDirectoryPath}${rel}`; }

function ensureExt(name?: string | null) {
  if (!name) return 'jpg';
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'jpg';
  return name.slice(dot + 1).toLowerCase() || 'jpg';
}

async function ensureGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = Number(Platform.constants?.Release || 33);
  const perm = sdk >= 13
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const res = await PermissionsAndroid.request(perm);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

/** ===== For existing note (has id) ===== */
export async function pickImagesAndAttach(noteId: number): Promise<number> {
  const granted = await ensureGalleryPermission();
  if (!granted) throw new Error('Gallery permission denied');

  const options: ImageLibraryOptions = { mediaType: 'photo', selectionLimit: 0, includeBase64: false };
  const result = await launchImageLibrary(options);
  if (result.didCancel || !result.assets || result.assets.length === 0) return 0;

  const dirRel = relDirForNote(noteId);
  await RNFS.mkdir(absFromRel(dirRel));

  let ok = 0;
  for (const a of result.assets) {
    const src = a.uri; if (!src) continue;
    const ext = ensureExt(a.fileName);
    const outName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const rel = `${dirRel}/${outName}`;
    try {
      await RNFS.copyFile(src, absFromRel(rel));
      await addAsset(noteId, 'image', rel);
      ok++;
    } catch (e) { console.warn('[Attach] copy failed', src, e); }
  }
  return ok;
}

/** ===== For draft (new note, no id yet) ===== */
export async function pickImagesForDraft(draftKey: number | 'new'): Promise<string[]> {
  const granted = await ensureGalleryPermission();
  if (!granted) throw new Error('Gallery permission denied');

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
  // clean draft dir
  try { await RNFS.unlink(fromAbs); } catch {}
  return ok;
}

/** Delete a single draft image file (by relative path). */
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

/** Resolve a relative path to URI for <Image>. */
export function toImageUri(relPath: string): string {
  return 'file://' + absFromRel(relPath);
}
