// src/screens/EditNoteScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, View, Text,
  Keyboard, InteractionManager, TextInput, StyleSheet, Dimensions,
  TouchableOpacity
} from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import InputWithLabel from '../components/InputWithLabel';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { createNote, getNote, updateNote, setNoteFolder } from '../db/notes';
import { showToast } from '../components/Toast';
import { clearDraft, loadDraft, saveDraft, NoteDraft } from '../utils/storage';
import {
  attachImagesAndReturnRels, pickImagesAndAttach, pickImagesForDraft,
  moveDraftAttachmentsToNote, removeDraftAttachment, clearDraftAttachments,
  toImageUri, rewriteDraftImageSrc,
} from '../utils/attachments';
import { listAssets, NoteAsset } from '../db/assets';
import { listFolders, getOrCreateFolderByName } from '../db/folders';
import ImageGrid from '../components/ImageGrid';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import WeatherWidget from '../components/WeatherWidget';
import { WeatherData } from '../utils/weatherApi';

type RouteParams = { noteId?: number };
type FolderOpt = { label: string; value: number | 'NULL' | 'ADD_FOLDER' };

export default function EditNoteScreen({ route, navigation }: any) {
  const params = (route?.params ?? {}) as RouteParams;
  const editingId = params.noteId;
  const isEditing = useMemo(() => !!editingId, [editingId]);
  const { theme } = useAppTheme();
  const isFocused = useIsFocused();

  // Set dynamic header title based on editing mode
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Note' : 'Create Note',
    });
  }, [navigation, isEditing]);

  // form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // HTML string
  const [titleErr, setTitleErr] = useState<string | undefined>(undefined);

  // folder state
  const [folderOpts, setFolderOpts] = useState<FolderOpt[]>([{ label: 'No folder', value: 'NULL' }]);
  const [folderId, setFolderId] = useState<FolderOpt['value']>('NULL');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // attachments state
  const [existingAssets, setExistingAssets] = useState<NoteAsset[]>([]);
  const [draftImages, setDraftImages] = useState<string[]>([]);

  // ui state
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  
  // weather state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherCity, setWeatherCity] = useState('London');

  // guards
  const bypassGuardRef = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmLeaveKeepDraft, setConfirmLeaveKeepDraft] = useState(false);
  const [confirmRemoveDraftImg, setConfirmRemoveDraftImg] = useState<string | null>(null);

  // timers/refs
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<RichEditor>(null);
  const titleRef = useRef<TextInput>(null);
  const programmaticSetRef = useRef(false); // avoid dirty when we set HTML programmatically

  const richWebViewProps = useMemo(
    () => ({
      originWhitelist: ['*'],
      allowFileAccess: true,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true,
    }),
    []
  );

  // Release focus before navigating (fix Android IME NPE)
  async function releaseFocusThen(cb: () => void) {
    setNavigating(true);
    try { titleRef.current?.blur?.(); } catch {}
    try { editorRef.current?.blurContentEditor?.(); } catch {}
    Keyboard.dismiss();
    await new Promise<void>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 400);
      const sub = Keyboard.addListener('keyboardDidHide', () => {
        if (!settled) { settled = true; clearTimeout(timer); sub.remove(); resolve(); }
      });
    });
    await new Promise(res => setTimeout(res, 40));
    await new Promise(res => InteractionManager.runAfterInteractions(() => res(null)));
    cb();
  }

  // Load folders for picker
  async function loadFolderOptions(selected?: number | null) {
    const rows = await listFolders();
    const opts: FolderOpt[] = [
      { label: 'No folder', value: 'NULL' },
      ...rows.map(r => ({ label: r.name, value: r.id as number })),
      { label: '+ Add Folder', value: 'ADD_FOLDER' }
    ];
    setFolderOpts(opts);
    setFolderId(selected == null ? 'NULL' : (selected as number));
  }

  // Handle folder picker change
  async function handleFolderChange(value: any) {
    if (value === 'ADD_FOLDER') {
      setShowAddFolder(true);
      return;
    }
    setFolderId(value);
    setDirty(true);
  }

  // Create new folder
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    
    try {
      const folder = await getOrCreateFolderByName(newFolderName.trim());
      await loadFolderOptions(folder.id);
      setFolderId(folder.id);
      setDirty(true);
      setShowAddFolder(false);
      setNewFolderName('');
      showToast.success(`Folder "${folder.name}" created`);
    } catch (error) {
      showToast.error('Failed to create folder', error instanceof Error ? error.message : String(error));
    }
  }

  // load note + draft on mount
  useEffect(() => {
    (async () => {
      let loadedTitle = '';
      let loadedContent = '';
      let loadedFolderId: number | null = null;

      if (editingId) {
        const n = await getNote(editingId);
        if (n) {
          loadedTitle = n.title;
          loadedContent = n.content;
          loadedFolderId = n.folder_id ?? null;
        }
        const a = await listAssets(editingId);
        setExistingAssets(a);
      }

      const draft = await loadDraft(editingId ?? 'new');
      if (draft) {
        loadedTitle = draft.title;
        loadedContent = draft.content;
        // draft does not override folder; keep note's current folder
        setDraftImages(draft.attachments ?? []);
        showToast.success('Draft restored');
      }

      await loadFolderOptions(loadedFolderId);

      setTitle(loadedTitle);
      setContent(loadedContent || '<p><br></p>');

      // Ensure editor shows the loaded HTML but do not mark as dirty
      programmaticSetRef.current = true;
      setTimeout(() => {
        const htmlContent = loadedContent && loadedContent.trim().length > 0 ? loadedContent : '<p><br></p>';
        editorRef.current?.setContentHTML(htmlContent);
        setTimeout(() => (programmaticSetRef.current = false), 50);
      }, 0);
    })();
  }, [editingId]);



  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (bypassGuardRef.current) return;
      
      if (!dirty) return;
      

      e.preventDefault();
      setConfirmLeaveKeepDraft(true);
    });
    return unsub;
  }, [navigation, dirty]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        try { titleRef.current?.blur?.(); } catch {}
        try { editorRef.current?.blurContentEditor?.(); } catch {}
        Keyboard.dismiss();
      };
    }, [])
  );

  function validate(): boolean {
    if (!title || title.trim().length < 2) {
      setTitleErr('Title must be at least 2 characters');
      return false;
    }
    setTitleErr(undefined);
    return true;
  }

  // Weather functions
  const handleWeatherData = (weather: WeatherData) => {
    setWeatherData(weather);
  };

  const handleCityChange = (city: string) => {
    setWeatherCity(city);
  };

  // Force update editor content immediately
  const updateEditorContent = (newContent: string) => {
    setContent(newContent);
    setDirty(true);
    
    if (editorRef.current) {
      programmaticSetRef.current = true;
      editorRef.current.setContentHTML(newContent);
      setTimeout(() => {
        programmaticSetRef.current = false;
      }, 100);
    }
  };

  const insertWeatherToNote = () => {
    if (!weatherData) return;
    
    const weatherText = `\n\n🌤️ Weather Update (${new Date().toLocaleString()}):\n` +
      `📍 ${weatherData.city}, ${weatherData.country}\n` +
      `🌡️ ${weatherData.temperature}°C\n` +
      `☁️ ${weatherData.description}\n` +
      `💧 Humidity: ${weatherData.humidity}%\n` +
      `💨 Wind: ${weatherData.windSpeed} m/s\n\n`;
    
    const newContent = content + weatherText;
    updateEditorContent(newContent);
    showToast.success('Weather added to note!');
  };

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
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [title, content, draftImages, dirty, editingId]);

  async function onSave() {
    if (!validate()) return;
    setSaving(true);
    const normalizedFolderId = folderId === 'NULL' ? null : (folderId as number);
    try {
      if (isEditing && editingId) {
        await updateNote(editingId, { title: title.trim(), content });
        await setNoteFolder(editingId, normalizedFolderId);
        showToast.success('Saved');
        setDirty(false);
        await clearDraft(editingId);
        bypassGuardRef.current = true;
        await releaseFocusThen(() => navigation.goBack());
      } else {
        const n = await createNote({ title: title.trim(), content });
        await setNoteFolder(n.id, normalizedFolderId);
        await moveDraftAttachmentsToNote('new', n.id);
        const finalHtml = rewriteDraftImageSrc(content, 'new', n.id);
        if (finalHtml !== content) await updateNote(n.id, { content: finalHtml });
        showToast.success('Created');
        setDirty(false);
        await clearDraft('new');
        bypassGuardRef.current = true;
        await releaseFocusThen(() => navigation.replace('NoteDetails', { noteId: n.id }));
      }
    } catch (e: any) {
      showToast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    if (!dirty) {
      bypassGuardRef.current = true;
      navigation.goBack();
      return;
    }
    setConfirmDiscard(true);
  }
  // Add images to draft
  async function onAddImage() {
    try {
      const paths = await pickImagesForDraft(editingId ?? 'new');
      if (paths.length > 0) {
        setDraftImages(prev => [...prev, ...paths]);
        setDirty(true);
        showToast.success(`${paths.length} image(s) added`);
      }
    } catch (error) {
      showToast.error('Failed to add images', error instanceof Error ? error.message : String(error));
    }
  }

  // Insert images into editor
  async function onInsertInlineImage() {
    try {
      const paths = await pickImagesForDraft(editingId ?? 'new');
      if (paths.length > 0) {
        // Add to draft images list
        setDraftImages(prev => [...prev, ...paths]);
        
        // Insert images into editor
        const imageHtml = paths.map(path => {
          const uri = toImageUri(path);
          return `<img src="${uri}" class="img-default" />`;
        }).join('');
        
        editorRef.current?.insertHTML(imageHtml);
        setDirty(true);
        showToast.success(`${paths.length} image(s) inserted`);
      }
    } catch (error) {
      showToast.error('Failed to insert images', error instanceof Error ? error.message : String(error));
    }
  }

  const gridItems = isEditing
    ? existingAssets.map(a => ({ id: a.id, uri: toImageUri(a.path) }))
    : draftImages.map((p, idx) => ({ id: -idx - 1, uri: toImageUri(p) }));

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
        >
          {/* Header Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isEditing ? 'Edit Note' : 'Create Note'}
            </Text>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleRef}
                style={styles.titleInput}
                value={title}
                onChangeText={(t) => { setTitle(t); setDirty(true); }}
                placeholder="Enter a title"
                placeholderTextColor="#999"
              />
            </View>
            {titleErr && <Text style={styles.errorText}>{titleErr}</Text>}
          </View>

          {/* Folder Picker */}
          <View style={styles.section}>
            <Text style={styles.label}>Folder</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={folderId}
                onValueChange={handleFolderChange}
                style={styles.picker}
              >
                {folderOpts.map(opt => (
                  <Picker.Item key={`${opt.label}-${opt.value}`} label={opt.label} value={opt.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Add Folder Dialog */}
          {showAddFolder && (
            <View style={styles.addFolderContainer}>
              <Text style={styles.addFolderTitle}>Create New Folder</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.folderInput}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="Folder name"
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>
              <View style={styles.addFolderButtons}>
                <CustomButton
                  label="Cancel"
                  onPress={() => {
                    setShowAddFolder(false);
                    setNewFolderName('');
                  }}
                  variant="outline"
                  style={styles.addFolderButton}
                />
                <CustomButton
                  label="Create"
                  onPress={handleCreateFolder}
                  style={styles.addFolderButton}
                  disabled={!newFolderName.trim()}
                />
              </View>
            </View>
          )}

          {/* Toolbar */}
          <View style={styles.section}>
            <Text style={styles.label}>Content</Text>
            <View style={styles.toolbarContainer}>
              <RichToolbar
                pointerEvents={navigating ? 'none' : 'auto'}
                editor={editorRef}
                actions={[
                  actions.undo, actions.redo,
                  actions.setBold, actions.setItalic, actions.setUnderline, actions.setStrikethrough,
                  actions.insertOrderedList, actions.insertBulletsList,
                  actions.heading1, actions.heading2, actions.heading3,
                  actions.insertImage, actions.removeFormat,
                ]}
                onPressAddImage={onInsertInlineImage}
                iconMap={{
                  [actions.heading1]: () => <Text style={styles.toolbarIcon}>H1</Text>,
                  [actions.heading2]: () => <Text style={styles.toolbarIcon}>H2</Text>,
                  [actions.heading3]: () => <Text style={styles.toolbarIcon}>H3</Text>,
                }}
                iconTint="#455B96"
                selectedIconTint="#455B96"
                style={styles.toolbar}
              />
            </View>
          </View>

          {/* Weather Widget */}
          <View style={styles.section}>
            <View style={styles.weatherSection}>
              <View style={styles.weatherHeader}>
                <Text style={styles.label}>Weather</Text>
                <TouchableOpacity
                  onPress={() => setShowWeather(!showWeather)}
                  style={styles.weatherToggle}
                >
                  <Text style={styles.weatherToggleText}>
                    {showWeather ? 'Hide' : 'Show'} Weather
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showWeather && (
                <View style={styles.weatherContainer}>
                  <WeatherWidget
                    city={weatherCity}
                    onWeatherData={handleWeatherData}
                    onCityChange={handleCityChange}
                    style={styles.weatherWidget}
                  />
                  {weatherData && (
                    <TouchableOpacity
                      onPress={insertWeatherToNote}
                      style={styles.addWeatherButton}
                    >
                      <Text style={styles.addWeatherButtonText}>
                        📝 Add Weather to Note
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Editor */}
          <View style={styles.section}>
            <View style={styles.editorContainer} pointerEvents={navigating ? 'none' : 'auto'}>
              {isFocused && !navigating && (
                <RichEditor
                  ref={editorRef}
                  initialHeight={220}
                  initialContentHTML={content || '<p><br></p>'}
                  placeholder="Write something..."
                  editorStyle={{
                    backgroundColor: '#FFFFFF',
                    color: '#333',
                    contentCSSText: `
                      font-family: 'Poppins-Regular';
                      line-height: 22px;
                      padding: 12px;
                      img { max-width: 100%; height: auto; display: block; }
                      .img-default { width: 60%; margin: 8px auto; }
                    `,
                    placeholderColor: '#999',
                  }}
                  {...(richWebViewProps as any)}
                  onChange={(html: string) => {
                    setContent(html);
                    if (!programmaticSetRef.current) setDirty(true);
                  }}
                  onLoadEnd={() => {
                    // Force update content when editor loads
                    if (editorRef.current && content) {
                      programmaticSetRef.current = true;
                      editorRef.current.setContentHTML(content);
                      setTimeout(() => {
                        programmaticSetRef.current = false;
                      }, 100);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Image Grid */}
          {gridItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Attachments</Text>
              <ImageGrid
                items={gridItems}
                onLongPress={(id) => {
                  if (!isEditing) {
                    const idx = -id - 1;
                    const rel = draftImages[idx];
                    setConfirmRemoveDraftImg(rel);
                  }
                }}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <CustomButton 
              label="Save" 
              onPress={onSave} 
              loading={saving}
              style={styles.saveButton}
            />
            <CustomButton 
              variant="outline" 
              label="Cancel" 
              onPress={onCancel}
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Leave keep draft */}
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

      {/* Discard all */}
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
          await releaseFocusThen(() => navigation.goBack());
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
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, 
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  titleInput: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Poppins-Regular',
  },
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
  },
  picker: {
    color: '#333',
  },
  addFolderContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginTop: 10,
  },
  addFolderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  folderInput: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  addFolderButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  addFolderButton: {
    flex: 1,
  },
  toolbarContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: '#F8F9FA',
    borderWidth: 0,
    paddingVertical: 8,
  },
  toolbarIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#455B96',
  },
  editorContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
    minHeight: 220,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    marginBottom: 20, // Ensure space at button bottom
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#455B96',
    minHeight: 48, // Ensure button has minimum height
  },
  cancelButton: {
    flex: 1,
    minHeight: 48, // Ensure button has minimum height
  },
  // Weather styles
  weatherSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 15,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherToggle: {
    backgroundColor: '#455B96',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  weatherToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  weatherContainer: {
    gap: 10,
  },
  weatherWidget: {
    marginVertical: 0,
  },
  addWeatherButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addWeatherButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});
