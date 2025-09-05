// src/screens/EditNoteScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { createNote, getNote, updateNote } from '../db/notes';
import { showToast } from '../components/Toast';

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
  const [confirmBack, setConfirmBack] = useState(false);

  // bypass flag: allow navigation after explicit actions (save or confirm discard)
  const bypassGuardRef = useRef(false);

  // load note when editing
  useEffect(() => {
    if (!editingId) return;
    getNote(editingId).then(n => {
      if (n) {
        setTitle(n.title);
        setContent(n.content);
      }
    });
  }, [editingId]);

  // set header title
  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Note' : 'New Note' });
  }, [navigation, isEditing]);

  // guard leaving the screen when there are unsaved changes
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      // If we explicitly allow (after a successful save or confirmed discard), let it pass
      if (bypassGuardRef.current) return;

      // If nothing changed, allow leaving
      if (!dirty) return;

      // Otherwise block and show confirm dialog
      e.preventDefault();
      setConfirmBack(true);
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

  async function onSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing && editingId) {
        await updateNote(editingId, { title: title.trim(), content });
        showToast.success('Saved');
        // mark clean and bypass the guard before navigating back
        setDirty(false);
        bypassGuardRef.current = true;
        navigation.goBack();
      } else {
        const n = await createNote({ title: title.trim(), content });
        showToast.success('Created');
        // navigate to details; bypass to avoid the guard firing during replace
        setDirty(false);
        bypassGuardRef.current = true;
        navigation.replace('NoteDetails', { noteId: n.id });
      }
    } catch (e: any) {
      showToast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    // pressing Cancel will trigger the guard; we simply request back navigation
    // the guard will show the confirm dialog due to `dirty`
    navigation.goBack();
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

      <ConfirmDialog
        visible={confirmBack}
        title="Discard changes?"
        message="Unsaved changes will be lost."
        onCancel={() => setConfirmBack(false)}
        onConfirm={() => {
          // user confirmed to discard; allow navigation and go back
          setConfirmBack(false);
          bypassGuardRef.current = true;
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}
