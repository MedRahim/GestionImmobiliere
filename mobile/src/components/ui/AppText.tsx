import React from 'react';
import {Text, TextProps} from 'react-native';
import {typography} from '../../theme';
import {useThemeColors} from '../../context/ThemeContext';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'caption' | 'button' | 'price';

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
  const colors = useThemeColors();
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
