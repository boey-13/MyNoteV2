import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export default function CustomButton({
  label, onPress, variant = 'solid', disabled, loading, style,
}: Props) {
  const { theme } = useAppTheme();
  const base: ViewStyle = {
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(5),
    borderRadius: theme.radius.lg,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: theme.colors.border,
    backgroundColor:
      variant === 'solid' ? theme.colors.accent :
      variant === 'outline' ? 'transparent' :
      'transparent',
    opacity: disabled ? 0.6 : 1,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const textColor =
    variant === 'solid' ? '#FFFFFF' : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[base, style]}
    >
      {loading
        ? <ActivityIndicator />
        : <Text style={{ color: textColor, fontFamily: theme.fonts.semibold, fontSize: 16 }}>{label}</Text>}
    </Pressable>
  );
}
