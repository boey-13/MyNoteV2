// src/screens/FavoritesScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listFavorites } from '../db/notes';
import NoteCard from '../components/NoteCard';
import { showToast } from '../components/Toast';

export default function FavoritesScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [favs, setFavs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const f = await listFavorites(1000);
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
      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, marginBottom: theme.spacing(2) }}>
        Favorite Notes
      </Text>
      {favs.length === 0 && (
        <View style={{ paddingVertical: theme.spacing(4) }}>
          <Text style={{ color: theme.colors.mutedText, fontFamily: theme.fonts.regular }}>
            No favorite notes yet.
          </Text>
        </View>
      )}
      <View>
        {favs.map(n => (
          <NoteCard
            key={`fav-${n.id}`}
            title={n.title}
            subtitle={n.content}
            favorite
            onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
            onLongPress={() => navigation.navigate('EditNote', { noteId: n.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}


