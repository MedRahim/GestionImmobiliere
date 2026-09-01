import React from 'react';
import {Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppIcon, IconName} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {UserAvatar} from './UserAvatar';
import {useAppShell} from '../context/AppShellContext';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {getFocusedRouteName} from '../navigation/getFocusedRouteName';
import {radius} from '../theme';
import {MainStackParamList} from '../navigation/types';

type TabScreen = 'Home' | 'Search' | 'Guide' | 'Messages' | 'Profile';

type TabItem =
  | {screen: TabScreen; labelKey: string; icon: IconName; action?: undefined}
  | {screen: 'Guide'; labelKey: string; icon: IconName; action: 'guide'};

const TABS: TabItem[] = [
  {screen: 'Home', labelKey: 'nav.map', icon: 'home'},
  {screen: 'Search', labelKey: 'nav.search', icon: 'search'},
  {screen: 'Guide', labelKey: 'nav.guide', icon: 'guide', action: 'guide'},
  {screen: 'Messages', labelKey: 'nav.messages', icon: 'messages'},
  {screen: 'Profile', labelKey: 'nav.profile', icon: 'profile'},
];

const HIDDEN_ON: (keyof MainStackParamList)[] = [
  'PropertyDetail',
  'Chat',
  'AddProperty',
  'Listings',
  'Inquiries',
  'Bookings',
  'Notifications',
  'Language',
  'AIAssistant',
  'ChangePassword',
];

export function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const focusedRoute = useNavigationState(state => getFocusedRouteName(state));
  const {messageUnreadCount} = useAppShell();
  const {user, isGuest} = useAuth();
  const {t} = useLanguage();
  const {colors} = useTheme();
  const styles = useThemedStyles((c, sh) => ({
    dock: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      ...sh.header,
    },
    bar: {
      flexDirection: 'row' as const,
      paddingTop: 8,
      paddingHorizontal: 4,
    },
    tab: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 3,
      paddingVertical: 6,
    },
    label: {fontSize: 10, letterSpacing: 0.2},
    badge: {
      position: 'absolute' as const,
      top: 0,
      right: '20%' as const,
      minWidth: 16,
      height: 16,
      borderRadius: radius.full,
      backgroundColor: c.error,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 4,
    },
    badgeText: {fontSize: 9, letterSpacing: 0},
  }));

  if (focusedRoute && HIDDEN_ON.includes(focusedRoute as keyof MainStackParamList)) {
    return null;
  }

  return (
    <View style={[styles.dock, {paddingBottom: Math.max(insets.bottom, 8)}]} pointerEvents="box-none">
      <View style={styles.bar}>
        {TABS.map(tab => {
          const active = tab.action === 'guide' ? false : focusedRoute === tab.screen;
          const showAvatar = tab.screen === 'Profile' && user && !isGuest;
          const color = active ? colors.accent : colors.textMuted;

          return (
            <Pressable
              key={tab.screen}
              style={styles.tab}
              onPress={() => {
                if (tab.action === 'guide') {
                  navigation.navigate('AIAssistant');
                  return;
                }
                navigation.navigate(tab.screen);
              }}>
              {showAvatar ? (
                <UserAvatar user={user} size={24} active={active} />
              ) : (
                <AppIcon
                  name={tab.icon}
                  size={24}
                  color={color}
                  filled={active}
                />
              )}
              <AppText variant="caption" color={color} style={styles.label}>
                {t(tab.labelKey)}
              </AppText>
              {tab.screen === 'Messages' && messageUnreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText
                    variant="caption"
                    color={colors.white}
                    weight="bold"
                    style={styles.badgeText}>
                    {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
