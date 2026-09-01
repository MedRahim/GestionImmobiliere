import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {colors, radius, shadow} from '../theme';

interface Props {
  visible: boolean;
  isRent: boolean;
  onOpenGuide: () => void;
  bottomInset?: number;
}

/**
 * Soft floating Guide presence on property detail — not a solid dock button.
 */
export function PropertyGuidePresence({
  visible,
  isRent,
  onOpenGuide,
  bottomInset = 16,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }
    const enter = Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 520, delay: 700, useNativeDriver: true}),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        delay: 700,
        useNativeDriver: true,
      }),
    ]);
    enter.start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1.06, duration: 1200, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1, duration: 1200, useNativeDriver: true}),
      ]),
    );
    const t = setTimeout(() => loop.start(), 1400);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [visible, opacity, translateY, pulse]);

  if (!visible) return null;

  const tip = isRent
    ? 'Besoin d’un avis sur la zone ou le loyer ? Demandez au Guide.'
    : 'Hésitez sur le prix ou le quartier ? Le Guide répond.';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {bottom: Math.max(bottomInset, 16) + 8, opacity, transform: [{translateY}]},
      ]}>
      <Pressable style={styles.card} onPress={onOpenGuide}>
        <Animated.View style={[styles.orb, {transform: [{scale: pulse}]}]}>
          <AppIcon name="guide" size={22} color={colors.accent} filled />
        </Animated.View>
        <View style={styles.copy}>
          <AppText variant="bodySm" weight="bold" color={colors.primary}>
            Guide IA
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
            {tip}
          </AppText>
        </View>
        <AppText variant="caption" weight="bold" color={colors.accent}>
          Ouvrir
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.float,
  },
  orb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1},
});
