// src/screens/NoteDetailsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, useWindowDimensions, StyleSheet, Dimensions, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditNote', { noteId })}
          >
            <Icon name="edit-3" size={24} color="#455B96" style={styles.actionButtonIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setConfirmTrash(true)}
          >
            <Icon name="trash-2" size={24} color="#DC3545" style={styles.actionButtonIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={async () => {
              try {
                await toggleFavorite(note.id, !note.is_favorite);
                await load();
              } catch (e: any) {
                showToast.error(e?.message ?? 'Toggle favorite failed');
              }
            }}
          >
            <Icon 
              name={note.is_favorite ? "star" : "star"} 
              size={24} 
              color={note.is_favorite ? "#FFD700" : "#CCCCCC"} 
              style={styles.actionButtonIcon}
              solid={note.is_favorite}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.noteTitle}>{note.title}</Text>
          <View style={styles.metaInfo}>
            {folderName !== null && (
              <View style={styles.folderChip}>
                <Icon name="folder" size={16} color="#455B96" style={styles.folderIcon} />
                <Text style={styles.folderChipText}>{folderName}</Text>
              </View>
            )}
            <Text style={styles.updateTime}>
              {new Date(note.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {(() => {
            const content = note.content;
            if (!content || content.trim() === '') {
              return <Text style={styles.noteContent}>No content</Text>;
            }
            
            const trimmed = content.trim();
            if (!trimmed.startsWith('<')) {
              // Plain text content, display directly
              return <Text style={styles.noteContent}>{trimmed}</Text>;
            }
            
            // HTML content, use RenderHTML
            return (
              <RenderHTML
                contentWidth={width - 40}
                source={{ html: trimmed }}
                baseStyle={{ 
                  color: '#2C3E50', 
                  fontFamily: 'Poppins-Regular', 
                  fontSize: 16, 
                  lineHeight: 26 
                }}
                tagsStyles={tagsStyles as any}
              />
            );
          })()}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  actionButtonIcon: {
    // fontSize removed for Icon component
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 20,
  },
  noteTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
    textAlign: 'left',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  folderChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    marginRight: 4,
  },
  folderChipText: {
    color: '#2980B9',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  updateTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  scrollContainer: {
    flex: 1,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  noteContent: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 26,
    fontFamily: 'Poppins-Regular',
  },
});
