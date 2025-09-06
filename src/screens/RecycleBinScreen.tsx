// src/screens/RecycleBinScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
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
    try {
      await restoreNotes(Array.from(selected));
      showToast.success('Restored');
      setSelected(new Set());
      setSelectMode(false);
      await load();
    } catch (e: any) {
      showToast.error(e?.message ?? 'Restore failed');
    }
  }

  async function onDeleteSelected() {
    if (selected.size === 0) return;
    try {
      console.log('Attempting to delete notes:', Array.from(selected));
      await deleteNotesPermanent(Array.from(selected));
      console.log('Delete operation completed successfully');
      showToast.success('Deleted');
      setSelected(new Set());
      setSelectMode(false);
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
    <ScrollView
      style={{ flex: 1, padding: theme.spacing(4) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      {/* Top action bar */}
      <View style={{ flexDirection: 'row', gap: theme.spacing(2), marginBottom: theme.spacing(2) }}>
        {!selectMode ? (
          <>
            <CustomButton label="Select" onPress={() => setSelectMode(true)} />
            <CustomButton
              variant="outline"
              label="Empty Bin"
              onPress={() => setConfirmEmptyStep(1)}
            />
          </>
        ) : (
          <>
            <CustomButton
              label={allSelected ? 'Unselect All' : 'Select All'}
              onPress={() => {
                if (allSelected) setSelected(new Set());
                else setSelected(new Set(deleted.map(n => n.id)));
              }}
            />
            <CustomButton label={`Restore (${selectedCount})`} onPress={onRestoreSelected} />
            <CustomButton variant="outline" label={`Delete (${selectedCount})`} onPress={onDeleteSelected} />
            <CustomButton variant="ghost" label="Cancel" onPress={() => { setSelected(new Set()); setSelectMode(false); }} />
          </>
        )}
      </View>

      {/* List */}
      {deleted.length === 0 ? (
        <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>No deleted notes</Text>
      ) : (
        deleted.map(n => (
          <NoteCard
            key={n.id}
            title={n.title}
            subtitle={n.content}
            selectable={selectMode}
            selected={selected.has(n.id)}
            onToggleSelect={() => toggleOne(n.id)}
            onLongPress={() => setSelectMode(true)}
          />
        ))
      )}

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
    </ScrollView>
  );
}
