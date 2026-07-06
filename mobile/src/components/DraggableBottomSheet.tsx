import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {AppText} from './ui/AppText';
import {colors, radius, shadow} from '../theme';

const {height: SCREEN_H} = Dimensions.get('window');
const SNAP_COLLAPSED = SCREEN_H * 0.14;
const SNAP_HALF = SCREEN_H * 0.44;
const SNAP_EXPANDED = SCREEN_H * 0.78;

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
}

export function DraggableBottomSheet({title, subtitle, children, refreshControl}: Props) {
  const heightAnim = useRef(new Animated.Value(SNAP_HALF)).current;
  const currentHeight = useRef(SNAP_HALF);
  const [expanded, setExpanded] = useState(false);

  const snapTo = useCallback(
    (target: number) => {
      currentHeight.current = target;
      setExpanded(target >= SNAP_EXPANDED - 20);
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start();
    },
    [heightAnim],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        heightAnim.stopAnimation(v => {
          currentHeight.current = typeof v === 'number' ? v : SNAP_HALF;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          SNAP_EXPANDED,
          Math.max(SNAP_COLLAPSED, currentHeight.current - g.dy),
        );
        heightAnim.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = currentHeight.current - g.dy - g.vy * 40;
        const snaps = [SNAP_COLLAPSED, SNAP_HALF, SNAP_EXPANDED];
        const nearest = snaps.reduce((best, snap) =>
          Math.abs(snap - projected) < Math.abs(best - projected) ? snap : best,
        );
        snapTo(nearest);
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.sheet, {height: heightAnim}]}>
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <AppText variant="caption" color={colors.textMuted}>
          Glissez pour agrandir
        </AppText>
      </View>

      <View style={styles.header}>
        <AppText variant="h3" color={colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySm" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={expanded}
        refreshControl={refreshControl}
        nestedScrollEnabled>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    zIndex: 11,
    ...shadow.card,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 24,
  },
  handle: {
    width: 52,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: 4,
  },
  header: {paddingHorizontal: 20, paddingBottom: 8},
  subtitle: {marginTop: 2},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 88},
});
