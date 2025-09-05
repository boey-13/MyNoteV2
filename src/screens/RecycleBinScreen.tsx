import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { deleteNotePermanent, listNotes, restoreNote } from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';

export default function RecycleBinScreen() {
  const { theme } = useAppTheme();
  const [deleted, setDeleted] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const all = await listNotes(true);
      setDeleted(all.filter(n => n.is_deleted === 1));
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load bin failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={{ flex: 1, padding: theme.spacing(4) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, marginBottom: theme.spacing(2) }}>
        Recycle Bin
      </Text>

      {deleted.map(n => (
        <View key={n.id} style={{ marginBottom: theme.spacing(2) }}>
          <NoteCard
            title={n.title}
            subtitle={n.content}
            onPress={() => setConfirm({ id: n.id })}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
            <CustomButton
              label="Restore"
              onPress={async () => {
                try { await restoreNote(n.id); await load(); }
                catch (e: any) { showToast.error(e?.message ?? 'Restore failed'); }
              }}
            />
            <CustomButton
              variant="outline"
              label="Delete Forever"
              onPress={() => setConfirm({ id: n.id })}
            />
          </View>
        </View>
      ))}

      <ConfirmDialog
        visible={!!confirm}
        title="Delete permanently?"
        message="This cannot be undone."
        danger
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          try { await deleteNotePermanent(confirm.id); await load(); }
          catch (e: any) { showToast.error(e?.message ?? 'Delete failed'); }
          finally { setConfirm(null); }
        }}
      />
    </ScrollView>
  );
}
