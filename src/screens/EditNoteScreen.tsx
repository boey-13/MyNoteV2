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

type RouteParams = { noteId?: number };

export default function EditNoteScreen({ route, navigation }: any) {
  const params = (route?.params ?? {}) as RouteParams;
  const editingId = params.noteId;
  const isEditing = useMemo(() => !!editingId, [editingId]);

  const { theme } = useAppTheme();

  // form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [titleErr, setTitleErr] = useState<string | undefined>(undefined);

  // ui state
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // guard controls
  const bypassGuardRef = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false); // Cancel button -> discard & leave
  const [confirmLeaveKeepDraft, setConfirmLeaveKeepDraft] = useState(false); // Back/gesture -> leave & keep draft

  // debounce timer for autosave draft
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load note + draft on mount
  useEffect(() => {
    (async () => {
      let loadedTitle = '';
      let loadedContent = '';

      if (editingId) {
        const n = await getNote(editingId);
        if (n) { loadedTitle = n.title; loadedContent = n.content; }
      }

      const draft = await loadDraft(editingId ?? 'new');
      if (draft) {
        loadedTitle = draft.title;
        loadedContent = draft.content;
        showToast.success('Draft restored');
      }

      setTitle(loadedTitle);
      setContent(loadedContent);
    })();
  }, [editingId]);

  // header title
  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Note' : 'New Note' });
  }, [navigation, isEditing]);

  // beforeRemove guard:
  // - If user tries to leave with unsaved changes -> ask to "Leave & keep draft"
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (bypassGuardRef.current) return;      // allow explicit navigations
      if (!dirty) return;                      // nothing changed -> allow
      e.preventDefault();
      setConfirmLeaveKeepDraft(true);          // show "leave & keep draft" prompt
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

  // autosave draft (debounced 500ms after any change)
  useEffect(() => {
    if (!dirty) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draft: NoteDraft = { title, content, updated_at: new Date().toISOString() };
      saveDraft(editingId ?? 'new', draft).catch(() => {});
    }, 500);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [title, content, dirty, editingId]);

  async function onSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing && editingId) {
        await updateNote(editingId, { title: title.trim(), content });
        showToast.success('Saved');
        setDirty(false);
        await clearDraft(editingId);           // clear draft on successful save
        bypassGuardRef.current = true;
        navigation.goBack();
      } else {
        const n = await createNote({ title: title.trim(), content });
        showToast.success('Created');
        setDirty(false);
        await clearDraft('new');               // clear new-note draft
        bypassGuardRef.current = true;
        navigation.replace('NoteDetails', { noteId: n.id });
      }
    } catch (e: any) {
      showToast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Page "Cancel" button -> ask to discard & leave (draft will be removed)
  function onCancel() {
    if (!dirty) {
      bypassGuardRef.current = true;
      navigation.goBack();
      return;
    }
    setConfirmDiscard(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}>
        <InputWithLabel
          label="Title"
          value={title}
          onChangeText={(t) => { setTitle(t); setDirty(true); }}
          placeholder="Enter a title"
          errorText={titleErr}
        />

        <InputWithLabel
          label="Content"
          value={content}
          onChangeText={(t) => { setContent(t); setDirty(true); }}
          placeholder="Write something..."
          multiline
          style={{ height: 240, textAlignVertical: 'top' }}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
          <CustomButton label="Save" onPress={onSave} loading={saving} />
          <CustomButton variant="outline" label="Cancel" onPress={onCancel} />
        </View>
      </ScrollView>

      {/* Back/gesture: Leave & keep draft (for autosave/restore demo) */}
      <ConfirmDialog
        visible={confirmLeaveKeepDraft}
        title="Leave without saving?"
        message="Your changes will be kept as a local draft and restored next time."
        cancelLabel="Keep Editing"
        confirmLabel="Leave"
        onCancel={() => setConfirmLeaveKeepDraft(false)}
        onConfirm={() => {
          setConfirmLeaveKeepDraft(false);
          // Do NOT clear draft here; allow leaving and keep the draft
          bypassGuardRef.current = true;
          navigation.goBack();
        }}
      />

      {/* Page Cancel: Discard & leave (remove draft) */}
      <ConfirmDialog
        visible={confirmDiscard}
        danger
        title="Discard changes?"
        message="Unsaved changes and draft will be removed."
        cancelLabel="Back"
        confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          setConfirmDiscard(false);
          await clearDraft(editingId ?? 'new');  // explicitly remove draft
          bypassGuardRef.current = true;
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}
