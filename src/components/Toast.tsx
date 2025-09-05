import React from 'react';
import Toast, { ToastConfig } from 'react-native-toast-message';
import { View, Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

// Custom renderer to match pastel style
export function useToastConfig(): ToastConfig {
  const { theme } = useAppTheme();
  return {
    success: ({ text1, text2 }) => (
      <View style={{
        padding: theme.spacing(4),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1, borderColor: theme.colors.border,
      }}>
        <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.success }}>{text1}</Text>
        {!!text2 && <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>{text2}</Text>}
      </View>
    ),
    error: ({ text1, text2 }) => (
      <View style={{
        padding: theme.spacing(4),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1, borderColor: theme.colors.danger,
      }}>
        <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.danger }}>{text1}</Text>
        {!!text2 && <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText }}>{text2}</Text>}
      </View>
    ),
  };
}

export const showToast = {
  success: (text1: string, text2?: string) => Toast.show({ type: 'success', text1, text2 }),
  error:   (text1: string, text2?: string) => Toast.show({ type: 'error',   text1, text2 }),
};

export default function ThemedToast() {
  const config = useToastConfig();
  return <Toast config={config} />;
}
