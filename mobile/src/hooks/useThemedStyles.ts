import {DependencyList, useMemo} from 'react';
import {ImageStyle, StyleSheet, TextStyle, ViewStyle} from 'react-native';
import {AppColors} from '../theme';
import {useTheme} from '../context/ThemeContext';

type NamedStyles<T> = {[P in keyof T]: ViewStyle | TextStyle | ImageStyle};

/**
 * Recreate StyleSheet when theme colors / shadow change.
 */
export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (
    colors: AppColors,
    shadow: ReturnType<typeof useTheme>['shadow'],
    isDark: boolean,
  ) => T,
  deps: DependencyList = [],
) {
  const {colors, shadow, isDark} = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(colors, shadow, isDark)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, shadow, isDark, ...deps],
  );
}
