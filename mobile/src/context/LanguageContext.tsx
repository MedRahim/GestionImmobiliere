import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {AppLocale, translate} from '../i18n/translations';
import {syncLayoutDirection, isRtlLocale} from '../utils/layoutDirection';
import {storage} from '../utils/storage';

interface LanguageContextValue {
  locale: AppLocale;
  ready: boolean;
  languageChosen: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: AppLocale) => Promise<boolean>;
  confirmLanguage: () => Promise<void>;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [locale, setLocaleState] = useState<AppLocale>('fr');
  const [ready, setReady] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = (await storage.getLanguage()) || 'fr';
      const chosen = await storage.getLanguageChosen();

      if (syncLayoutDirection(saved)) {
        return;
      }

      setLocaleState(saved);
      setLanguageChosen(chosen);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    await storage.setLanguage(next);
    setLocaleState(next);

    if (syncLayoutDirection(next)) {
      return true;
    }

    return false;
  }, []);

  const confirmLanguage = useCallback(async () => {
    await storage.setLanguageChosen();
    setLanguageChosen(true);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      ready,
      languageChosen,
      t,
      setLocale,
      confirmLanguage,
      isRtl: isRtlLocale(locale),
    }),
    [locale, ready, languageChosen, t, setLocale, confirmLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
