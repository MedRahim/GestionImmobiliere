import React from 'react';
import {Text, TextInput, TextInputProps, View} from 'react-native';
import {radius, typography} from '../../theme';
import {useTheme} from '../../context/ThemeContext';
import {useThemedStyles} from '../../hooks/useThemedStyles';

interface Props extends TextInputProps {
  label?: string;
}

export function Input({label, style, ...props}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(c => ({
    wrap: {marginBottom: 14},
    label: {
      fontSize: 13,
      fontFamily: typography.fontSemiBold,
      color: c.textSecondary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: typography.fontRegular,
      color: c.text,
      backgroundColor: c.surfaceAlt,
    },
  }));

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}
