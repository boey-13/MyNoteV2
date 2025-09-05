// src/screens/NoteDetailsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { getNote, softDeleteNote, toggleFavorite } from '../db/notes';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';
import { useFocusEffect } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';

type RouteParams = { noteId: number };

export default function NoteDetailsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const { noteId } = route.params as RouteParams;
  const { width } = useWindowDimensions();

  const [note, setNote] = useState<any | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);


  const load = useCallback(async () => {
    const n = await getNote(noteId);
    setNote(n);
  }, [noteId]);

  // Set header and do initial load
  useEffect(() => {
    navigation.setOptions({ title: 'Note' });
    load();
  }, [navigation, load]);

  // Reload when screen regains focus (e.g., after adding/removing images)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!note) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }


  const tagsStyles = {
    p: { marginVertical: 6, fontSize: 18, lineHeight: 24 },
    h1: { fontSize: 30, fontWeight: '700', marginVertical: 12 },
    h2: { fontSize: 26, fontWeight: '700', marginVertical: 10 },
    h3: { fontSize: 22, fontWeight: '700', marginVertical: 8 },
    b: { fontWeight: '700' },
    strong: { fontWeight: '700' },
    i: { fontStyle: 'italic' },
    em: { fontStyle: 'italic' },
  } as const;

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}>
      {/* Title & meta */}
      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 20 }}>{note.title}</Text>
      <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>
        Updated: {new Date(note.updated_at).toLocaleString()}
      </Text>

      {/* Content (rich HTML) */}
      {!!note.content && (
        <RenderHTML
          contentWidth={width - theme.spacing(8)}
          source={{ html: note.content || '' }}
          baseStyle={{ color: theme.colors.text, fontFamily: theme.fonts.regular, fontSize: 18, lineHeight: 24 }}
          tagsStyles={tagsStyles as any}
        />
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3), marginTop: theme.spacing(2) }}>
        <CustomButton
          label={note.is_favorite ? 'Unfavorite' : 'Favorite'}
          onPress={async () => {
            try {
              await toggleFavorite(note.id, !note.is_favorite);
              await load();
            } catch (e: any) {
              showToast.error(e?.message ?? 'Toggle favorite failed');
            }
          }}
        />
        <CustomButton variant="outline" label="Edit" onPress={() => navigation.navigate('EditNote', { noteId })} />
        <CustomButton variant="ghost" label="Move to Bin" onPress={() => setConfirmTrash(true)} />
      </View>


      {/* Confirm move to bin */}
      <ConfirmDialog
        visible={confirmTrash}
        title="Move this note to Recycle Bin?"
        message="You can restore it later from Recycle Bin."
        onCancel={() => setConfirmTrash(false)}
        onConfirm={async () => {
          try {
            await softDeleteNote(note.id);
            setConfirmTrash(false);
            showToast.success('Moved to bin');
            navigation.navigate('Tabs', { screen: 'Recycle' });
          } catch (e: any) {
            showToast.error(e?.message ?? 'Delete failed');
          }
        }}
      />
    </ScrollView>
  );
}
