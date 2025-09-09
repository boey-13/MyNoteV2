// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, ScrollView as HScrollView, Pressable, StyleSheet, Dimensions, Image, TouchableOpacity, Alert } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';
import { listFavorites, listNotes, listNotesByFolder, softDeleteNote } from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';
import { exportAllToJson } from '../utils/exporter';
import { listFolders } from '../db/folders';
import RenderHtml from 'react-native-render-html';

// Remove image tags from HTML to avoid file service errors during preview
const stripImages = (html: string) => html.replace(/<img[\s\S]*?>/gi, '');

// Safe preview content rendering - completely avoid RenderHtml
const renderPreview = (raw?: string) => {
  const html = (raw ?? '').trim();
  
  if (!html) return <Text style={{color:'#666'}}>No content</Text>;

  // Plain text
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

export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [favs, setFavs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<'ALL' | 'NULL' | number>('ALL');
  
  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());


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
      showToast.success('Exported ' + Math.round(bytes / 1024) + ' KB');
      console.log('[Export] saved at:', path);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Export failed');
    }
  }

  // Selection functions
  const toggleNoteSelection = (noteId: number) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const selectAllNotes = () => {
    setSelectedNotes(new Set(notes.map(note => note.id)));
  };

  const clearSelection = () => {
    setSelectedNotes(new Set());
    setIsSelectionMode(false);
  };

  const handleLongPress = (noteId: number) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    toggleNoteSelection(noteId);
  };

  const handleNotePress = (noteId: number) => {
    if (isSelectionMode) {
      toggleNoteSelection(noteId);
    } else {
      navigation.navigate('NoteDetails', { noteId });
    }
  };

  const moveSelectedToBin = () => {
    if (selectedNotes.size === 0) return;

    Alert.alert(
      'Move to Recycle Bin',
      `Are you sure you want to move ${selectedNotes.size} note(s) to the recycle bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Move', 
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedNotes).map(noteId => 
                softDeleteNote(noteId)
              );
              await Promise.all(deletePromises);
              
              showToast.success(`Moved ${selectedNotes.size} note(s) to recycle bin`);
              clearSelection();
              load(); // Refresh the notes list
            } catch (e: any) {
              showToast.error('Failed to move notes: ' + (e?.message || 'Unknown error'));
            }
          }
        }
      ]
    );
  };

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Note</Text>
            {isSelectionMode && (
              <View style={styles.selectionActions}>
                <TouchableOpacity 
                  style={styles.selectionButton} 
                  onPress={selectedNotes.size === notes.length ? clearSelection : selectAllNotes}
                >
                  <Text style={styles.selectionButtonText}>
                    {selectedNotes.size === notes.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                
                {selectedNotes.size > 0 && (
                  <TouchableOpacity 
                    style={[styles.selectionButton, styles.deleteButton]} 
                    onPress={moveSelectedToBin}
                  >
                    <Text style={[styles.selectionButtonText, styles.deleteButtonText]}>
                      Move to Bin ({selectedNotes.size})
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.selectionButton, styles.cancelButton]} 
                  onPress={clearSelection}
                >
                  <Text style={[styles.selectionButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.notesGrid}>
            {notes.length === 0 ? (
              <View style={styles.emptyNotesContainer}>
                <Icon name="edit-3" size={48} color="#CCCCCC" style={styles.emptyNotesIcon} />
                <Text style={styles.emptyNotesTitle}>No notes yet</Text>
                <Text style={styles.emptyNotesSubtitle}>
                  Tap the + button below to create your first note
                </Text>
                <Text style={styles.emptyNotesHint}>
                  You can add weather, images, and organize notes into folders
                </Text>
              </View>
            ) : (
              notes.map(n => {
                const isSelected = selectedNotes.has(n.id);
                return (
                  <TouchableOpacity 
                    key={n.id} 
                    style={[
                      styles.noteCard,
                      isSelected && styles.selectedNoteCard,
                      isSelectionMode && styles.selectionModeCard
                    ]}
                    onPress={() => handleNotePress(n.id)}
                    onLongPress={() => handleLongPress(n.id)}
                    delayLongPress={500}
                  >
                    {isSelectionMode && (
                      <View style={styles.selectionIndicator}>
                        <Text style={styles.selectionCheckbox}>
                          {isSelected ? '✓' : '○'}
                        </Text>
                      </View>
                    )}
                    
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
                );
              })
            )}
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
    marginTop: 40, 
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
    width: (width - 60) / 2, 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    minHeight: 120,
    // Floating effect
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Subtle border
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
    paddingRight: 30,
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  noteContentContainer: {
    maxHeight: 60, // Limit height, equivalent to 3 lines of text
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
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
  selectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  selectionButton: {
    backgroundColor: '#455B96',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#455B96',
  },
  selectionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    borderColor: '#6C757D',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
  selectedNoteCard: {
    backgroundColor: '#E8EDF7',
    borderColor: '#455B96',
    borderWidth: 2,
  },
  selectionModeCard: {
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#455B96',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  selectionCheckbox: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyNotesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyNotesIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyNotesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyNotesSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyNotesHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
