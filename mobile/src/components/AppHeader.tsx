import React from 'react';
import {Image, Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppShell} from '../context/AppShellContext';
import {useTheme} from '../context/ThemeContext';
import {useRequireAuth} from '../hooks/useRequireAuth';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {BRAND_NAME, brandLogo} from '../config/brand';
import {getFocusedRouteName} from '../navigation/getFocusedRouteName';
import {radius} from '../theme';
import {MainStackParamList} from '../navigation/types';

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  tabScreen?: boolean;
  variant?: 'default' | 'map';
  showSearch?: boolean;
  showNotifications?: boolean;
}

/** Per-route defaults — keep action buttons consistent across screens */
const ACTIONS_BY_ROUTE: Record<string, {search: boolean; notifications: boolean}> = {
  Home: {search: true, notifications: true},
  Favorites: {search: true, notifications: true},
  Search: {search: false, notifications: true},
  Profile: {search: false, notifications: true},
  Messages: {search: true, notifications: true},
  Chat: {search: false, notifications: false},
  AIAssistant: {search: true, notifications: true},
  PropertyDetail: {search: true, notifications: true},
  Listings: {search: true, notifications: true},
  Inquiries: {search: false, notifications: true},
  Notifications: {search: false, notifications: false},
  AddProperty: {search: false, notifications: false},
  ChangePassword: {search: false, notifications: false},
  Language: {search: false, notifications: false},
  Bookings: {search: false, notifications: true},
};

export function AppHeader({
  title,
  subtitle,
  showBack,
  tabScreen: _tabScreen,
  variant = 'default',
  showSearch,
  showNotifications,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const focusedRoute = useNavigationState(state => getFocusedRouteName(state));
  const {openMenu, unreadCount} = useAppShell();
  const {requireAuth} = useRequireAuth();
  const {colors} = useTheme();
  const isMap = variant === 'map';

  const styles = useThemedStyles((c, sh) => ({
    /** White bar everywhere — same as Messages */
    wrap: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 12,
      paddingHorizontal: 14,
      ...sh.header,
    },
    row: {flexDirection: 'row' as const, alignItems: 'center' as const},
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: 'rgba(13,184,196,0.35)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconPlaceholder: {width: 42, height: 42},
    center: {flex: 1, alignItems: 'center' as const, paddingHorizontal: 6},
    logoRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8},
    logoImg: {width: 34, height: 34},
    brand: {letterSpacing: 0.2},
    rightActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      minWidth: 42,
      justifyContent: 'flex-end' as const,
    },
    badge: {
      position: 'absolute' as const,
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.error,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: c.surface,
    },
  }));

  const preset = ACTIONS_BY_ROUTE[focusedRoute || ''] || {
    search: !showBack,
    notifications: true,
  };
  const searchVisible = showSearch ?? preset.search;
  const notifVisible = showNotifications ?? preset.notifications;

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const leftAction = showBack ? handleBack : openMenu;
  const leftIcon = showBack ? ('back' as const) : ('menu' as const);
  const iconColor = colors.primary;
  const brandParts = String(BRAND_NAME || 'Immo Dary').split(/\s+/);

  return (
    <View style={[styles.wrap, {paddingTop: insets.top + 6}]}>
      <View style={styles.row}>
        <Pressable style={styles.iconBtn} onPress={leftAction} hitSlop={8}>
          <AppIcon name={leftIcon} size={22} color={iconColor} />
        </Pressable>

        <View style={styles.center}>
          <View style={styles.logoRow}>
            <Image source={brandLogo} style={styles.logoImg} resizeMode="contain" />
            <View>
              <AppText variant="body" color={colors.primary} weight="bold" style={styles.brand}>
                {brandParts[0] || 'Immo'}
                {brandParts.length > 1 ? (
                  <AppText variant="body" color={colors.accent} weight="bold">
                    {' '}
                    {brandParts.slice(1).join(' ')}
                  </AppText>
                ) : null}
              </AppText>
              {(title || subtitle) && !isMap ? (
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {title}
                  {subtitle ? ` · ${subtitle}` : ''}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.rightActions}>
          {searchVisible ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Search')}
              hitSlop={8}
              accessibilityLabel="Recherche">
              <AppIcon name="search" size={22} color={iconColor} />
            </Pressable>
          ) : null}
          {notifVisible ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                if (!requireAuth('voir vos notifications')) return;
                navigation.navigate('Notifications');
              }}
              hitSlop={8}
              accessibilityLabel="Notifications">
              <AppIcon name="notifications" size={22} color={iconColor} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText variant="caption" color={colors.white} weight="bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </AppText>
                </View>
              )}
            </Pressable>
          ) : !searchVisible ? (
            <View style={styles.iconPlaceholder} />
          ) : null}
        </View>
      </View>
    </View>
  );
}
