import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger, onConfirm, onCancel,
}: Props) {
  const { theme } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: '86%',
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          padding: theme.spacing(5),
        }}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 18, color: theme.colors.text, marginBottom: theme.spacing(2) }}>
            {title}
          </Text>
          {!!message && (
            <Text style={{ fontFamily: theme.fonts.regular, color: theme.colors.mutedText, marginBottom: theme.spacing(4) }}>
              {message}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing(2) }}>
            <Pressable onPress={onCancel} style={{ paddingVertical: theme.spacing(2), paddingHorizontal: theme.spacing(3) }}>
              <Text style={{ fontFamily: theme.fonts.semibold, color: theme.colors.text }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{
                paddingVertical: theme.spacing(2),
                paddingHorizontal: theme.spacing(4),
                borderRadius: theme.radius.md,
                backgroundColor: danger ? theme.colors.danger : theme.colors.accent,
              }}>
              <Text style={{ fontFamily: theme.fonts.semibold, color: '#fff' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
