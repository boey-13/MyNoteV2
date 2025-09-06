// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, ScrollView as HScrollView, Pressable, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listFavorites, listNotes, listNotesByFolder } from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { exportAllToJson } from '../utils/exporter';
import { listFolders } from '../db/folders';


export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [favs, setFavs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<'ALL' | 'NULL' | number>('ALL');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [fs, f] = await Promise.all([listFolders(), listFavorites(5)]);
      setFolders(fs);
      // load notes for current filter
      let n = [] as any[];
      if (selectedFolder === 'ALL') {
        n = await listNotes(false);
      } else if (selectedFolder === 'NULL') {
        n = await listNotesByFolder(null);
      } else {
        n = await listNotesByFolder(selectedFolder as number);
      }
      setNotes(n);
      setFavs(f);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load failed');
    } finally {
      setRefreshing(false);
    }
  }, [selectedFolder]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  // Reload notes immediately when folder selection changes
  useEffect(() => {
    load();
  }, [selectedFolder, load]);

  async function onExport() {
    try {
      const { path, bytes } = await exportAllToJson();
      showToast.success(`Exported ${Math.round(bytes / 1024)} KB`);
      console.log('[Export] saved at:', path);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Export failed');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton} onPress={onExport}>
          <Text style={styles.exportButtonText}>EXPORT (JSON)</Text>
        </TouchableOpacity>

        {/* Folder Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Folder</Text>
          <HScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: theme.spacing(2) }}
          >
              {[{ id: -1, name: 'All' } as any, { id: -2, name: 'No folder' } as any, ...folders].map((f) => {
                const value: 'ALL' | 'NULL' | number = f.id === -1 ? 'ALL' : f.id === -2 ? 'NULL' : f.id;
                const isActive = selectedFolder === value;
                return (
                  <Pressable
                    key={`folder-chip-${f.id}`}
                    onPress={() => setSelectedFolder(value)}
                    style={[
                      styles.folderChip,
                      isActive && styles.folderChipActive
                    ]}
                  >
                    <Text style={[
                      styles.folderChipText,
                      isActive && styles.folderChipTextActive
                    ]}>
                      {f.name}
                    </Text>
                  </Pressable>
                );
              })}
            </HScrollView>
        </View>

        {/* All Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Note</Text>
          <View style={styles.notesGrid}>
            {notes.map(n => (
              <TouchableOpacity 
                key={n.id} 
                style={styles.noteCard}
                onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
              >
                <Text style={styles.noteTitle} numberOfLines={2}>{n.title || 'Untitled'}</Text>
                <Text style={styles.noteContent} numberOfLines={3}>{n.content || 'No content'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('EditNote')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  exportButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#455B96',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 8,
    marginTop: 40, // 为export按钮留空间
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  folderPlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    minHeight: 80,
    justifyContent: 'center',
  },
  folderChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
    marginRight: 10,
  },
  folderChipActive: {
    backgroundColor: '#455B96',
    borderColor: '#455B96',
  },
  folderChipText: {
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  folderChipTextActive: {
    color: '#FFFFFF',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noteCard: {
    width: (width - 60) / 2, // 2列布局，减去padding
    backgroundColor: '#F8F9FA', // 很浅的灰色背景
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    minHeight: 120,
    // 悬浮效果
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // 轻微边框
    borderWidth: 1,
    borderColor: '#E9ECEF',
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#455B96',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
