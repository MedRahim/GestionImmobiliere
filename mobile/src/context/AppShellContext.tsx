import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

import {notificationsApi} from '../api/notifications';
import {useAuth} from './AuthContext';

interface AppShellContextValue {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({children}: {children: React.ReactNode}) {
  const {isAuthenticated} = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      unreadCount,
      refreshUnread,
    }),
    [menuOpen, unreadCount, refreshUnread],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
