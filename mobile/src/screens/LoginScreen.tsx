import React, {useEffect, useState} from 'react';

import {

  Image,

  KeyboardAvoidingView,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  View,

} from 'react-native';

import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';

import {useAppAlert} from '../context/AlertContext';

import {AuthStackParamList} from '../navigation/types';

import {GoogleSignInButton} from '../components/GoogleSignInButton';

import {Button} from '../components/ui/Button';

import {Input} from '../components/ui/Input';

import {AppText} from '../components/ui/AppText';

import {BRAND_NAME, BRAND_TAGLINE, brandLogo} from '../config/brand';

import {colors, radius, shadow} from '../theme';



type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;



export function LoginScreen({navigation}: Props) {

  const {login, loginWithGoogle, dismissAuthOverlay, authOverlay} = useAuth();
  const {t} = useLanguage();

  const {alert} = useAppAlert();

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);



  const handleLogin = async () => {

    if (!email.trim() || !password) {

      alert('Erreur', 'Veuillez remplir tous les champs', undefined, 'error');

      return;

    }

    setLoading(true);

    try {

      await login(email.trim().toLowerCase(), password);

    } catch (error: any) {

      alert('Erreur', error?.response?.data?.message || 'Connexion impossible', undefined, 'error');

    } finally {

      setLoading(false);

    }

  };



  const handleGoogle = async (idToken: string) => {

    setGoogleLoading(true);

    try {

      await loginWithGoogle(idToken);

    } catch (error: any) {

      alert(

        'Erreur',

        error?.response?.data?.message || 'Connexion Google impossible',

        undefined,

        'error',

      );

    } finally {

      setGoogleLoading(false);

    }

  };



  return (

    <View style={styles.root}>

      <View style={styles.hero}>

        <Image source={brandLogo} style={styles.logo} resizeMode="contain" />

        <AppText variant="h1" color={colors.white} weight="bold" style={styles.brand}>

          {BRAND_NAME}

        </AppText>

        <AppText variant="caption" color={colors.accentLight} style={styles.taglineCaps}>

          {BRAND_TAGLINE.toUpperCase()}

        </AppText>

        <AppText variant="bodySm" color="rgba(255,255,255,0.9)" style={styles.heroSub}>

          Immobilier en Tunisie — achetez et vendez en une seule app

        </AppText>

      </View>



      <KeyboardAvoidingView

        behavior={Platform.OS === 'ios' ? 'padding' : undefined}

        style={styles.sheet}>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Pressable style={styles.backBtn} onPress={() => {
            if (authOverlay) {
              dismissAuthOverlay();
              return;
            }
            if (navigation.canGoBack()) navigation.goBack();
          }}>

            <AppText variant="body" color={colors.textSecondary}>

              {t('login.back')}

            </AppText>

          </Pressable>

          <AppText variant="h2" style={styles.title}>

            {t('login.title')}

          </AppText>

          <AppText variant="bodySm" color={colors.textSecondary} style={styles.subtitle}>

            {t('login.subtitle')}

          </AppText>



          <GoogleSignInButton

            onSuccess={handleGoogle}

            onError={msg => alert('Google', msg, undefined, 'info')}

            disabled={loading || googleLoading}

          />



          <View style={styles.divider}>

            <View style={styles.dividerLine} />

            <AppText variant="caption" color={colors.textMuted} style={styles.dividerText}>

              {t('login.orEmail')}

            </AppText>

            <View style={styles.dividerLine} />

          </View>



          <Input

            label={t('login.email')}

            value={email}

            onChangeText={setEmail}

            autoCapitalize="none"

            keyboardType="email-address"

          />

          <Input

            label={t('login.password')}

            value={password}

            onChangeText={setPassword}

            secureTextEntry

          />

          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{alignSelf: 'flex-end', marginBottom: 8}}>
            <AppText variant="bodySm" color={colors.accent} weight="medium">
              {t('login.forgot')}
            </AppText>
          </Pressable>



          <Button

            title={t('login.continue')}

            onPress={handleLogin}

            loading={loading}

            disabled={googleLoading}

            style={{marginTop: 4}}

          />



          <Pressable onPress={() => navigation.navigate('Register')}>

            <AppText variant="bodySm" color={colors.textSecondary} style={styles.link}>

              Pas de compte ?{' '}

              <AppText variant="bodySm" color={colors.accent} weight="bold">

                S'inscrire

              </AppText>

            </AppText>

          </Pressable>

        </ScrollView>

      </KeyboardAvoidingView>

    </View>

  );

}



const styles = StyleSheet.create({

  root: {flex: 1, backgroundColor: colors.gradientStart},

  hero: {

    flex: 0.34,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 24,

  },

  logo: {width: 88, height: 88, marginBottom: 10},

  brand: {letterSpacing: 0.5},

  taglineCaps: {letterSpacing: 2.5, marginTop: 4, marginBottom: 10},

  heroSub: {textAlign: 'center', lineHeight: 20},

  sheet: {

    flex: 1,

    backgroundColor: colors.surface,

    borderTopLeftRadius: radius.xl + 8,

    borderTopRightRadius: radius.xl + 8,

    paddingHorizontal: 24,

    paddingTop: 16,

    paddingBottom: 24,

    marginTop: -16,

    ...shadow.card,

  },

  backBtn: {marginBottom: 8, alignSelf: 'flex-start'},

  title: {color: colors.text},

  subtitle: {marginBottom: 16, marginTop: 4},

  divider: {

    flexDirection: 'row',

    alignItems: 'center',

    marginVertical: 18,

    gap: 10,

  },

  dividerLine: {flex: 1, height: 1, backgroundColor: colors.border},

  dividerText: {letterSpacing: 0.5},

  link: {textAlign: 'center', marginTop: 20, marginBottom: 8},

});


