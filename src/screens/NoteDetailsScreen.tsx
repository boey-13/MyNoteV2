// src/screens/NoteDetailsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { getNote, softDeleteNote, toggleFavorite } from '../db/notes';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';
import { listAssets, NoteAsset } from '../db/assets';
import { pickImagesAndAttach, removeAssetFileAndRow, toImageUri } from '../utils/attachments';
import ImageGrid from '../components/ImageGrid';
import { useFocusEffect } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';

type RouteParams = { noteId: number };

export default function NoteDetailsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const { noteId } = route.params as RouteParams;
  const { width } = useWindowDimensions();

  const [note, setNote] = useState<any | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);

  const [assets, setAssets] = useState<NoteAsset[]>([]);
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<NoteAsset | null>(null);

  const load = useCallback(async () => {
    const n = await getNote(noteId);
    setNote(n);
    const a = await listAssets(noteId);
    setAssets(a);
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

  const gridItems = assets.map(a => ({ id: a.id, uri: toImageUri(a.path) }));

  const tagsStyles = {
    p: { marginVertical: 4 },
    h1: { fontSize: 24, fontWeight: '700', marginVertical: 8 },
    h2: { fontSize: 20, fontWeight: '700', marginVertical: 8 },
    h3: { fontSize: 18, fontWeight: '700', marginVertical: 6 },
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
          baseStyle={{ color: theme.colors.text, fontFamily: theme.fonts.regular }}
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
        <CustomButton
          variant="outline"
          label="Add Image"
          onPress={async () => {
            try {
              const added = await pickImagesAndAttach(note.id);
              if (added > 0) {
                showToast.success(`Attached ${added} image(s)`);
                await load();
              }
            } catch (e: any) {
              showToast.error(e?.message ?? 'Attach failed');
            }
          }}
        />
      </View>

      {/* Attachments */}
      {assets.length > 0 && (
        <View style={{ gap: theme.spacing(2) }}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 16 }}>Attachments</Text>
          <ImageGrid
            items={gridItems}
            onPress={(id) => {
              const a = assets.find(x => x.id === id);
              if (!a) return;
              navigation.navigate('ImageViewer', { relPath: a.path, title: 'Attachment' });
            }}
            onLongPress={(id) => {
              const a = assets.find(x => x.id === id);
              if (a) setConfirmDeleteAsset(a);
            }}
          />
        </View>
      )}

      {/* Confirm delete attachment */}
      <ConfirmDialog
        visible={!!confirmDeleteAsset}
        danger
        title="Remove this image?"
        message="The file will be deleted permanently."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteAsset(null)}
        onConfirm={async () => {
          if (!confirmDeleteAsset) return;
          try {
            await removeAssetFileAndRow(confirmDeleteAsset.id, confirmDeleteAsset.path);
            setConfirmDeleteAsset(null);
            await load();
          } catch (e: any) {
            showToast.error(e?.message ?? 'Remove failed');
          }
        }}
      />

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
