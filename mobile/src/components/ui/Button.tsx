import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {radius, typography} from '../../theme';
import {useTheme} from '../../context/ThemeContext';
import {useThemedStyles} from '../../hooks/useThemedStyles';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(c => ({
    base: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primary: {backgroundColor: c.primary},
    secondary: {backgroundColor: c.accentSoft},
    accent: {backgroundColor: c.accent},
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    danger: {backgroundColor: c.error},
    pressed: {opacity: 0.88},
    disabled: {opacity: 0.5},
    text: {
      fontSize: 15,
      fontFamily: typography.fontSemiBold,
      letterSpacing: 0.2,
    },
  }));

  const textStyles: Record<string, TextStyle> = {
    primary: {color: colors.white},
    secondary: {color: colors.accentDark},
    accent: {color: colors.white},
    outline: {color: colors.primary},
    danger: {color: colors.white},
  };

  const isDisabled = disabled || loading;
  return (
    <Pressable
      style={({pressed}) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.white}
        />
      ) : (
        <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}
