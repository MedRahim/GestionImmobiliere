import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius} from '../../theme';

interface Props {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({label, variant = 'default'}: Props) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, textStyles[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  default: {backgroundColor: colors.surfaceAlt},
  success: {backgroundColor: '#D1FAE5'},
  warning: {backgroundColor: '#FEF3C7'},
  error: {backgroundColor: '#FEE2E2'},
  text: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
});

const textStyles = {
  default: {color: colors.textSecondary},
  success: {color: colors.success},
  warning: {color: '#B45309'},
  error: {color: colors.error},
};
