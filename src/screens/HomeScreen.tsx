// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, ScrollView as HScrollView, Pressable } from 'react-native';
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
    <ScrollView
      style={{ flex: 1, padding: theme.spacing(4) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing(3), marginBottom: theme.spacing(3) }}>
        <CustomButton label="New Note" onPress={() => navigation.navigate('EditNote')} />
        <CustomButton variant="outline" label="Export All Notes (JSON)" onPress={onExport} />
      </View>

      {/* Folders Row */}
      <View style={{ marginBottom: theme.spacing(3) }}>
        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, marginBottom: theme.spacing(2) }}>
          Folders
        </Text>
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
                style={{
                  paddingVertical: theme.spacing(2),
                  paddingHorizontal: theme.spacing(3),
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: isActive ? theme.colors.accent : theme.colors.border,
                  backgroundColor: isActive ? theme.colors.accent : 'transparent',
                  marginRight: theme.spacing(2),
                }}
              >
                <Text style={{
                  color: isActive ? '#fff' : theme.colors.text,
                  fontFamily: theme.fonts.semibold,
                }}>
                  {f.name}
                </Text>
              </Pressable>
            );
          })}
        </HScrollView>
      </View>

      {/* Favorite section moved to Favorites tab */}

      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, marginBottom: theme.spacing(2) }}>
        All Notes
      </Text>
      <View>
        {notes.map(n => (
          <NoteCard
            key={n.id}
            title={n.title}
            subtitle={n.content}
            favorite={!!n.is_favorite}
            onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
            onLongPress={() => navigation.navigate('EditNote', { noteId: n.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}
