import React, {
  createContext,
  useContext,
  useMemo,
} from 'react';
import {StatusBar} from 'react-native';
import {
  AppColors,
  lightColors,
  makeShadow,
  ThemeMode,
} from '../theme';

type ThemeContextValue = {
  colors: AppColors;
  isDark: false;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  shadow: ReturnType<typeof makeShadow>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Light-only theme (dark mode removed per product decision). */
export function ThemeProvider({children}: {children: React.ReactNode}) {
  const shadow = useMemo(() => makeShadow(false), []);
  const value = useMemo(
    () => ({
      colors: lightColors,
      isDark: false as const,
      mode: 'light' as ThemeMode,
      setMode: (_mode: ThemeMode) => {
        // no-op — dark mode disabled
      },
      shadow,
    }),
    [shadow],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  // Never crash boot — fall back to light theme if provider missing
  return (
    ctx ?? {
      colors: lightColors,
      isDark: false as const,
      mode: 'light' as ThemeMode,
      setMode: (_mode: ThemeMode) => undefined,
      shadow: makeShadow(false),
    }
  );
}

export function useThemeColors(): AppColors {
  const ctx = useContext(ThemeContext);
  return ctx?.colors ?? lightColors;
}
