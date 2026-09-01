import {I18nManager} from 'react-native';
import RNRestart from 'react-native-restart';
import {AppLocale} from '../i18n/translations';

export function isRtlLocale(locale: AppLocale): boolean {
  return locale === 'ar';
}

/** Applies RTL/LTR at the native layer. Restarts the app when direction changes. */
export function syncLayoutDirection(locale: AppLocale): boolean {
  const rtl = isRtlLocale(locale);
  if (I18nManager.isRTL === rtl) {
    return false;
  }

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  RNRestart.restart();
  return true;
}
