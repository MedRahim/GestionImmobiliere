import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';
import {authApi} from '../api/auth';
import {uploadApi} from '../api/upload';
import {GoogleSignInButton} from '../components/GoogleSignInButton';
import {ProfilePhotoPicker} from '../components/ProfilePhotoPicker';
import {AuthStackParamList} from '../navigation/types';
import {Button} from '../components/ui/Button';
import {Input} from '../components/ui/Input';
import {AppText} from '../components/ui/AppText';
import {BRAND_NAME, BRAND_TAGLINE} from '../config/brand';
import {isLocalImageUri} from '../utils/imageUri';
import {colors, radius, shadow} from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({navigation}: Props) {
  const {register, loginWithGoogle, updateUser} = useAuth();
  const {alert} = useAppAlert();
  const {t} = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
    } catch (error: any) {
      alert('Erreur', error?.response?.data?.message || 'Connexion Google impossible', undefined, 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      alert('Erreur', 'Veuillez remplir tous les champs obligatoires', undefined, 'error');
      return;
    }
    setLoading(true);
    try {
      await register({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password,
        phone: phone || undefined,
      });
      if (photoUri && isLocalImageUri(photoUri)) {
        const uploaded = await uploadApi.uploadImage(photoUri);
        const response = await authApi.updateProfile({profileImage: uploaded.fullUrl});
        updateUser(response.user);
      }
    } catch (error: any) {
      alert('Erreur', error?.response?.data?.message || 'Inscription impossible', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <AppText variant="h1" color={colors.white} style={styles.brand}>
          {BRAND_NAME}
        </AppText>
        <AppText variant="caption" color={colors.accentLight} style={styles.tagline}>
          {BRAND_TAGLINE.toUpperCase()}
        </AppText>
        <AppText variant="body" color="rgba(255,255,255,0.9)" style={styles.heroSub}>
          Achetez et vendez en Tunisie
        </AppText>
      </View>

      <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
        <AppText variant="h2">Inscription</AppText>
        <AppText variant="bodySm" color={colors.textSecondary} style={styles.sub}>
          Ou connectez-vous directement avec Google
        </AppText>

        <GoogleSignInButton
          onSuccess={handleGoogle}
          onError={msg => alert('Google', msg, undefined, 'info')}
          disabled={loading || googleLoading}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <AppText variant="caption" color={colors.textMuted}>
            ou par email
          </AppText>
          <View style={styles.dividerLine} />
        </View>

        <ProfilePhotoPicker imageUri={photoUri} onChange={setPhotoUri} label="Ajouter une photo (optionnel)" />

        <Input label="Prénom *" value={firstName} onChangeText={setFirstName} />
        <Input label="Nom *" value={lastName} onChangeText={setLastName} />
        <Input label="Email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Mot de passe * (min. 8 car.)" value={password} onChangeText={setPassword} secureTextEntry />

        <Button
          title={t('register.create')}
          onPress={handleRegister}
          loading={loading}
          disabled={googleLoading}
          style={{marginTop: 8, marginBottom: 16}}
        />

        <Pressable onPress={() => navigation.goBack()}>
          <AppText variant="body" color={colors.textSecondary} style={styles.link}>
            Déjà un compte ?{' '}
            <AppText variant="body" color={colors.accent} weight="bold">
              Se connecter
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.gradientStart},
  hero: {
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: colors.gradientMid,
  },
  brand: {letterSpacing: 1},
  tagline: {letterSpacing: 2, marginTop: 4, marginBottom: 4},
  heroSub: {marginTop: 8, textAlign: 'center'},
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    marginTop: -16,
    padding: 24,
    ...shadow.card,
  },
  sub: {marginBottom: 16, marginTop: 6},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: colors.border},
  link: {textAlign: 'center', marginBottom: 24},
});
