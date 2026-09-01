import {ViewStyle} from 'react-native';
import {colors} from './colors';

export {colors, lightColors, darkColors} from './colors';
export type {AppColors} from './colors';
export {typography} from './typography';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const layout = {
  tabBarClearance: 110,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: '#0B1F2E',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,
  soft: {
    shadowColor: '#0B1F2E',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  } as ViewStyle,
  float: {
    shadowColor: '#0B1F2E',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 10,
  } as ViewStyle,
  header: {
    shadowColor: '#0B1F2E',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  } as ViewStyle,
};

/** @deprecated dark mode removed — always light */
export type ThemeMode = 'light';
export function makeShadow(_isDark?: boolean) {
  return shadow;
}
export function resolveColors(_isDark?: boolean) {
  return colors;
}
