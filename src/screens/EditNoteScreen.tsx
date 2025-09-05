// src/screens/EditNoteScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { createNote, getNote, updateNote } from '../db/notes';
import { showToast } from '../components/Toast';
import { clearDraft, loadDraft, saveDraft, NoteDraft } from '../utils/storage';
import {
  pickImagesAndAttach,
  pickImagesForDraft,
  moveDraftAttachmentsToNote,
  removeDraftAttachment,
  clearDraftAttachments,
  toImageUri,
} from '../utils/attachments';
import { listAssets, NoteAsset } from '../db/assets';
import ImageGrid from '../components/ImageGrid';

// Rich editor
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

type RouteParams = { noteId?: number };

export default function EditNoteScreen({ route, navigation }: any) {
  const params = (route?.params ?? {}) as RouteParams;
  const editingId = params.noteId;
  const isEditing = useMemo(() => !!editingId, [editingId]);

  const { theme } = useAppTheme();

  // form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // HTML string
  const [titleErr, setTitleErr] = useState<string | undefined>(undefined);

  // attachments state
  const [existingAssets, setExistingAssets] = useState<NoteAsset[]>([]);
  const [draftImages, setDraftImages] = useState<string[]>([]);

  // ui state
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // guards
  const bypassGuardRef = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmLeaveKeepDraft, setConfirmLeaveKeepDraft] = useState(false);
  const [confirmRemoveDraftImg, setConfirmRemoveDraftImg] = useState<string | null>(null);

  // timers/refs
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<RichEditor>(null);
  const programmaticSetRef = useRef(false); // avoid dirty when we set HTML programmatically

  // load note + draft on mount
  useEffect(() => {
    (async () => {
      let loadedTitle = '';
      let loadedContent = '';

      if (editingId) {
        const n = await getNote(editingId);
        if (n) {
          loadedTitle = n.title;
          loadedContent = n.content;
        }
        const a = await listAssets(editingId);
        setExistingAssets(a);
      }

      const draft = await loadDraft(editingId ?? 'new');
      if (draft) {
        loadedTitle = draft.title;
        loadedContent = draft.content;
        setDraftImages(draft.attachments ?? []);
        showToast.success('Draft restored');
      }

      setTitle(loadedTitle);
      setContent(loadedContent || '');

      // Ensure editor shows the loaded HTML but do not mark as dirty
      programmaticSetRef.current = true;
      setTimeout(() => {
        editorRef.current?.setContentHTML(loadedContent || '');
        // small delay to ensure the next onChange is not treated as user input
        setTimeout(() => (programmaticSetRef.current = false), 50);
      }, 0);
    })();
  }, [editingId]);

  // header title
  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Note' : 'New Note' });
  }, [navigation, isEditing]);

  // beforeRemove guard
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (bypassGuardRef.current) return;
      if (!dirty) return;
      e.preventDefault();
      setConfirmLeaveKeepDraft(true);
    });
    return unsub;
  }, [navigation, dirty]);

  function validate(): boolean {
    if (!title || title.trim().length < 2) {
      setTitleErr('Title must be at least 2 characters');
      return false;
    }
    setTitleErr(undefined);
    return true;
  }

  // autosave draft (title/content/attachments)
  useEffect(() => {
    if (!dirty) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draft: NoteDraft = {
        title,
        content,
        updated_at: new Date().toISOString(),
        attachments: draftImages,
      };
      saveDraft(editingId ?? 'new', draft).catch(() => {});
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, content, draftImages, dirty, editingId]);

  async function onSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing && editingId) {
        await updateNote(editingId, { title: title.trim(), content });
        showToast.success('Saved');
        setDirty(false);
        await clearDraft(editingId);
        bypassGuardRef.current = true;
        navigation.goBack();
      } else {
        const n = await createNote({ title: title.trim(), content });
        const moved = await moveDraftAttachmentsToNote('new', n.id);
        if (moved > 0) showToast.success(`Saved with ${moved} image(s)`);
        else showToast.success('Created');
        setDirty(false);
        await clearDraft('new');
        bypassGuardRef.current = true;
        navigation.replace('NoteDetails', { noteId: n.id });
      }
    } catch (e: any) {
      showToast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Cancel -> discard everything (text + draft images)
  function onCancel() {
    if (!dirty) {
      bypassGuardRef.current = true;
      navigation.goBack();
      return;
    }
    setConfirmDiscard(true);
  }

  async function onAddImage() {
    try {
      if (isEditing && editingId) {
        const added = await pickImagesAndAttach(editingId);
        if (added > 0) {
          const a = await listAssets(editingId);
          setExistingAssets(a);
          setDirty(true);
          showToast.success(`Attached ${added} image(s)`);
        }
      } else {
        const addedPaths = await pickImagesForDraft('new');
        if (addedPaths.length > 0) {
          setDraftImages(prev => [...addedPaths, ...prev]);
          setDirty(true);
          showToast.success(`Added ${addedPaths.length} image(s) to draft`);
        }
      }
    } catch (e: any) {
      if (e?.openSettings) {
        showToast.error('Permission blocked. Please enable Photos permission in Settings.');
      } else {
        showToast.error(e?.message ?? 'Attach failed');
      }
    }
  }

  // images to display: existing (edit mode) or draft (new mode)
  const gridItems = isEditing
    ? existingAssets.map(a => ({ id: a.id, uri: toImageUri(a.path) }))
    : draftImages.map((p, idx) => ({ id: -idx - 1, uri: toImageUri(p) })); // negative ids for draft images

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}
        keyboardShouldPersistTaps="handled"
      >
        <InputWithLabel
          label="Title"
          value={title}
          onChangeText={(t) => { setTitle(t); setDirty(true); }}
          placeholder="Enter a title"
          errorText={titleErr}
        />

        {/* === WYSIWYG toolbar === */}
        <RichToolbar
          editor={editorRef}
          actions={[
            actions.undo,
            actions.redo,
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.setStrikethrough,
            actions.insertOrderedList,
            actions.insertBulletsList,
            actions.heading1,
            actions.heading2,
            actions.heading3,
            actions.removeFormat,
          ]}
          iconTint={theme.colors.text}
          selectedIconTint={theme.colors.accent}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 2,
          }}
        />

        {/* === WYSIWYG editor === */}
        <View style={{
          borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
          overflow: 'hidden', backgroundColor: theme.colors.card,
        }}>
          <RichEditor
            ref={editorRef}
            initialHeight={220}
            initialContentHTML={content}
            placeholder="Write something..."
            editorStyle={{
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              contentCSSText: `
                font-family: ${theme.fonts.regular};
                line-height: 22px;
                padding: 12px;
              `,
              placeholderColor: theme.colors.mutedText,
            }}
            // Prevent marking dirty for programmatic setContentHTML on load
            onChange={(html: string) => {
              setContent(html);
              if (!programmaticSetRef.current) setDirty(true);
            }}
          />
        </View>

        {/* Attachment actions + preview */}
        <View style={{ gap: theme.spacing(2) }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
            <CustomButton variant="outline" label="Add Image" onPress={onAddImage} />
          </View>

          {gridItems.length > 0 && (
            <ImageGrid
              items={gridItems}
              onLongPress={(id) => {
                if (isEditing) {
                  // For existing assets, we keep deletion in details page.
                } else {
                  const idx = -id - 1;
                  const rel = draftImages[idx];
                  setConfirmRemoveDraftImg(rel);
                }
              }}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
          <CustomButton label="Save" onPress={onSave} loading={saving} />
          <CustomButton variant="outline" label="Cancel" onPress={onCancel} />
        </View>
      </ScrollView>

      {/* Back/gesture: Leave & keep draft (text + draft images) */}
      <ConfirmDialog
        visible={confirmLeaveKeepDraft}
        title="Leave without saving?"
        message="Your changes will be kept as a local draft and restored next time."
        cancelLabel="Keep Editing"
        confirmLabel="Leave"
        onCancel={() => setConfirmLeaveKeepDraft(false)}
        onConfirm={() => {
          setConfirmLeaveKeepDraft(false);
          bypassGuardRef.current = true;
          navigation.goBack();
        }}
      />

      {/* Page Cancel: Discard everything (text + draft images) */}
      <ConfirmDialog
        visible={confirmDiscard}
        danger
        title="Discard changes?"
        message="Unsaved changes and draft images will be removed."
        cancelLabel="Back"
        confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          setConfirmDiscard(false);
          await clearDraftAttachments(editingId ?? 'new');
          await clearDraft(editingId ?? 'new');
          bypassGuardRef.current = true;
          navigation.goBack();
        }}
      />

      {/* Remove one draft image */}
      <ConfirmDialog
        visible={!!confirmRemoveDraftImg}
        danger
        title="Remove this draft image?"
        message="This file will be deleted from local storage."
        confirmLabel="Delete"
        onCancel={() => setConfirmRemoveDraftImg(null)}
        onConfirm={async () => {
          if (!confirmRemoveDraftImg) return;
          const rel = confirmRemoveDraftImg;
          await removeDraftAttachment(rel);
          setDraftImages(prev => prev.filter(p => p !== rel));
          setDirty(true);
          setConfirmRemoveDraftImg(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
