import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  favorite?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

export default function NoteCard({ title, subtitle, favorite, onPress, onLongPress }: Props) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing(4),
        marginBottom: theme.spacing(3),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(1) }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: theme.fonts.semibold, color: theme.colors.text, fontSize: 16 }}
        >
          {title}
        </Text>
        {favorite ? <Text style={{ marginLeft: theme.spacing(2) }}>★</Text> : null}
      </View>
      {!!subtitle && (
        <Text
          numberOfLines={2}
          style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}
        >
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}
