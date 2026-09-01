import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {AppText} from '../ui/AppText';
import {colors, radius} from '../../theme';
import {LANDING_SLIDES} from '../../config/landing';

export {LANDING_SLIDES};

export function SlideVisual({slideId}: {slideId: string}) {
  const slide = LANDING_SLIDES.find(s => s.id === slideId);
  if (!slide) return null;

  return (
    <View style={styles.frame}>
      <Image source={slide.image} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <AppText variant="h3" color={colors.white} weight="bold" style={styles.title}>
          {slide.title}
        </AppText>
        <AppText variant="bodySm" color="rgba(255,255,255,0.9)">
          {slide.subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 220,
    backgroundColor: colors.primary,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingTop: 40,
    backgroundColor: 'rgba(15,34,53,0.72)',
  },
  title: {lineHeight: 24, marginBottom: 6},
});
