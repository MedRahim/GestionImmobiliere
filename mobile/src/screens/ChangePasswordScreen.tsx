import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {authApi} from '../api/auth';
import {AppText} from '../components/ui/AppText';
import {Button} from '../components/ui/Button';
import {Input} from '../components/ui/Input';
import {ScreenShell} from '../components/ScreenShell';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';
import {MainStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({navigation}: Props) {
  const {t} = useLanguage();
  const {alert} = useAppAlert();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword || !newPassword) {
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
      await authApi.changePassword(currentPassword, newPassword);
      alert(t('common.success'), t('changePassword.success'), [
        {text: 'OK', onPress: () => navigation.goBack()},
      ], 'success');
    } catch (error: any) {
      alert(
        t('common.error'),
        error?.response?.data?.message || t('changePassword.error'),
        undefined,
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell title={t('changePassword.title')} subtitle={t('changePassword.subtitle')} showBack>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <AppText variant="bodySm" color={colors.textSecondary} style={styles.hint}>
              {t('changePassword.hint')}
            </AppText>
            <Input
              label={t('changePassword.current')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
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
              title={t('changePassword.save')}
              onPress={submit}
              loading={loading}
              style={styles.btn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {padding: 16, paddingBottom: 32},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    ...shadow.card,
  },
  hint: {marginBottom: 14, lineHeight: 20},
  btn: {marginTop: 8},
});
