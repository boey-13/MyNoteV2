// src/components/InputWithLabel.tsx
import React, { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label: string;
  errorText?: string;
};

const InputWithLabel = forwardRef<TextInput, Props>(
  ({ label, errorText, style, ...rest }, ref) => {
    const { theme } = useAppTheme();
    return (
      <View style={{ gap: theme.spacing(1) }}>
        <Text style={{ fontFamily: theme.fonts.semibold }}>{label}</Text>
        <TextInput
          ref={ref}
          {...rest}
          style={[
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing(4),
              paddingVertical: theme.spacing(3),
              color: theme.colors.text,
              fontFamily: theme.fonts.regular,
            },
            style,
          ]}
        />
        {!!errorText && (
          <Text style={{ color: theme.colors.danger, fontFamily: theme.fonts.regular }}>
            {errorText}
          </Text>
        )}
      </View>
    );
  }
);

export default InputWithLabel;
