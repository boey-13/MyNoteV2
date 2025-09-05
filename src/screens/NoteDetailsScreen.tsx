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
import { getFolderById } from '../db/folders';

type RouteParams = { noteId: number };

export default function NoteDetailsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const { noteId } = route.params as RouteParams;
  const { width } = useWindowDimensions();

  const [note, setNote] = useState<any | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);


  const load = useCallback(async () => {
    const n = await getNote(noteId);
    setNote(n);
    if (n?.folder_id) {
      const f = await getFolderById(n.folder_id);
      setFolderName(f?.name ?? null);
    } else {
      setFolderName(null);
    }
  }, [noteId]);

  // Load note on mount
  useEffect(() => {
    load();
  }, [load]);

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
      {/* Header */}
      <View style={{ gap: theme.spacing(1) }}>
        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 24, color: theme.colors.text }}>
          {note.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
          {folderName !== null && (
            <View
              style={{
                paddingHorizontal: theme.spacing(2),
                paddingVertical: Math.max(4, Math.floor(theme.spacing(1))),
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ color: theme.colors.mutedText, fontFamily: theme.fonts.semibold }}>
                {folderName}
              </Text>
            </View>
          )}
          <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>
            Updated: {new Date(note.updated_at).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: theme.colors.border }} />

      {/* Content Card */}
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          padding: theme.spacing(3),
        }}
      >
        {!!note.content && (
          <RenderHTML
            contentWidth={width - theme.spacing(8) - theme.spacing(6)}
            source={{ html: note.content || '' }}
            baseStyle={{ color: theme.colors.text, fontFamily: theme.fonts.regular, fontSize: 18, lineHeight: 24 }}
            tagsStyles={tagsStyles as any}
          />
        )}
      </View>

      {/* Action Bar */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing(2),
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing(2),
        }}
      >
        <View style={{ flex: 1 }}>
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
        </View>
        <View style={{ flex: 1 }}>
          <CustomButton
            variant="outline"
            label="Edit"
            onPress={() => navigation.navigate('EditNote', { noteId })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CustomButton
            variant="ghost"
            label="Move to Bin"
            onPress={() => setConfirmTrash(true)}
          />
        </View>
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
