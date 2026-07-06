import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {GOOGLE_WEB_CLIENT_ID, isGoogleSignInConfigured} from '../config/google';
import {useLanguage} from '../context/LanguageContext';
import {AppText} from './ui/AppText';
import {colors, radius, shadow} from '../theme';

interface Props {
  onSuccess: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({onSuccess, onError, disabled}: Props) {
  const [loading, setLoading] = useState(false);
  const {t} = useLanguage();
  const configured = isGoogleSignInConfigured();

  useEffect(() => {
    if (!configured) return;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, [configured]);

  const handlePress = async () => {
    if (!configured) {
      onError?.(
        'Google non configuré. Ajoutez votre Web Client ID dans src/config/google.ts',
      );
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      // Clear cached account so the user can pick which Gmail to use each time
      try {
        await GoogleSignin.signOut();
      } catch {
        // not signed in yet — ok
      }
      const result = await GoogleSignin.signIn();
      const idToken = (result as {idToken?: string; data?: {idToken?: string}}).idToken
        || (result as {data?: {idToken?: string}}).data?.idToken;
      if (!idToken) {
        onError?.('Connexion Google annulée');
        return;
      }
      await onSuccess(idToken);
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error?.code === statusCodes.IN_PROGRESS) return;
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services indisponible');
        return;
      }
      onError?.(error?.message || 'Connexion Google impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.btn, (disabled || loading) && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.row}>
          <Image
            source={{
              uri: 'https://developers.google.com/identity/images/g-logo.png',
            }}
            style={styles.icon}
          />
          <AppText variant="button" color={colors.text}>
            {t('login.google')}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  disabled: {opacity: 0.6},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 22,
    height: 22,
  },
});
