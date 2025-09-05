// src/components/RichToolbar.tsx
import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  style?: ViewStyle;
};

export default function RichToolbar({ onBold, onItalic, onUnderline, style }: Props) {
  const { theme } = useAppTheme();
  const Btn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: theme.spacing(3),
        paddingVertical: theme.spacing(2),
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[{ flexDirection: 'row', gap: theme.spacing(2) }, style]}>
      <Btn label="B" onPress={onBold} />
      <Btn label="I" onPress={onItalic} />
      <Btn label="U" onPress={onUnderline} />
    </View>
  );
}
