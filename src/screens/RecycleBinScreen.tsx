// src/screens/RecycleBinScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import {
  deleteNotesPermanent,
  emptyRecycleBin,
  listDeleted,
  restoreNotes,
} from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';
import { useFocusEffect } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';

const stripImages = (html: string) => html.replace(/<img[\s\S]*?>/gi, '');

const renderPreview = (raw?: string) => {
  const html = (raw ?? '').trim();
  if (!html) return <Text style={{color:'#666'}}>No content</Text>;

  // Plain text
  if (!html.startsWith('<')) {
    return <Text numberOfLines={3} style={{color:'#666', lineHeight:20}}>{html}</Text>;
  }

  const safe = stripImages(html).trim();
  if (!safe) return <Text style={{color:'#666'}}>(image only)</Text>;

  return (
    <RenderHtml
      contentWidth={200}
      source={{ html: safe }}
      tagsStyles={{
        p: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        div:{ margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        span: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        strong: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontWeight:'bold' },
        em: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontStyle:'italic' },
        h1: { margin:0, padding:0, fontSize:16, color:'#666', lineHeight:20, fontWeight:'bold' },
        h2: { margin:0, padding:0, fontSize:15, color:'#666', lineHeight:20, fontWeight:'bold' },
        h3: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontWeight:'bold' },
        ul: { margin:0, padding:0 },
        ol: { margin:0, padding:0 },
        li: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
      }}
      renderersProps={{ 
        text: { numberOfLines: 3 },
        p: { numberOfLines: 3 },
        div: { numberOfLines: 3 },
        span: { numberOfLines: 3 },
      }}
      renderers={{
        text: ({ TDefaultRenderer, ...props }: any) => (
          <Text numberOfLines={3} style={{color:'#666', fontSize:14, lineHeight:20}}>
            {props.children}
          </Text>
        ),
      }}
    />
  );
};

export default function RecycleBinScreen() {
  const { theme } = useAppTheme();
  const [deleted, setDeleted] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectedCount = selected.size;


  // Double-confirm for Empty Bin
  // 0 = hidden, 1 = first confirm, 2 = final confirm
  const [confirmEmptyStep, setConfirmEmptyStep] = useState<0 | 1 | 2>(0);
  
  // Confirmation dialogs for restore and delete
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const rows = await listDeleted();
      setDeleted(rows);
      // Keep selection only for still-existing ids
      setSelected(prev => {
        const next = new Set<number>();
        rows.forEach(n => { if (prev.has(n.id)) next.add(n.id); });
        return next;
      });
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load bin failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Run once on mount (useful after hot reload)
  useEffect(() => { load(); }, [load]);

  // Auto-reload whenever this tab gains focus
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const allSelected = useMemo(
    () => deleted.length > 0 && selectedCount === deleted.length,
    [deleted.length, selectedCount]
  );

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onRestoreSelected() {
    if (selected.size === 0) return;
    setConfirmRestore(true);
  }

  async function confirmRestoreAction() {
    try {
      await restoreNotes(Array.from(selected));
      showToast.success('Restored');
      setSelected(new Set());
      setSelectMode(false);
      setConfirmRestore(false);
      await load();
    } catch (e: any) {
      showToast.error(e?.message ?? 'Restore failed');
    }
  }

  async function onDeleteSelected() {
    if (selected.size === 0) return;
    setConfirmDelete(true);
  }

  async function confirmDeleteAction() {
    try {
      console.log('Attempting to delete notes:', Array.from(selected));
      await deleteNotesPermanent(Array.from(selected));
      console.log('Delete operation completed successfully');
      showToast.success('Deleted');
      setSelected(new Set());
      setSelectMode(false);
      setConfirmDelete(false);
      await load();
    } catch (e: any) {
      console.error('Delete operation failed:', e);
      showToast.error(e?.message ?? 'Delete failed');
    }
  }

  async function onEmptyBin() {
    try {
      await emptyRecycleBin();
      showToast.success('Bin emptied');
      setSelected(new Set());
      setSelectMode(false);
      await load();
    } catch (e: any) {
      showToast.error(e?.message ?? 'Empty bin failed');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        {/* Header Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recycle Bin</Text>
          <Text style={styles.sectionSubtitle}>
            {deleted.length} deleted note{deleted.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {!selectMode ? (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setSelectMode(true)}
              >
                <Text style={styles.actionButtonText}>Select Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.dangerButton]}
                onPress={() => setConfirmEmptyStep(1)}
              >
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Empty Bin</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectionActions}>
              <TouchableOpacity 
                style={styles.selectionButton}
                onPress={() => {
                  if (allSelected) setSelected(new Set());
                  else setSelected(new Set(deleted.map(n => n.id)));
                }}
              >
                <Text style={styles.selectionButtonText}>
                  {allSelected ? 'Unselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.selectionRow}>
                <TouchableOpacity 
                  style={[styles.selectionActionButton, styles.restoreButton]}
                  onPress={onRestoreSelected}
                >
                  <Text style={styles.selectionActionButtonText}>Restore ({selectedCount})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.selectionActionButton, styles.deleteButton]}
                  onPress={onDeleteSelected}
                >
                  <Text style={styles.selectionActionButtonText}>Delete ({selectedCount})</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => { setSelected(new Set()); setSelectMode(false); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notes Grid */}
        <View style={styles.section}>
          {deleted.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trash-2" size={48} color="#CCCCCC" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No deleted notes</Text>
              <Text style={styles.emptySubtext}>Deleted notes will appear here</Text>
            </View>
          ) : (
            <View style={styles.notesGrid}>
              {deleted.map(n => (
                <TouchableOpacity 
                  key={n.id} 
                  style={[
                    styles.noteCard,
                    selectMode && selected.has(n.id) && styles.selectedNoteCard
                  ]}
                  onPress={() => selectMode ? toggleOne(n.id) : undefined}
                  onLongPress={() => setSelectMode(true)}
                >
                  {selectMode && (
                    <View style={styles.selectionIndicator}>
                      <Text style={styles.selectionIcon}>
                        {selected.has(n.id) ? '✓' : '○'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.noteTitle} numberOfLines={2}>{n.title || 'Untitled'}</Text>
                  <View style={styles.noteContentContainer}>
                    {renderPreview(n.content)}
                  </View>
                  <Text style={styles.deletedDate}>
                    Deleted: {new Date(n.deleted_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Double-confirm dialogs for Empty Bin */}
      <ConfirmDialog
        visible={confirmEmptyStep === 1}
        danger
        title="Empty Recycle Bin?"
        message="This will permanently delete all notes in the bin."
        cancelLabel="Cancel"
        confirmLabel="Continue"
        onCancel={() => setConfirmEmptyStep(0)}
        onConfirm={() => setConfirmEmptyStep(2)}
      />
      <ConfirmDialog
        visible={confirmEmptyStep === 2}
        danger
        title="Are you absolutely sure?"
        message="This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete All"
        onCancel={() => setConfirmEmptyStep(0)}
        onConfirm={async () => { setConfirmEmptyStep(0); await onEmptyBin(); }}
      />

      {/* Confirmation dialog for Restore */}
      <ConfirmDialog
        visible={confirmRestore}
        title="Restore Selected Notes?"
        message={`Are you sure you want to restore ${selectedCount} note${selectedCount !== 1 ? 's' : ''}?`}
        cancelLabel="Cancel"
        confirmLabel="Restore"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={confirmRestoreAction}
      />

      {/* Confirmation dialog for Delete */}
      <ConfirmDialog
        visible={confirmDelete}
        danger
        title="Permanently Delete Selected Notes?"
        message={`Are you sure you want to permanently delete ${selectedCount} note${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteAction}
      />
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
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  actionSection: {
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#455B96',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  dangerButton: {
    backgroundColor: '#DC3545',
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  selectionActions: {
    gap: 15,
  },
  selectionButton: {
    backgroundColor: '#E8EDF7',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionButtonText: {
    color: '#455B96',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectionActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  restoreButton: {
    backgroundColor: '#28A745',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 15,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
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
    minHeight: 140,
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
  selectedNoteCard: {
    backgroundColor: '#E8EDF7',
    borderColor: '#455B96',
    borderWidth: 2,
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
  },
  selectionIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 8,
  },
  noteContentContainer: {
    maxHeight: 60, 
    overflow: 'hidden',
    marginBottom: 8,
  },
  deletedDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
  },
});
