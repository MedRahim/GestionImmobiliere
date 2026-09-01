import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppState} from 'react-native';
import {notificationsApi} from '../api/notifications';
import {messagesApi} from '../api/messages';
import {
  attachNotifeeHandlers,
  bootstrapNotifications,
  openNotificationSettings,
  shouldShowNotificationDeniedHint,
  syncPushFromServer,
} from '../services/localPush';
import {useAuth} from './AuthContext';
import {useAppAlert} from './AlertContext';
import {useLanguage} from './LanguageContext';

interface AppShellContextValue {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  unreadCount: number;
  messageUnreadCount: number;
  refreshUnread: () => Promise<void>;
  refreshMessageUnread: () => Promise<void>;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({children}: {children: React.ReactNode}) {
  const {isAuthenticated} = useAuth();
  const {alert} = useAppAlert();
  const {t} = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const busy = useRef(false);
  const msgBusy = useRef(false);
  const alertRef = useRef(alert);
  const tRef = useRef(t);
  alertRef.current = alert;
  tRef.current = t;

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated || busy.current) {
      if (!isAuthenticated) setUnreadCount(0);
      return;
    }
    busy.current = true;
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // ignore (incl. 429)
    } finally {
      busy.current = false;
    }
  }, [isAuthenticated]);

  const refreshMessageUnread = useCallback(async () => {
    if (!isAuthenticated || msgBusy.current) {
      if (!isAuthenticated) setMessageUnreadCount(0);
      return;
    }
    msgBusy.current = true;
    try {
      const res = await messagesApi.getConversations();
      const total = (res.conversations || []).reduce(
        (sum, c) => sum + (Number(c.unreadCount) || 0),
        0,
      );
      setMessageUnreadCount(total);
    } catch {
      // ignore
    } finally {
      msgBusy.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setMessageUnreadCount(0);
      return;
    }

    let cancelled = false;
    let syncing = false;

    const tick = async (withPush: boolean) => {
      if (cancelled || AppState.currentState !== 'active' || syncing) return;
      syncing = true;
      try {
        await Promise.all([refreshUnread(), refreshMessageUnread()]);
        if (withPush) {
          await syncPushFromServer();
        }
      } catch {
        // ignore
      } finally {
        syncing = false;
      }
    };

    (async () => {
      await bootstrapNotifications();
      if (cancelled) return;
      try {
        if (await shouldShowNotificationDeniedHint()) {
          alertRef.current(
            tRef.current('notif.enableTitle') || 'Notifications',
            tRef.current('notif.enableBody') ||
              'Activez les notifications pour être alerté des messages et annonces.',
            [
              {text: tRef.current('common.cancel') || 'Plus tard', style: 'cancel'},
              {
                text: tRef.current('home.openSettings') || 'Réglages',
                onPress: () => openNotificationSettings(),
              },
            ],
            'info',
          );
        }
      } catch {
        // ignore
      }
      await tick(true);
    })();

    const interval = setInterval(() => tick(true), 90000);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') tick(true);
    });

    const unsub = attachNotifeeHandlers(() => {
      refreshUnread();
      refreshMessageUnread();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
      unsub();
    };
  }, [isAuthenticated, refreshUnread, refreshMessageUnread]);

  const value = useMemo(
    () => ({
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      unreadCount,
      messageUnreadCount,
      refreshUnread,
      refreshMessageUnread,
    }),
    [menuOpen, unreadCount, messageUnreadCount, refreshUnread, refreshMessageUnread],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
