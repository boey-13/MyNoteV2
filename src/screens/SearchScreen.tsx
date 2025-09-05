// src/screens/SearchScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import NoteCard from '../components/NoteCard';
import { listNotes, searchNotes, SearchOptions, SearchSort } from '../db/notes';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../utils/storage';
import { showToast } from '../components/Toast';
import { Picker } from '@react-native-picker/picker';
import { listFolders } from '../db/folders';

type FolderOpt = { label: string; value: number | 'ALL' | 'NULL' };

export default function SearchScreen({ navigation }: any) {
  const { theme } = useAppTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SearchSort>('updated_desc');
  const [folder, setFolder] = useState<FolderOpt['value']>('ALL');

  const [folderOpts, setFolderOpts] = useState<FolderOpt[]>([{ label: 'All folders', value: 'ALL' }]);
  const [recents, setRecents] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadFolders() {
    const rows = await listFolders();
    const opts: FolderOpt[] = [
      { label: 'All folders', value: 'ALL' },
      { label: 'No folder', value: 'NULL' },
      ...rows.map(r => ({ label: r.name, value: r.id as number })),
    ];
    setFolderOpts(opts);
  }

  async function loadRecents() {
    setRecents(await getRecentSearches(10));
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadFolders(), loadRecents()]);
      const latest = await listNotes(false);
      setResults(latest);
    })();
  }, []);

  const opts: SearchOptions = useMemo(() => {
    return {
      favoritesOnly,
      folderId: folder === 'ALL' ? undefined : folder === 'NULL' ? null : (folder as number),
      sort,
      includeDeleted: false,
    };
  }, [favoritesOnly, folder, sort]);

  const doSearch = useCallback(async (q: string, options: SearchOptions) => {
    setLoading(true);
    try {
      const rows = await searchNotes(q, options);
      setResults(rows);
    } catch (e: any) {
      console.error('[Search] failed', e);
      showToast.error(e?.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { doSearch(query, opts); }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, opts, doSearch]);

  async function onSubmit() {
    await addRecentSearch(query);
    await loadRecents();
    Keyboard.dismiss();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}>
        {/* Search bar */}
        <View style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          borderWidth: 1, borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(2),
        }}>
          <TextInput
            placeholder="Search by title or content"
            placeholderTextColor={theme.colors.mutedText}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSubmit}
            style={{ fontFamily: theme.fonts.regular, color: theme.colors.text, paddingVertical: theme.spacing(2) }}
          />
        </View>

        {/* Filters */}
        <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.fonts.semibold, marginBottom: theme.spacing(1) }}>Folder</Text>
            <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.card }}>
              <Picker selectedValue={folder} onValueChange={(v) => setFolder(v)} dropdownIconColor={theme.colors.mutedText}>
                {folderOpts.map(opt => (<Picker.Item key={`${opt.label}-${opt.value}`} label={opt.label} value={opt.value} />))}
              </Picker>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.fonts.semibold, marginBottom: theme.spacing(1) }}>Sort</Text>
            <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.card }}>
              <Picker selectedValue={sort} onValueChange={(v) => setSort(v)} dropdownIconColor={theme.colors.mutedText}>
                <Picker.Item label="Updated (newest)" value="updated_desc" />
                <Picker.Item label="Title (A→Z)" value="title_asc" />
                <Picker.Item label="Favorite first" value="favorite_first" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Favorite-only chip */}
        <Pressable
          onPress={() => setFavoritesOnly(v => !v)}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: theme.spacing(3), paddingVertical: theme.spacing(2),
            borderRadius: theme.radius.md, borderWidth: 1,
            borderColor: favoritesOnly ? theme.colors.accent : theme.colors.border,
            backgroundColor: favoritesOnly ? theme.colors.accent : 'transparent',
          }}
        >
          <Text style={{ color: favoritesOnly ? '#fff' : theme.colors.text, fontFamily: theme.fonts.semibold }}>
            {favoritesOnly ? '★ Favorites only' : '☆ Favorites only'}
          </Text>
        </Pressable>

        {/* Recent searches */}
        {recents.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing(2) }}>
              <Text style={{ fontFamily: theme.fonts.semibold }}>Recent searches</Text>
              <Pressable onPress={async () => { await clearRecentSearches(); await loadRecents(); }}>
                <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>Clear</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
              {recents.map((r, i) => (
                <Pressable
                  key={`${r}-${i}`}
                  onPress={() => setQuery(r)}
                  style={{
                    borderWidth: 1, borderColor: theme.colors.border,
                    paddingHorizontal: theme.spacing(3), paddingVertical: theme.spacing(2),
                    borderRadius: theme.radius.md, backgroundColor: theme.colors.card,
                  }}
                >
                  <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.text }}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Results */}
        <View style={{ marginTop: theme.spacing(1) }}>
          {loading ? (
            <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>Searching…</Text>
          ) : results.length === 0 ? (
            <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>No results</Text>
          ) : (
            results.map(n => (
              <NoteCard
                key={n.id}
                title={n.title}
                subtitle={n.content}
                favorite={!!n.is_favorite}
                onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
                onLongPress={() => navigation.navigate('EditNote', { noteId: n.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
