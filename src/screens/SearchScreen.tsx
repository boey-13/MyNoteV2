// src/screens/SearchScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listNotes, searchNotes, SearchOptions, SearchSort } from '../db/notes';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../utils/storage';
import { showToast } from '../components/Toast';
import { Picker } from '@react-native-picker/picker';
import { listFolders } from '../db/folders';
import { startRealtime, stopRealtime } from '../utils/realtime';
import io from 'socket.io-client';
import { getCurrentUserId } from '../utils/session';

type FolderOpt = { label: string; value: number | 'ALL' | 'NULL' };

const stripImages = (html: string) => html.replace(/<img[\s\S]*?>/gi, '');


const renderPreview = (raw?: string) => {
  const html = (raw ?? '').trim();
  
  if (!html) return <Text style={{color:'#666'}}>No content</Text>;


  if (!html.startsWith('<')) {
    return <Text numberOfLines={3} style={{color:'#666', lineHeight:20}}>{html}</Text>;
  }


  const safe = stripImages(html).trim();
  if (!safe) return <Text style={{color:'#666'}}>(image only)</Text>;


  try {
    const textContent = safe.replace(/<[^>]*>/g, '').trim();
    if (textContent) {
      return <Text numberOfLines={3} style={{color:'#666', lineHeight:20}}>{textContent}</Text>;
    } else {
      return <Text style={{color:'#666'}}>(image only)</Text>;
    }
  } catch (e) {
    console.log('Error extracting text content:', e);
    return <Text style={{color:'#666'}}>Error loading content</Text>;
  }
};

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

  // Start WebSocket for real-time updates
  useEffect(() => {
    let socket: any = null;
    
    const setupWebSocket = async () => {
      const uid = (await getCurrentUserId()) ?? 1;
      const WS_URL = __DEV__ ? 'http://localhost:5000' : 'http://10.0.2.2:5000';
      
      socket = io(WS_URL, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        query: { user: String(uid) },
      });

      socket.on('connect', () => {
        console.log('🔌 SearchScreen WebSocket connected');
      });

      socket.on('note_created', (data: any) => {
        console.log('📝 Note created, refreshing search results:', data);
        setTimeout(() => {
          doSearch(query, opts);
        }, 100);
      });

      socket.on('note_updated', (data: any) => {
        console.log('📝 Note updated, refreshing search results:', data);
        setTimeout(() => {
          doSearch(query, opts);
        }, 100);
      });

      socket.on('note_deleted', (data: any) => {
        console.log('🗑️ Note deleted, refreshing search results:', data);
        setTimeout(() => {
          doSearch(query, opts);
        }, 100);
      });
    };

    setupWebSocket();

    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
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

  // Refresh search results when notes change
  const refreshSearchResults = useCallback(async () => {
    console.log('🔄 Refreshing search results due to note changes...');
    try {
      const rows = await searchNotes(query, opts);
      setResults(rows);
    } catch (e: any) {
      console.error('[Search] refresh failed', e);
    }
  }, [query, opts]);

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
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content}>
          {/* Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Notes</Text>
            
            {/* Search bar */}
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search by title or content..."
                placeholderTextColor="#999"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSubmit}
                style={styles.searchInput}
              />
            </View>

            {/* Recent searches */}
            {recents.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Recent searches</Text>
                  <TouchableOpacity onPress={async () => { await clearRecentSearches(); await loadRecents(); }}>
                    <Text style={styles.clearButton}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
                  {recents.map((r, i) => (
                    <TouchableOpacity
                      key={`${r}-${i}`}
                      onPress={() => setQuery(r)}
                      style={styles.recentChip}
                    >
                      <Text style={styles.recentChipText}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
              <Pressable
                onPress={() => setFavoritesOnly(v => !v)}
                style={[
                  styles.filterChip,
                  favoritesOnly && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  favoritesOnly && styles.filterChipTextActive
                ]}>
                  {favoritesOnly ? '★ Favorites only' : '☆ Favorites only'}
                </Text>
              </Pressable>
            </View>

            {/* Advanced Filters */}
            <View style={styles.advancedFilters}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Folder</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={folder} onValueChange={(v) => setFolder(v)}>
                    {folderOpts.map(opt => (
                      <Picker.Item key={`${opt.label}-${opt.value}`} label={opt.label} value={opt.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Sort</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={sort} onValueChange={(v) => setSort(v)}>
                    <Picker.Item label="Updated (newest)" value="updated_desc" />
                    <Picker.Item label="Title (A→Z)" value="title_asc" />
                    <Picker.Item label="Favorite first" value="favorite_first" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Results Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Searching...</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={styles.notesGrid}>
                {results.map(n => (
                  <TouchableOpacity 
                    key={n.id} 
                    style={styles.noteCard}
                    onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
                  >
                    <Text style={styles.noteTitle} numberOfLines={2}>
                      {n.title || 'Untitled'}
                    </Text>
                    <View style={styles.noteContentContainer}>
                      {renderPreview(n.content)}
                    </View>
                    {n.is_favorite ? (
                      <View style={styles.favoriteIndicator}>
                        <Text style={styles.favoriteIcon}>★</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  searchContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#455B96',
    borderColor: '#455B96',
  },
  filterChipText: {
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  advancedFilters: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  recentSection: {
    marginBottom: 15,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
  },
  clearButton: {
    fontSize: 14,
    color: '#455B96',
    fontFamily: 'Poppins-SemiBold',
  },
  recentScroll: {
    flexDirection: 'row',
  },
  recentChip: {
    backgroundColor: '#E8EDF7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 12,
    color: '#455B96',
    fontFamily: 'Poppins-SemiBold',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontFamily: 'Poppins-Regular',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noteCard: {
    width: (width - 60) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    position: 'relative',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  noteContentContainer: {
    maxHeight: 60, 
    overflow: 'hidden',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
});
