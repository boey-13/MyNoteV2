import React from 'react';
import { View, Text } from 'react-native';
import CustomButton from './CustomButton';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, description, actionLabel, onAction }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(6) }}>
      <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, color: theme.colors.text, marginBottom: theme.spacing(2) }}>
        {title}
      </Text>
      {!!description && (
        <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText, textAlign: 'center', marginBottom: theme.spacing(4) }}>
          {description}
        </Text>
      )}
      {!!actionLabel && onAction && (
        <CustomButton label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
