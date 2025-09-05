import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listNotes } from '../db/notes';
import NoteCard from '../components/NoteCard';
import CustomButton from '../components/CustomButton';
import { showToast } from '../components/Toast';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listNotes(false); // not deleted
      setNotes(data);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load notes failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
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
