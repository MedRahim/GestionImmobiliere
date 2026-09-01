import React from 'react';
import {Text, View} from 'react-native';
import {radius, typography} from '../../theme';
import {useTheme} from '../../context/ThemeContext';
import {useThemedStyles} from '../../hooks/useThemedStyles';

interface Props {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({label, variant = 'default'}: Props) {
  const {colors, isDark} = useTheme();
  const styles = useThemedStyles(c => ({
    badge: {
      alignSelf: 'flex-start' as const,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.md,
    },
    default: {backgroundColor: c.surfaceAlt},
    success: {backgroundColor: isDark ? 'rgba(61,189,180,0.2)' : '#D1FAE5'},
    warning: {backgroundColor: isDark ? 'rgba(230,184,77,0.2)' : '#FEF3C7'},
    error: {backgroundColor: c.errorSoft},
    text: {
      fontSize: 11,
      fontFamily: typography.fontSemiBold,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
    },
  }));

  const textColor = {
    default: colors.textSecondary,
    success: colors.success,
    warning: isDark ? colors.warning : '#B45309',
    error: colors.error,
  }[variant];

  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, {color: textColor}]}>{label}</Text>
    </View>
  );
}
