import React, {useEffect, useRef} from 'react';

import {

  Animated,

  Modal,

  Pressable,

  ScrollView,

  StyleSheet,

  View,

} from 'react-native';

import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useNavigation, useNavigationState} from '@react-navigation/native';

import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAppShell} from '../context/AppShellContext';

import {useAuth} from '../context/AuthContext';

import {useAppAlert} from '../context/AlertContext';

import {useLanguage} from '../context/LanguageContext';

import {useRequireAuth} from '../hooks/useRequireAuth';

import {AppIcon, IconName} from './ui/AppIcon';

import {AppText} from './ui/AppText';
import {UserAvatar} from './UserAvatar';

import {Button} from './ui/Button';

import {colors, radius, shadow} from '../theme';

import {MainStackParamList} from '../navigation/types';
import {getFocusedRouteName} from '../navigation/getFocusedRouteName';
import {onRequestOpenTarget} from '../navigation/notificationOpenBus';
import {handleNotificationOpenIfNeeded} from '../services/localPush';
import {NotifNavTarget} from '../navigation/notificationRouting';


type NavScreen = keyof MainStackParamList;



const MENU_ITEMS: {screen: NavScreen; labelKey: string; icon: IconName}[] = [

  {screen: 'Favorites', labelKey: 'nav.favorites', icon: 'heart'},

  {screen: 'Bookings', labelKey: 'menu.bookings', icon: 'listings'},

  {screen: 'Listings', labelKey: 'menu.listings', icon: 'listings'},

  {screen: 'Inquiries', labelKey: 'menu.inquiries', icon: 'inquiries'},

  {screen: 'Notifications', labelKey: 'menu.notifications', icon: 'notifications'},

  {screen: 'AddProperty', labelKey: 'menu.publish', icon: 'publish'},

];



export function AppMenu() {

  const insets = useSafeAreaInsets();

  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const focusedRoute = useNavigationState(state => getFocusedRouteName(state));

  const {menuOpen, closeMenu, unreadCount} = useAppShell();

  const {user, isGuest, logout, openLogin, openRegister} = useAuth();

  const {alert} = useAppAlert();

  const {t} = useLanguage();

  useEffect(() => {
    const unsub = onRequestOpenTarget((target: NotifNavTarget) => {
      try {
        // @ts-expect-error dynamic screen + params
        navigation.navigate(target.screen, target.params);
      } catch {
        navigation.navigate('Notifications');
      }
    });
    const timer = setTimeout(() => handleNotificationOpenIfNeeded(), 350);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [navigation]);

  const {requireAuth} = useRequireAuth();

  const slide = useRef(new Animated.Value(-320)).current;



  useEffect(() => {

    Animated.spring(slide, {

      toValue: menuOpen ? 0 : -320,

      useNativeDriver: true,

      friction: 9,

      tension: 65,

    }).start();

  }, [menuOpen, slide]);



  if (!user && !isGuest) return null;



  const go = (screen: NavScreen) => {

    if (!requireAuth(t('menu.requireAuth'))) return;

    closeMenu();

    setTimeout(() => navigation.navigate(screen as never), 160);

  };



  const handleLogout = () => {

    closeMenu();

    alert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [

      {text: t('common.cancel'), style: 'cancel'},

      {text: t('profile.logout'), style: 'destructive', onPress: logout},

    ], 'confirm');

  };



  return (

    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>

      <Pressable style={styles.backdrop} onPress={closeMenu} />

      <Animated.View

        style={[

          styles.panel,

          {paddingTop: insets.top + 12, transform: [{translateX: slide}]},

        ]}>

        {isGuest ? (

          <>

            <View style={styles.guestHeader}>

              <View style={styles.guestIcon}>

                <AppIcon name="profile" size={28} color={colors.white} filled />

              </View>

              <View style={styles.headerText}>

                <AppText variant="h3" color={colors.white}>

                  {t('menu.guestMode')}

                </AppText>

                <AppText variant="caption" color="rgba(255,255,255,0.85)">

                  {t('menu.exploreGuest')}

                </AppText>

              </View>

              <Pressable onPress={closeMenu} style={styles.closeBtn}>

                <AppIcon name="back" size={22} color={colors.white} boxed filled />

              </Pressable>

            </View>

            <View style={styles.guestBody}>

              <AppText variant="bodySm" color={colors.textSecondary} style={styles.guestMsg}>

                {t('menu.guestMessage')}

              </AppText>

              <Button

                title={t('guest.login')}

                onPress={() => {

                  closeMenu();

                  openLogin();

                }}

              />

              <Button

                title={t('guest.register')}

                onPress={() => {

                  closeMenu();

                  openRegister();

                }}

                variant="outline"

                style={styles.guestBtn}

              />

            </View>

          </>

        ) : (

          <>

            <View style={styles.header}>

              <UserAvatar user={user!} size={48} />

              <View style={styles.headerText}>

                <AppText variant="h3" color={colors.white}>

                  {user!.firstName} {user!.lastName}

                </AppText>

                <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>

                  {user!.email}

                </AppText>

              </View>

              <Pressable onPress={closeMenu} style={styles.closeBtn}>

                <AppIcon name="back" size={22} color={colors.white} boxed filled />

              </Pressable>

            </View>



            <AppText variant="caption" color={colors.textMuted} style={styles.section}>

              {t('menu.myActivity')}

            </AppText>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

              {MENU_ITEMS.map(item => (

                <MenuItem

                  key={item.screen}

                  icon={item.icon}

                  label={t(item.labelKey)}

                  active={focusedRoute === item.screen}

                  badge={item.screen === 'Notifications' ? unreadCount : 0}

                  onPress={() => go(item.screen)}

                />

              ))}

            </ScrollView>



            <Pressable style={styles.logoutBtn} onPress={handleLogout}>

              <AppText variant="button" color={colors.error}>

                {t('menu.logout')}

              </AppText>

            </Pressable>

          </>

        )}

      </Animated.View>

    </Modal>

  );

}



function MenuItem({

  icon,

  label,

  active,

  badge,

  onPress,

}: {

  icon: IconName;

  label: string;

  active?: boolean;

  badge?: number;

  onPress: () => void;

}) {

  return (

    <Pressable

      style={[styles.menuItem, active && styles.menuItemActive]}

      onPress={onPress}>

      <AppIcon name={icon} size={20} color={active ? colors.white : colors.accent} filled={active} boxed />

      <AppText

        variant="body"

        weight={active ? 'bold' : 'regular'}

        color={active ? colors.primary : colors.text}

        style={styles.menuLabel}>

        {label}

      </AppText>

      {badge && badge > 0 ? (

        <View style={styles.menuBadge}>

          <AppText variant="caption" color={colors.white} weight="bold">

            {badge > 9 ? '9+' : badge}

          </AppText>

        </View>

      ) : (

        <AppText variant="bodySm" color={colors.textMuted}>›</AppText>

      )}

    </Pressable>

  );

}



const styles = StyleSheet.create({

  backdrop: {

    ...StyleSheet.absoluteFillObject,

    backgroundColor: 'rgba(22,33,43,0.5)',

  },

  panel: {

    position: 'absolute',

    left: 0,

    top: 0,

    bottom: 0,

    width: '82%',

    maxWidth: 300,

    backgroundColor: colors.surface,

    ...shadow.card,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: colors.gradientMid,

    marginHorizontal: 14,

    borderRadius: radius.lg,

    padding: 14,

    marginBottom: 16,

  },

  guestHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: colors.primary,

    marginHorizontal: 14,

    borderRadius: radius.lg,

    padding: 14,

    marginBottom: 16,

  },

  guestIcon: {

    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(255,255,255,0.2)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  guestBody: {

    paddingHorizontal: 14,

    flex: 1,

  },

  guestMsg: {

    lineHeight: 22,

    marginBottom: 16,

  },

  guestBtn: {

    marginTop: 10,

  },

  avatar: {

    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(255,255,255,0.25)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  headerText: {flex: 1, marginLeft: 12},

  closeBtn: {marginLeft: 4},

  scroll: {flex: 1, paddingHorizontal: 14},

  section: {

    letterSpacing: 1.4,

    marginBottom: 8,

    marginLeft: 18,

  },

  menuItem: {

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: radius.md,

    padding: 12,

    marginBottom: 8,

    backgroundColor: colors.background,

    gap: 12,

  },

  menuItemActive: {

    backgroundColor: colors.accentSoft,

    borderWidth: 1,

    borderColor: colors.accent,

  },

  menuLabel: {flex: 1},

  menuBadge: {

    backgroundColor: colors.error,

    borderRadius: 10,

    minWidth: 20,

    height: 20,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 6,

  },

  logoutBtn: {

    alignItems: 'center',

    marginHorizontal: 14,

    marginTop: 8,

    marginBottom: 20,

    borderWidth: 1.5,

    borderColor: colors.error,

    borderRadius: radius.full,

    padding: 14,

  },

});


