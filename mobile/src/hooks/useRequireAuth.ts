import {useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';

export function useRequireAuth() {
  const {isAuthenticated, isGuest, openLogin} = useAuth();
  const {showAlert} = useAppAlert();
  const {t} = useLanguage();

  const requireAuth = useCallback(
    (feature?: string) => {
      if (isAuthenticated) {
        return true;
      }
      showAlert({
        type: 'info',
        title: t('auth.requiredTitle'),
        message: feature
          ? `${t('auth.requiredFor')} ${feature}.`
          : t('auth.required'),
        buttons: [
          {text: t('auth.later'), style: 'cancel'},
          {text: t('guest.login'), onPress: openLogin},
        ],
      });
      return false;
    },
    [isAuthenticated, openLogin, showAlert, t],
  );
  return {requireAuth, isGuest, isAuthenticated};
}
