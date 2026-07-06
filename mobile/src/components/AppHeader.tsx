import React, {useEffect} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppShell} from '../context/AppShellContext';
import {useRequireAuth} from '../hooks/useRequireAuth';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {BRAND_NAME, brandLogo} from '../config/brand';
import {colors, radius, shadow} from '../theme';
import {MainStackParamList} from '../navigation/types';

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  tabScreen?: boolean;
  variant?: 'default' | 'map';
}

export function AppHeader({
  title,
  subtitle,
  showBack,
  tabScreen,
  variant = 'default',
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {openMenu, unreadCount, refreshUnread} = useAppShell();
  const {requireAuth, isAuthenticated} = useRequireAuth();
  const isMap = variant === 'map';

  useEffect(() => {
    if (isAuthenticated) {
      refreshUnread();
    }
  }, [refreshUnread, isAuthenticated]);

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const leftAction = showBack ? handleBack : openMenu;
  const leftIcon = showBack ? 'back' as const : 'menu' as const;

  return (
    <View
      style={[
        styles.wrap,
        isMap && styles.wrapMap,
        tabScreen && styles.wrapTab,
        !isMap && !tabScreen && {paddingTop: insets.top + 8},
        tabScreen && {paddingTop: insets.top + 6},
      ]}>
      <View style={styles.row}>
        <Pressable
          style={[styles.iconBtn, (isMap || tabScreen) && styles.iconBtnLight]}
          onPress={leftAction}
          hitSlop={8}>
          <AppIcon
            name={leftIcon}
            size={22}
            color={isMap || tabScreen ? colors.text : colors.white}
          />
        </Pressable>

        <View style={styles.center}>
          <View style={styles.logoRow}>
            <Image source={brandLogo} style={styles.logoImg} resizeMode="contain" />
            <View>
              <AppText
                variant="bodySm"
                color={isMap || tabScreen ? colors.primary : colors.white}
                weight="bold"
                style={styles.brand}>
                {BRAND_NAME}
              </AppText>
              {(title || subtitle) && (
                <AppText
                  variant="caption"
                  color={isMap || tabScreen ? colors.textMuted : 'rgba(255,255,255,0.75)'}
                  numberOfLines={1}>
                  {title}
                  {subtitle ? ` · ${subtitle}` : ''}
                </AppText>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rightActions}>
          <Pressable
            style={[styles.iconBtn, (isMap || tabScreen) && styles.iconBtnLight]}
            onPress={() => navigation.navigate('Search')}
            hitSlop={8}>
            <AppIcon name="search" size={22} color={isMap || tabScreen ? colors.text : colors.white} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, (isMap || tabScreen) && styles.iconBtnLight]}
            onPress={() => {
              if (!requireAuth('voir vos notifications')) return;
              navigation.navigate('Notifications');
            }}
            hitSlop={8}>
            <AppIcon name="notifications" size={22} color={isMap || tabScreen ? colors.text : colors.white} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText variant="caption" color={colors.white} weight="bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.gradientMid,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow.header,
  },
  wrapMap: {
    backgroundColor: colors.mapOverlay,
    marginHorizontal: 10,
    marginTop: 6,
    borderRadius: radius.lg,
    paddingTop: 8,
    paddingBottom: 10,
    ...shadow.header,
  },
  wrapTab: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 12,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnLight: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: {flex: 1, alignItems: 'center', paddingHorizontal: 6},
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  logoImg: {width: 34, height: 34},
  brand: {letterSpacing: 0.5},
  rightActions: {flexDirection: 'row', alignItems: 'center', gap: 6},
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
