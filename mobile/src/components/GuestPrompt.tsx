import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {Button} from './ui/Button';
import {AppText} from './ui/AppText';
import {colors, radius, shadow} from '../theme';

interface Props {
  emoji?: string;
  title: string;
  message: string;
}

export function GuestPrompt({
  emoji = '🔐',
  title,
  message,
}: Props) {
  const {openLogin, openRegister} = useAuth();
  const {t} = useLanguage();

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <AppText style={styles.emoji}>{emoji}</AppText>
        <AppText variant="h3" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySm" color={colors.textSecondary} style={styles.message}>
          {message}
        </AppText>
        <Button title={t('guest.login')} onPress={openLogin} style={styles.btn} />
        <Button
          title={t('guest.register')}
          onPress={openRegister}
          variant="outline"
          style={styles.btn}
        />
      </View>
      <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
        {t('guest.hint')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    ...shadow.card,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    marginTop: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
