import React from 'react';
import {StyleSheet, Text, TextProps, TextStyle} from 'react-native';
import {colors, typography} from '../../theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'caption' | 'button';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: 'regular' | 'medium' | 'bold';
  children: React.ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  weight,
  style,
  children,
  ...props
}: Props) {
  const base = typography[variant];
  const fontFamily =
    weight === 'bold'
      ? typography.fontBold
      : weight === 'medium'
      ? typography.fontMedium
      : base.fontFamily || typography.fontRegular;

  return (
    <Text
      style={[base, {color: color || colors.text, fontFamily}, style]}
      {...props}>
      {children}
    </Text>
  );
}
