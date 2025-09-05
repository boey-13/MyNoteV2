// src/components/ImageGrid.tsx
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Item = { id: number; uri: string };

type Props = {
  items: Item[];
  onPress?: (id: number) => void;
  onLongPress?: (id: number) => void;
};

export default function ImageGrid({ items, onPress, onLongPress }: Props) {
  const { theme } = useAppTheme();
  const size = 96;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
      {items.map(it => (
        <Pressable
          key={it.id}
          onPress={() => onPress?.(it.id)}
          onLongPress={() => onLongPress?.(it.id)}
          style={{
            width: size, height: size,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            borderWidth: 1, borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
        >
          <Image source={{ uri: it.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}
