import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { getNote, softDeleteNote, toggleFavorite } from '../db/notes';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';

type RouteParams = { noteId: number };

export default function NoteDetailsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const { noteId } = route.params as RouteParams;
  const [note, setNote] = useState<any | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);

  async function load() {
    const n = await getNote(noteId);
    setNote(n);
  }

  useEffect(() => {
    navigation.setOptions({ title: 'Note' });
    load();
  }, [noteId]);

  if (!note) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}>
      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 20 }}>{note.title}</Text>
      <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>
        Updated: {new Date(note.updated_at).toLocaleString()}
      </Text>
      <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.text }}>{note.content}</Text>

      <View style={{ flexDirection: 'row', gap: theme.spacing(3), marginTop: theme.spacing(2) }}>
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
        <CustomButton
          variant="outline"
          label="Edit"
          onPress={() => navigation.navigate('EditNote', { noteId })}
        />
        <CustomButton
          variant="ghost"
          label="Move to Bin"
          onPress={() => setConfirmTrash(true)}
        />
      </View>

      <ConfirmDialog
        visible={confirmTrash}
        title="Move this note to Recycle Bin?"
        message="You can restore it later from Recycle Bin."
        onCancel={() => setConfirmTrash(false)}
        onConfirm={async () => {
          try {
            await softDeleteNote(note.id);
            showToast.success('Moved to bin');
            navigation.goBack();
          } catch (e: any) {
            showToast.error(e?.message ?? 'Delete failed');
          }
        }}
      />
    </ScrollView>
  );
}
