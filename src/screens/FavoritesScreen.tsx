// src/screens/FavoritesScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { listFavorites } from '../db/notes';
import NoteCard from '../components/NoteCard';
import { showToast } from '../components/Toast';
import RenderHtml from 'react-native-render-html';


const stripImages = (html: string) => html.replace(/<img[\s\S]*?>/gi, '');


const renderPreview = (raw?: string) => {
  const html = (raw ?? '').trim();
  if (!html) return <Text style={{color:'#666'}}>No content</Text>;

  // Plain text
  if (!html.startsWith('<')) {
    return <Text numberOfLines={3} style={{color:'#666', lineHeight:20}}>{html}</Text>;
  }


  const safe = stripImages(html).trim();
  if (!safe) return <Text style={{color:'#666'}}>(image only)</Text>;

  return (
    <RenderHtml
      contentWidth={200}
      source={{ html: safe }}
      tagsStyles={{
        p: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        div:{ margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        span: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
        strong: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontWeight:'bold' },
        em: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontStyle:'italic' },
        h1: { margin:0, padding:0, fontSize:16, color:'#666', lineHeight:20, fontWeight:'bold' },
        h2: { margin:0, padding:0, fontSize:15, color:'#666', lineHeight:20, fontWeight:'bold' },
        h3: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20, fontWeight:'bold' },
        ul: { margin:0, padding:0 },
        ol: { margin:0, padding:0 },
        li: { margin:0, padding:0, fontSize:14, color:'#666', lineHeight:20 },
      }}
      renderersProps={{ 
        text: { numberOfLines: 3 },
        p: { numberOfLines: 3 },
        div: { numberOfLines: 3 },
        span: { numberOfLines: 3 },
      }}
      renderers={{
        text: ({ TDefaultRenderer, ...props }: any) => (
          <Text numberOfLines={3} style={{color:'#666', fontSize:14, lineHeight:20}}>
            {props.children}
          </Text>
        ),
      }}
    />
  );
};

export default function FavoritesScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [favs, setFavs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);


  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const f = await listFavorites(1000);
      setFavs(f);
    } catch (e: any) {
      showToast.error(e?.message ?? 'Load failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        {/* Header Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Notes</Text>
          <Text style={styles.sectionSubtitle}>
            {favs.length} favorite note{favs.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Notes Grid */}
        <View style={styles.section}>
          {favs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyText}>No favorite notes yet</Text>
              <Text style={styles.emptySubtext}>Tap the star icon on any note to add it to favorites</Text>
            </View>
          ) : (
            <View style={styles.notesGrid}>
              {favs.map(n => (
                <TouchableOpacity 
                  key={`fav-${n.id}`} 
                  style={styles.noteCard}
                  onPress={() => navigation.navigate('NoteDetails', { noteId: n.id })}
                  onLongPress={() => navigation.navigate('EditNote', { noteId: n.id })}
                >
                  <Text style={styles.noteTitle} numberOfLines={2}>{n.title || 'Untitled'}</Text>
                  <View style={styles.noteContentContainer}>
                    {renderPreview(n.content)}
                  </View>
                  <View style={styles.favoriteIndicator}>
                    <Text style={styles.favoriteIcon}>★</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
    padding: 20,
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
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noteCard: {
    width: (width - 60) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    position: 'relative',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
    paddingRight: 30,
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  noteContentContainer: {
    maxHeight: 60, 
    overflow: 'hidden',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
