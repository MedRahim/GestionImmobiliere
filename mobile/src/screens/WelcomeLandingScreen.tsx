import React, {useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../components/ui/AppText';
import {Button} from '../components/ui/Button';
import {LANDING_SLIDES} from '../config/landing';
import {brandLogo} from '../config/brand';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {AuthStackParamList} from '../navigation/types';
import {storage} from '../utils/storage';
import {colors} from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const LAST_INDEX = LANDING_SLIDES.length - 1;
const screenDimensions = Dimensions.get('screen');

export function WelcomeLandingScreen({navigation}: Props) {
  const {continueAsGuest} = useAuth();
  const {t} = useLanguage();
  const {width: windowW} = useWindowDimensions();
  const screenW = windowW;
  const screenH = screenDimensions.height;
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const isLastSlide = index === LAST_INDEX;

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
      return () => {
        StatusBar.setBarStyle('dark-content');
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(false);
          StatusBar.setBackgroundColor('#E8F4FC');
        }
      };
    }, []),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => {
        if (prev >= LAST_INDEX) return prev;
        const next = prev + 1;
        listRef.current?.scrollToIndex({index: next, animated: true});
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const updateIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / screenW);
    if (i !== index) setIndex(i);
  };

  const finishOnboarding = async () => {
    await storage.setOnboardingSeen();
  };

  const goLogin = async () => {
    await finishOnboarding();
    navigation.navigate('Login');
  };

  const goGuest = async () => {
    await finishOnboarding();
    continueAsGuest();
  };

  const goToFinalSlide = () => {
    listRef.current?.scrollToIndex({index: LAST_INDEX, animated: true});
    setIndex(LAST_INDEX);
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={LANDING_SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={updateIndex}
        onMomentumScrollEnd={updateIndex}
        scrollEventThrottle={16}
        keyExtractor={item => item.id}
        style={styles.carousel}
        getItemLayout={(_, i) => ({length: screenW, offset: screenW * i, index: i})}
        renderItem={({item}) => (
          <View style={[styles.slide, {width: screenW, height: screenH}]}>
            <Image
              source={item.image}
              style={{width: screenW, height: screenH}}
              resizeMode="contain"
            />
          </View>
        )}
      />

      {!isLastSlide && (
        <Pressable
          onPress={goToFinalSlide}
          style={[styles.passer, {top: insets.top + 12}]}
          hitSlop={12}>
          <AppText variant="bodySm" color={colors.textSecondary} weight="medium">
            {t('landing.passer')}
          </AppText>
        </Pressable>
      )}

      <View
        pointerEvents="none"
        style={[styles.brand, {top: insets.top + 10}]}>
        <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.footer, {paddingBottom: insets.bottom + 12}]}>
        {isLastSlide ? (
          <View style={styles.actions}>
            <Button title={t('landing.commencer')} onPress={goLogin} variant="accent" />
            <Button
              title={t('landing.decouvrir')}
              onPress={goGuest}
              variant="secondary"
            />
          </View>
        ) : null}

        <View style={styles.dotsPill}>
          {LANDING_SLIDES.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  carousel: {
    ...StyleSheet.absoluteFillObject,
  },
  slide: {
    backgroundColor: colors.white,
  },
  passer: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  brand: {
    position: 'absolute',
    right: 16,
  },
  logo: {
    width: 84,
    height: 84,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 20,
    elevation: 20,
  },
  actions: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    padding: 14,
    paddingBottom: 10,
  },
  dotsPill: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(15,34,53,0.3)',
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.accent,
  },
});
