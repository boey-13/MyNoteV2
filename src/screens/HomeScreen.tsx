import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listFavorites, listNotes } from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [favs, setFavs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [n, f] = await Promise.all([listNotes(false), listFavorites(5)]);
      setNotes(n);
      setFavs(f);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  return (
    <ScrollView
      style={{ flex: 1, padding: theme.spacing(4) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <CustomButton
        label="New Note"
        onPress={() => navigation.navigate('EditNote')}
        style={{ marginBottom: theme.spacing(3) }}
      />

      {favs.length > 0 && (
        <View style={{ marginBottom: theme.spacing(3) }}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, marginBottom: theme.spacing(2) }}>
            Favorite Notes
          </Text>
          {favs.map(n => (
            <NoteCard
              key={`fav-${n.id}`}
              title={n.title}
              subtitle={n.content}
              favorite
              onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
            />
          ))}
        </View>
      )}

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
