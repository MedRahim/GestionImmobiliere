import React, {useEffect} from 'react';
import {Image, StatusBar, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppText} from '../components/ui/AppText';
import {brandLogo} from '../config/brand';
import {useLanguage} from '../context/LanguageContext';
import {RootStackParamList} from '../navigation/types';
import {colors} from '../theme';

const plmLogo = require('../assets/images/plm-logo.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({navigation}: Props) {
  const {t, languageChosen, ready} = useLanguage();

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      if (languageChosen) {
        navigation.replace('App');
      } else {
        navigation.replace('Language');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation, languageChosen, ready]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Image source={brandLogo} style={styles.appLogo} resizeMode="contain" />
      <View style={styles.creditBlock}>
        <Image source={plmLogo} style={styles.plmLogo} resizeMode="contain" />
        <AppText variant="caption" color={colors.textMuted} style={styles.credit}>
          {t('splash.developedBy')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appLogo: {
    width: 180,
    height: 180,
    marginBottom: 48,
  },
  creditBlock: {
    alignItems: 'center',
    gap: 6,
  },
  plmLogo: {
    width: 32,
    height: 32,
    opacity: 0.85,
  },
  credit: {
    textAlign: 'center',
    letterSpacing: 0.3,
    fontSize: 11,
  },
});
