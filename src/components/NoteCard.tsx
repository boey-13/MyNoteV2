import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  favorite?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;

  // Step 5: selection mode
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export default function NoteCard({
  title, subtitle, favorite, onPress, onLongPress,
  selectable, selected, onToggleSelect,
}: Props) {
  const { theme } = useAppTheme();

  const body = (
    <View style={{ flex: 1 }}>
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
        <Text numberOfLines={2} style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={selectable ? onToggleSelect : onPress}
      onLongPress={onLongPress}
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing(4),
        marginBottom: theme.spacing(3),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
      }}
    >
      {selectable ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: selected ? theme.colors.accent : theme.colors.border,
            backgroundColor: selected ? theme.colors.accent : 'transparent',
          }}
        />
      ) : null}
      {body}
    </Pressable>
  );
}
