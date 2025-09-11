// src/screens/EditNoteScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, View, Text,
  Keyboard, InteractionManager, TextInput, StyleSheet, Dimensions,
  TouchableOpacity
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';
import { useAppTheme } from '../theme/ThemeProvider';
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
import { listFolders, getOrCreateFolderByName, updateFolder, deleteFolder } from '../db/folders';
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
  const [showManageFolders, setShowManageFolders] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ id: number; name: string } | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  
  // folder list scroll refs
  const folderListRef = useRef<ScrollView>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

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
  const scrollViewRef = useRef<ScrollView>(null);
  const programmaticSetRef = useRef(false); // avoid dirty when we set HTML programmatically

  // Content normalization utilities
  function normalizeEditorHtml(html?: string): string {
    if (!html) return '';
    return html
      .replace(/&nbsp;/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<p><br\s*\/?><\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .trim();
  }

  function isEditorContentEmpty(html?: string): boolean {
    if (!html) return true;

    if (/<(img|video|audio|iframe)\b/i.test(html)) return false;

    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
    return text.length === 0;
  }

  function hasMeaningfulChanges(): boolean {

    if (!dirty) {
      console.log('hasMeaningfulChanges: not dirty, returning false');
      return false;
    }
    
    const hasTitle = title.trim().length > 0;
    const hasContent = !isEditorContentEmpty(content);
    const hasImages = draftImages.length > 0;
    
    console.log('hasMeaningfulChanges debug:', {
      dirty,
      hasTitle,
      hasContent,
      hasImages,
      title: title.trim(),
      content: content.substring(0, 100),
      contentEmpty: isEditorContentEmpty(content)
    });
    
    return hasTitle || hasContent || hasImages;
  }

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
  async function loadFolderOptions(selected?: number | null | string) {
    const rows = await listFolders();
    const opts: FolderOpt[] = [
      { label: 'No folder', value: 'NULL' },
      ...rows.map(r => ({ label: r.name, value: r.id as number })),
      { label: '+ Add Folder', value: 'ADD_FOLDER' }
    ];
    setFolderOpts(opts);
    if (selected === 'NULL' || selected === 'ADD_FOLDER') {
      setFolderId(selected);
    } else {
      setFolderId(selected == null ? 'NULL' : (selected as number));
    }
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
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
      showToast.error('Failed to create folder', errorMessage);
    }
  }

  // Start editing folder
  function startEditFolder(folder: { id: number; name: string }) {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
  }

  // Save folder edit
  async function handleSaveFolderEdit() {
    if (!editingFolder || !editFolderName.trim()) return;
    
    try {
      await updateFolder(editingFolder.id, editFolderName.trim());
      await loadFolderOptions(folderId);
      setEditingFolder(null);
      setEditFolderName('');
      showToast.success(`Folder renamed to "${editFolderName.trim()}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
      showToast.error('Failed to rename folder', errorMessage);
    }
  }

  // Delete folder
  async function handleDeleteFolder(folderIdToDelete: number, folderName: string) {
    try {
      await deleteFolder(folderIdToDelete);
      await loadFolderOptions('NULL');
      setFolderId('NULL');
      setDirty(true);
      showToast.success(`Folder "${folderName}" deleted`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
      showToast.error('Failed to delete folder', errorMessage);
    }
  }

  // Scroll folder list functions
  const scrollFolderList = (direction: 'up' | 'down') => {
    if (folderListRef.current) {
      const scrollAmount = 60; // pixels to scroll
      folderListRef.current.scrollTo({
        y: direction === 'down' ? scrollAmount : -scrollAmount,
        animated: true
      });
    }
  };

  const checkScrollPosition = () => {
    if (folderListRef.current) {
      folderListRef.current.scrollTo({ y: 0, animated: false });
      folderListRef.current.scrollToEnd({ animated: false });
      // Reset scroll position
      folderListRef.current.scrollTo({ y: 0, animated: false });
    }
  };

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
      setContent(normalizeEditorHtml(loadedContent) || '');

      // Ensure editor shows the loaded HTML but do not mark as dirty
      programmaticSetRef.current = true;
      setTimeout(() => {
        const htmlContent = loadedContent && loadedContent.trim().length > 0 ? loadedContent : '<p><br></p>';
        editorRef.current?.setContentHTML(htmlContent);
        setTimeout(() => {
          programmaticSetRef.current = false;
          // Auto scroll to bottom of editor content after loading
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 300);
        }, 50);
      }, 0);
    })();
  }, [editingId]);



  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      console.log('beforeRemove triggered, bypassGuardRef.current =', bypassGuardRef.current);
      if (bypassGuardRef.current) return;
      

      const hasChanges = hasMeaningfulChanges();
      console.log('beforeRemove: hasMeaningfulChanges =', hasChanges);
      
      if (!hasChanges) {
        console.log('beforeRemove: no meaningful changes, going back directly');
        e.preventDefault();
        return releaseFocusThen(() => navigation.dispatch(e.data.action));
      }
      console.log('beforeRemove: has meaningful changes, showing keep draft dialog');
      e.preventDefault();
      setConfirmLeaveKeepDraft(true);
    });
    return unsub;
  }, [navigation]);

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
    if (!hasMeaningfulChanges()) {


      return;
    }
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
    const finalContent = isEditorContentEmpty(content) ? '' : content;
    try {
      if (isEditing && editingId) {
        await updateNote(editingId, { title: title.trim(), content: finalContent });
        await setNoteFolder(editingId, normalizedFolderId);
        showToast.success('Saved');
        setDirty(false);
        await clearDraft(editingId);
        bypassGuardRef.current = true;
        await releaseFocusThen(() => navigation.goBack());
      } else {
        const n = await createNote({ title: title.trim(), content: finalContent });
        await setNoteFolder(n.id, normalizedFolderId);
        await moveDraftAttachmentsToNote('new', n.id);
        const finalHtml = rewriteDraftImageSrc(finalContent, 'new', n.id);
        if (finalHtml !== finalContent) await updateNote(n.id, { content: finalHtml });
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
    console.log('onCancel called, checking if there is any content...');
    const hasTitle = title.trim().length > 0;
    const hasContent = !isEditorContentEmpty(content);
    const hasImages = draftImages.length > 0;
    const hasAnyContent = hasTitle || hasContent || hasImages;
    
    console.log('onCancel: hasTitle =', hasTitle, 'hasContent =', hasContent, 'hasImages =', hasImages, 'hasAnyContent =', hasAnyContent);
    
    if (!hasAnyContent) {
      console.log('onCancel: no content, going back directly');
      bypassGuardRef.current = true;
      return releaseFocusThen(() => navigation.goBack());
    }
    console.log('onCancel: has content, showing confirm dialog');
    setConfirmDiscard(true);
  }
  // Add images to draft
  async function onAddImage() {
    try {
      const paths = await pickImagesForDraft(editingId ?? 'new');
      if (paths.length > 0) {
        setDraftImages(prev => [...prev, ...paths]);
        setDirty(true);
        
        // Auto scroll to show the new attachments
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 200);
        
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
        
        // Auto scroll to the inserted content
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        showToast.success(`${paths.length} image(s) inserted`);
      }
    } catch (error) {
      showToast.error('Failed to insert images', error instanceof Error ? error.message : String(error));
    }
  }


  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
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
                onChangeText={(t) => {
                  setTitle(t);
                  if (t.trim() !== title.trim()) setDirty(true);
                }}
                placeholder="Enter a title"
                placeholderTextColor="#999"
              />
            </View>
            {titleErr && <Text style={styles.errorText}>{titleErr}</Text>}
          </View>

          {/* Folder Picker */}
          <View style={styles.section}>
            <View style={styles.folderHeader}>
              <Text style={styles.label}>Folder</Text>
              <TouchableOpacity 
                style={styles.manageFoldersButton}
                onPress={() => setShowManageFolders(true)}
              >
                <Icon name="settings" size={16} color="#455B96" />
                <Text style={styles.manageFoldersText}>Manage</Text>
              </TouchableOpacity>
            </View>
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

          {/* Manage Folders Dialog */}
          {showManageFolders && (
            <View style={styles.manageFoldersContainer}>
              <Text style={styles.manageFoldersTitle}>Manage Folders</Text>
              
              {/* Folder List with Scroll Controls */}
              <View style={styles.folderListContainer}>
                {/* Scroll Up Button */}
                <TouchableOpacity
                  style={[styles.scrollButton, styles.scrollUpButton]}
                  onPress={() => scrollFolderList('up')}
                >
                  <Icon name="chevron-up" size={20} color="#455B96" />
                </TouchableOpacity>
                
                {/* Folder List */}
                <ScrollView 
                  ref={folderListRef}
                  style={styles.folderList} 
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={checkScrollPosition}
                >
                  {folderOpts.filter(opt => opt.value !== 'NULL' && opt.value !== 'ADD_FOLDER').map(opt => (
                    <View key={opt.value} style={styles.folderItem}>
                      {editingFolder?.id === opt.value ? (
                        <View style={styles.folderEditContainer}>
                          <TextInput
                            style={styles.folderEditInput}
                            value={editFolderName}
                            onChangeText={setEditFolderName}
                            placeholder="Folder name"
                            placeholderTextColor="#999"
                            autoFocus
                          />
                          <View style={styles.folderEditButtons}>
                            <TouchableOpacity
                              style={styles.folderEditButton}
                              onPress={() => {
                                setEditingFolder(null);
                                setEditFolderName('');
                              }}
                            >
                              <Icon name="x" size={16} color="#666" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.folderEditButton}
                              onPress={handleSaveFolderEdit}
                              disabled={!editFolderName.trim()}
                            >
                              <Icon name="check" size={16} color={editFolderName.trim() ? "#455B96" : "#ccc"} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.folderItemContent}>
                          <Text style={styles.folderItemName}>{opt.label}</Text>
                          <View style={styles.folderItemActions}>
                            <TouchableOpacity
                              style={styles.folderActionButton}
                              onPress={() => startEditFolder({ id: opt.value as number, name: opt.label })}
                            >
                              <Icon name="edit-3" size={16} color="#455B96" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.folderActionButton}
                              onPress={() => handleDeleteFolder(opt.value as number, opt.label)}
                            >
                              <Icon name="trash-2" size={16} color="#E74C3C" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
                
                {/* Scroll Down Button */}
                <TouchableOpacity
                  style={[styles.scrollButton, styles.scrollDownButton]}
                  onPress={() => scrollFolderList('down')}
                >
                  <Icon name="chevron-down" size={20} color="#455B96" />
                </TouchableOpacity>
              </View>

              {/* Add New Folder Button */}
              <TouchableOpacity
                style={styles.addNewFolderButton}
                onPress={() => {
                  setShowManageFolders(false);
                  setShowAddFolder(true);
                }}
              >
                <Icon name="plus" size={16} color="#455B96" />
                <Text style={styles.addNewFolderText}>Add New Folder</Text>
              </TouchableOpacity>

              {/* Close Button */}
              <CustomButton
                label="Close"
                onPress={() => setShowManageFolders(false)}
                variant="outline"
                style={styles.closeManageButton}
              />
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
                iconTint="#999999"
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
                      <View style={styles.addWeatherButtonContent}>
                        <Icon name="file-text" size={16} color="#455B96" style={styles.addWeatherIcon} />
                        <Text style={styles.addWeatherButtonText}>
                          Add Weather to Note
                        </Text>
                      </View>
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
                  initialHeight={400}
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
                    const normalized = normalizeEditorHtml(html);
                    const wasEmpty = isEditorContentEmpty(content);
                    const nowEmpty = isEditorContentEmpty(normalized);
                    setContent(normalized);
                    if (!programmaticSetRef.current) {
                      if (!(wasEmpty && nowEmpty)) setDirty(true);
                    }
                  }}
                  onLoadEnd={() => {
                    // Force update content when editor loads
                    if (editorRef.current && content) {
                      programmaticSetRef.current = true;
                      editorRef.current.setContentHTML(content);
                      setTimeout(() => {
                        programmaticSetRef.current = false;
                        // Auto scroll to bottom after editor loads
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 200);
                      }, 100);
                    }
                  }}
                />
              )}
            </View>
          </View>


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
          releaseFocusThen(() => navigation.goBack());
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
    minHeight: 400,
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
  addWeatherButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addWeatherIcon: {
    marginRight: 8,
  },
  addWeatherButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  // Folder management styles
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manageFoldersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  manageFoldersText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#455B96',
    fontWeight: '500',
  },
  manageFoldersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    maxHeight: 400,
  },
  manageFoldersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  folderListContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  folderList: {
    maxHeight: 200,
    paddingHorizontal: 8,
  },
  scrollButton: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  scrollUpButton: {
    top: -8,
  },
  scrollDownButton: {
    bottom: -8,
  },
  folderItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  folderItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  folderItemName: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
    flex: 1,
  },
  folderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderActionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  folderEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  folderEditInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#455B96',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
  },
  folderEditButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderEditButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  addNewFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addNewFolderText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#455B96',
    fontWeight: '500',
  },
  closeManageButton: {
    width: '100%',
  },
});
