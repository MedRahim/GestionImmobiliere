import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@immobilier_token';
const USER_KEY = '@immobilier_user';
const ONBOARDING_KEY = '@immodary_onboarding_seen';
const LANGUAGE_KEY = '@immodary_language';
const LANGUAGE_CHOSEN_KEY = '@immodary_language_chosen';

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getUser(): Promise<string | null> {
    return AsyncStorage.getItem(USER_KEY);
  },
  async setUser(user: object): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
  async getOnboardingSeen(): Promise<boolean> {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  },
  async setOnboardingSeen(): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  },
  async getLanguage(): Promise<import('../i18n/translations').AppLocale | null> {
    const v = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (v === 'fr' || v === 'en' || v === 'ar' || v === 'es' || v === 'tr') return v;
    return null;
  },
  async setLanguage(locale: import('../i18n/translations').AppLocale): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, locale);
  },
  async getLanguageChosen(): Promise<boolean> {
    return (await AsyncStorage.getItem(LANGUAGE_CHOSEN_KEY)) === '1';
  },
  async setLanguageChosen(): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
  },
};
