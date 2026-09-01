import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {authApi} from '../api/auth';
import {AppText} from '../components/ui/AppText';
import {Button} from '../components/ui/Button';
import {Input} from '../components/ui/Input';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';
import {AuthStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Channel = 'email' | 'sms';

export function ForgotPasswordScreen({navigation}: Props) {
  const {t} = useLanguage();
  const {alert} = useAppAlert();
  const [channel, setChannel] = useState<Channel>('email');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [accountPhoneHint, setAccountPhoneHint] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!email.trim()) {
      alert(t('common.error'), t('forgot.emailRequired'), undefined, 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({
        email: email.trim().toLowerCase(),
        // SMS uses the phone saved on the account (server-side), not a typed number
        channel: channel === 'sms' ? 'sms' : 'email',
      });
      if ((res as any).phoneHint) {
        setAccountPhoneHint((res as any).phoneHint);
      }
      setCode('');
      setStep('reset');
      alert(t('common.success'), res.message || t('forgot.codeSent'), undefined, 'success');
    } catch (error: any) {
      alert(
        t('common.error'),
        error?.response?.data?.message || t('forgot.requestError'),
        undefined,
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!code.trim() || !newPassword) {
      alert(t('common.error'), t('forgot.fillAll'), undefined, 'error');
      return;
    }
    if (newPassword.length < 8) {
      alert(t('common.error'), t('forgot.passwordShort'), undefined, 'error');
      return;
    }
    if (newPassword !== confirm) {
      alert(t('common.error'), t('forgot.passwordMismatch'), undefined, 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      alert(t('common.success'), res.message || t('forgot.resetOk'), [
        {text: 'OK', onPress: () => navigation.navigate('Login')},
      ], 'success');
    } catch (error: any) {
      alert(
        t('common.error'),
        error?.response?.data?.message ||
          error?.response?.data?.details?.code ||
          t('forgot.resetError'),
        undefined,
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <AppText variant="h1" color={colors.white} weight="bold">
          {t('forgot.title')}
        </AppText>
        <AppText variant="bodySm" color="rgba(255,255,255,0.9)" style={styles.heroSub}>
          {t('forgot.subtitle')}
        </AppText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
            <AppText variant="body" color={colors.textSecondary}>
              {t('login.back')}
            </AppText>
          </Pressable>

          {step === 'request' ? (
            <>
              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, channel === 'email' && styles.tabOn]}
                  onPress={() => setChannel('email')}>
                  <AppText
                    variant="bodySm"
                    weight="bold"
                    color={channel === 'email' ? colors.white : colors.textSecondary}>
                    {t('forgot.viaEmail')}
                  </AppText>
                </Pressable>
                <Pressable
                  style={[styles.tab, channel === 'sms' && styles.tabOn]}
                  onPress={() => setChannel('sms')}>
                  <AppText
                    variant="bodySm"
                    weight="bold"
                    color={channel === 'sms' ? colors.white : colors.textSecondary}>
                    {t('forgot.viaSms')}
                  </AppText>
                </Pressable>
              </View>

              <AppText variant="bodySm" color={colors.textSecondary} style={styles.hint}>
                {channel === 'email' ? t('forgot.emailHint') : t('forgot.smsAccountHint')}
              </AppText>

              <Input
                label={t('login.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Button
                title={t('forgot.sendCode')}
                onPress={requestCode}
                loading={loading}
                style={styles.btn}
              />
            </>
          ) : (
            <>
              {accountPhoneHint && channel === 'sms' ? (
                <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
                  {t('forgot.smsSentTo', {phone: accountPhoneHint})}
                </AppText>
              ) : null}
              <Input
                label={t('forgot.code')}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
              <Input
                label={t('forgot.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Input
                label={t('forgot.confirmPassword')}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
              <Button
                title={t('forgot.reset')}
                onPress={submitReset}
                loading={loading}
                style={styles.btn}
              />
              <Pressable onPress={() => setStep('request')}>
                <AppText variant="bodySm" color={colors.accent} style={styles.link}>
                  {t('forgot.resend')}
                </AppText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.gradientStart},
  hero: {paddingTop: 56, paddingBottom: 36, paddingHorizontal: 24},
  heroSub: {marginTop: 8, lineHeight: 20},
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
  backBtn: {marginBottom: 12, alignSelf: 'flex-start'},
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  tabOn: {backgroundColor: colors.primary},
  hint: {marginBottom: 16, lineHeight: 20},
  btn: {marginTop: 8},
  link: {textAlign: 'center', marginTop: 16},
});
