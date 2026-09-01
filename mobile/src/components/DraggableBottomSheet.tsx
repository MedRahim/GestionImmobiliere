import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  ListRenderItem,
  PanResponder,
  RefreshControl,
  View,
} from 'react-native';
import {AppText} from './ui/AppText';
import {useLanguage} from '../context/LanguageContext';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {layout, radius} from '../theme';

const {height: SCREEN_H} = Dimensions.get('window');
export const SHEET_SNAP_COLLAPSED = SCREEN_H * 0.14;
export const SHEET_SNAP_HALF = SCREEN_H * 0.44;
export const SHEET_SNAP_EXPANDED = SCREEN_H * 0.78;

interface Props<T> {
  title: string;
  subtitle?: string;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
  onSnap?: (height: number) => void;
  /** Shared animated height so map FABs can sit just above the sheet */
  heightAnim?: Animated.Value;
  extraData?: unknown;
  horizontal?: boolean;
  headerRight?: React.ReactNode;
  /** Rendered under title, outside FlatList (safe for horizontal lists) */
  belowHeader?: React.ReactNode;
}

export function DraggableBottomSheet<T>({
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  ListHeaderComponent,
  ListEmptyComponent,
  refreshControl,
  onSnap,
  heightAnim: externalHeightAnim,
  extraData,
  horizontal = false,
  headerRight,
  belowHeader,
}: Props<T>) {
  const {t} = useLanguage();
  const {colors} = useTheme();
  const styles = useThemedStyles((c, sh) => ({
    sheet: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      zIndex: 11,
      borderTopWidth: 1,
      borderColor: c.borderSoft,
      ...sh.float,
    },
    handleArea: {
      alignItems: 'center' as const,
      paddingTop: 12,
      paddingBottom: 4,
      paddingHorizontal: 24,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      marginBottom: 6,
    },
    header: {paddingHorizontal: 22, paddingBottom: 10},
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
    },
    headerText: {flex: 1},
    title: {fontSize: 28, lineHeight: 34},
    subtitle: {marginTop: 4},
    list: {flex: 1},
    listContent: {paddingHorizontal: 16, paddingBottom: layout.tabBarClearance},
    listContentHorizontal: {
      paddingHorizontal: 16,
      paddingBottom: layout.tabBarClearance,
    },
  }));

  const internalAnim = useRef(new Animated.Value(SHEET_SNAP_HALF)).current;
  const heightAnim = externalHeightAnim || internalAnim;
  const currentHeight = useRef(SHEET_SNAP_HALF);
  const [scrollable, setScrollable] = useState(true);
  const onSnapRef = useRef(onSnap);
  onSnapRef.current = onSnap;

  useEffect(() => {
    heightAnim.setValue(SHEET_SNAP_HALF);
    currentHeight.current = SHEET_SNAP_HALF;
  }, [heightAnim]);

  const snapTo = useCallback(
    (target: number) => {
      currentHeight.current = target;
      setScrollable(target >= SHEET_SNAP_HALF - 20);
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start(({finished}) => {
        if (finished) onSnapRef.current?.(target);
      });
    },
    [heightAnim],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        heightAnim.stopAnimation(v => {
          currentHeight.current = typeof v === 'number' ? v : SHEET_SNAP_HALF;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          SHEET_SNAP_EXPANDED,
          Math.max(SHEET_SNAP_COLLAPSED, currentHeight.current - g.dy),
        );
        heightAnim.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = currentHeight.current - g.dy - g.vy * 40;
        const snaps = [SHEET_SNAP_COLLAPSED, SHEET_SNAP_HALF, SHEET_SNAP_EXPANDED];
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
          {t('home.sheetHint')}
        </AppText>
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <AppText variant="display" color={colors.primary} style={styles.title}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="bodySm" color={colors.textSecondary} style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {headerRight}
        </View>
      </View>

      {belowHeader ? <View style={{paddingHorizontal: 16}}>{belowHeader}</View> : null}

      <FlatList
        style={styles.list}
        contentContainerStyle={
          horizontal ? styles.listContentHorizontal : styles.listContent
        }
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={horizontal ? null : ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={horizontal}
        scrollEnabled={scrollable}
        refreshControl={horizontal ? undefined : refreshControl}
        nestedScrollEnabled
        removeClippedSubviews={!horizontal}
        initialNumToRender={horizontal ? 3 : 4}
        maxToRenderPerBatch={horizontal ? 4 : 6}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        extraData={extraData}
      />
    </Animated.View>
  );
}
