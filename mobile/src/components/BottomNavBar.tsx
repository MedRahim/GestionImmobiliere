import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppIcon, IconName} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {UserAvatar} from './UserAvatar';
import {useAppShell} from '../context/AppShellContext';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {colors, radius, shadow} from '../theme';
import {Property} from '../types';
import {MainStackParamList} from '../navigation/types';

type TabScreen = 'Home' | 'Favorites' | 'Guide' | 'Messages' | 'Profile';

type TabItem =
  | {screen: TabScreen; labelKey: string; icon: IconName; action?: undefined}
  | {screen: 'Guide'; labelKey: string; icon: IconName; action: 'guide'};

const TABS: TabItem[] = [
  {screen: 'Home', labelKey: 'nav.map', icon: 'home'},
  {screen: 'Favorites', labelKey: 'nav.favorites', icon: 'heart'},
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
  'Notifications',
  'Language',
  'AIAssistant',
];

export function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute();
  const {unreadCount} = useAppShell();
  const {user, isGuest} = useAuth();
  const {t} = useLanguage();

  if (HIDDEN_ON.includes(route.name as keyof MainStackParamList)) {
    return null;
  }

  return (
    <View style={[styles.bar, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      {TABS.map(tab => {
        const active = tab.action === 'guide' ? false : route.name === tab.screen;
        const showAvatar = tab.screen === 'Profile' && user && !isGuest;

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
              <UserAvatar user={user} size={28} active={active} />
            ) : (
              <AppIcon
                name={tab.icon}
                size={24}
                color={active ? colors.accent : colors.textMuted}
                filled={active}
              />
            )}
            <AppText
              variant="caption"
              color={active ? colors.accent : colors.textMuted}
              weight={active ? 'bold' : 'regular'}
              style={styles.label}>
              {t(tab.labelKey)}
            </AppText>
            {tab.screen === 'Messages' && unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText variant="caption" color={colors.white} weight="bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    ...shadow.header,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  label: {fontSize: 10, letterSpacing: 0.2},
  badge: {
    position: 'absolute',
    top: 0,
    right: '22%',
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
