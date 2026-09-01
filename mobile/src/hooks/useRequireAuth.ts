import {useCallback} from 'react';
import {useAuth, AuthReturnTo} from '../context/AuthContext';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';

export function useRequireAuth() {
  const {isAuthenticated, isGuest, openLogin} = useAuth();
  const {showAlert} = useAppAlert();
  const {t} = useLanguage();

  const requireAuth = useCallback(
    (feature?: string, returnTo?: AuthReturnTo) => {
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
          {
            text: t('guest.login'),
            onPress: () => openLogin(returnTo),
          },
        ],
      });
      return false;
    },
    [isAuthenticated, openLogin, showAlert, t],
  );

  return {requireAuth, isGuest, isAuthenticated};
}
