import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label: string;
  errorText?: string;
};

export default function InputWithLabel({ label, errorText, style, ...rest }: Props) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: theme.spacing(3) }}>
      <Text style={{ marginBottom: theme.spacing(2), color: theme.colors.text, fontFamily: theme.fonts.semibold }}>
        {label}
      </Text>

      <TextInput
        placeholderTextColor={theme.colors.mutedText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: focused ? theme.colors.accent : theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing(4),
            paddingVertical: theme.spacing(3),
            fontFamily: theme.fonts.regular,
            color: theme.colors.text,
          },
          style as any,
        ]}
        {...rest}
      />

      {!!errorText && (
        <Text style={{ marginTop: theme.spacing(1), color: theme.colors.danger, fontFamily: theme.fonts.regular }}>
          {errorText}
        </Text>
      )}
    </View>
  );
}
