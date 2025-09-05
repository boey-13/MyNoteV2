// src/utils/storage.ts
// Async key-value helpers for recent searches and note drafts.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_RECENT = 'recent_searches';          // string[]
const KEY_DRAFT_PREFIX = 'draft:';             // draft:<id> | draft:new

export type NoteDraft = {
  title: string;
  content: string;
  updated_at: string; // ISO string
};

/* ========= Recent Searches ========= */

export async function getRecentSearches(limit = 10): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_RECENT);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
}

export async function addRecentSearch(q: string, limit = 10): Promise<void> {
  const term = q.trim();
  if (!term) return;
  const list = await getRecentSearches(limit * 2);
  const next = [term, ...list.filter(x => x.toLowerCase() !== term.toLowerCase())].slice(0, limit);
  await AsyncStorage.setItem(KEY_RECENT, JSON.stringify(next));
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY_RECENT);
}

/* ========= Note Drafts ========= */

function draftKey(id: number | 'new'): string {
  return `${KEY_DRAFT_PREFIX}${id}`;
}

export async function saveDraft(id: number | 'new', draft: NoteDraft): Promise<void> {
  await AsyncStorage.setItem(draftKey(id), JSON.stringify(draft));
}

export async function loadDraft(id: number | 'new'): Promise<NoteDraft | null> {
  const raw = await AsyncStorage.getItem(draftKey(id));
  return raw ? (JSON.parse(raw) as NoteDraft) : null;
}

export async function clearDraft(id: number | 'new'): Promise<void> {
  await AsyncStorage.removeItem(draftKey(id));
}
