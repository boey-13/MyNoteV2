// src/screens/ImageViewerScreen.tsx
import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import RNFS from 'react-native-fs';

type RouteParams = { relPath: string; title?: string };

export default function ImageViewerScreen({ route, navigation }: any) {
  const { relPath, title } = route.params as RouteParams;
  const uri = 'file://' + RNFS.DocumentDirectoryPath + relPath;

  React.useEffect(() => {
    navigation.setOptions({ title: title ?? 'Image' });
  }, [navigation, title]);

  // Use ScrollView zoom for simple pinch-to-zoom experience
  return (
    <ScrollView
      maximumZoomScale={4}
      minimumZoomScale={1}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}
    >
      <Image source={{ uri }} style={{ width: '100%', height: undefined, aspectRatio: 1 }} resizeMode="contain" />
    </ScrollView>
  );
}
