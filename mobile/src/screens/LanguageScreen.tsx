import React, {useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../components/ui/AppText';
import {Button} from '../components/ui/Button';
import {useLanguage} from '../context/LanguageContext';
import {AppLocale, LOCALES} from '../i18n/translations';
import {MainStackParamList, RootStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';

const globeImage = require('../assets/images/language-globe.png');

type Props =
  | NativeStackScreenProps<RootStackParamList, 'Language'>
  | NativeStackScreenProps<MainStackParamList, 'Language'>;

export function LanguageScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {locale, setLocale, confirmLanguage, t} = useLanguage();
  const [selected, setSelected] = useState<AppLocale>(locale);
  const fromSettings = navigation.canGoBack();

  const handleValidate = async () => {
    if (!fromSettings) {
      await confirmLanguage();
    }
    const restarted = await setLocale(selected);
    if (restarted) {
      return;
    }
    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.replace('App');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={globeImage} style={styles.heroImg} resizeMode="cover" />
      </View>

      <View style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppText variant="h2" style={styles.title}>
            {t('language.title')}
          </AppText>
          <AppText variant="bodySm" color={colors.textSecondary} style={styles.subtitle}>
            {t('language.subtitle')}
          </AppText>

          <View style={styles.grid}>
            {LOCALES.map(item => {
              const active = selected === item.code;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                  onPress={() => setSelected(item.code)}>
                  <AppText
                    variant="body"
                    weight={active ? 'bold' : 'regular'}
                    color={active ? colors.primary : colors.text}
                    style={styles.langLabel}>
                    {item.label}
                  </AppText>
                  {active && <View style={styles.underline} />}
                </Pressable>
              );
            })}
          </View>

          <Button title={t('language.validate')} onPress={handleValidate} style={styles.validate} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.white},
  hero: {
    height: '42%',
    backgroundColor: '#1ECAD3',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl + 8,
    borderTopRightRadius: radius.xl + 8,
    paddingHorizontal: 24,
    paddingTop: 28,
    ...shadow.card,
  },
  title: {
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  langBtn: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.accentSoft,
  },
  langLabel: {textAlign: 'center'},
  underline: {
    marginTop: 8,
    width: '70%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  validate: {
    backgroundColor: colors.primary,
    marginBottom: 8,
  },
});
