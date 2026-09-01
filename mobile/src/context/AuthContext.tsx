import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {authApi, RegisterPayload} from '../api/auth';
import {onSessionExpired} from '../api/sessionEvents';
import {User} from '../types';
import {storage} from '../utils/storage';
import {LoadingView} from '../components/LoadingView';
import {MainStackParamList} from '../navigation/types';
import {requestOpenTarget} from '../navigation/notificationOpenBus';

export type AuthIntent = 'welcome' | 'login' | 'register';

export type AuthReturnTo = {
  screen: keyof MainStackParamList;
  params?: object;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasAppAccess: boolean;
  authOverlay: boolean;
  authIntent: AuthIntent;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  continueAsGuest: () => void;
  openLogin: (returnTo?: AuthReturnTo) => void;
  openRegister: (returnTo?: AuthReturnTo) => void;
  dismissAuthOverlay: () => void;
  clearAuthIntent: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authOverlay, setAuthOverlay] = useState(false);
  const [pendingReturnTo, setPendingReturnTo] = useState<AuthReturnTo | null>(
    null,
  );
  const pendingReturnToRef = useRef<AuthReturnTo | null>(null);
  const [authIntent, setAuthIntent] = useState<AuthIntent>('welcome');
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const response = await authApi.getMe();
    setUser(response.user);
    await storage.setUser(response.user);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          await refreshUser();
        }
      } catch {
        await storage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      // Keep browsing: guest + login overlay (do not unmount MainNavigator)
      setIsGuest(true);
      setAuthOverlay(true);
      setPendingReturnTo(null);
      setAuthIntent('login');
    });
  }, []);

  const finishAuthSuccess = useCallback((nextUser: User) => {
    setIsGuest(false);
    setAuthOverlay(false);
    setAuthIntent('welcome');
    setUser(nextUser);
    const dest = pendingReturnToRef.current;
    pendingReturnToRef.current = null;
    setPendingReturnTo(null);
    if (dest) {
      setTimeout(() => {
        requestOpenTarget({
          screen: dest.screen,
          params: dest.params,
        } as any);
      }, 280);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({email, password});
      await storage.setToken(response.token);
      await storage.setUser(response.user);
      finishAuthSuccess(response.user);
    },
    [finishAuthSuccess],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const response = await authApi.loginWithGoogle(idToken);
      await storage.setToken(response.token);
      await storage.setUser(response.user);
      finishAuthSuccess(response.user);
    },
    [finishAuthSuccess],
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const response = await authApi.register(data);
      await storage.setToken(response.token);
      await storage.setUser(response.user);
      finishAuthSuccess(response.user);
    },
    [finishAuthSuccess],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    await storage.clear();
    setIsGuest(false);
    setAuthOverlay(false);
    setPendingReturnTo(null);
    setAuthIntent('login');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    storage.setUser(updated);
  }, []);

  const continueAsGuest = useCallback(() => {
    // Drop any stale token so guest browsing cannot trigger global 401 logout
    storage.clear().catch(() => {});
    setUser(null);
    setIsGuest(true);
    setAuthOverlay(false);
    setPendingReturnTo(null);
    setAuthIntent('welcome');
  }, []);

  const openLogin = useCallback((returnTo?: AuthReturnTo) => {
    if (returnTo) {
      pendingReturnToRef.current = returnTo;
      setPendingReturnTo(returnTo);
    }
    setAuthIntent('login');
    // Keep guest so MainNavigator stays mounted (auth as overlay)
    setAuthOverlay(true);
  }, []);

  const openRegister = useCallback((returnTo?: AuthReturnTo) => {
    if (returnTo) {
      pendingReturnToRef.current = returnTo;
      setPendingReturnTo(returnTo);
    }
    setAuthIntent('register');
    setAuthOverlay(true);
  }, []);

  const dismissAuthOverlay = useCallback(() => {
    setAuthOverlay(false);
    pendingReturnToRef.current = null;
    setPendingReturnTo(null);
    setAuthIntent('welcome');
  }, []);

  const clearAuthIntent = useCallback(() => {
    setAuthIntent('welcome');
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isGuest,
      hasAppAccess: !!user || isGuest,
      authOverlay,
      authIntent,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      refreshUser,
      continueAsGuest,
      openLogin,
      openRegister,
      dismissAuthOverlay,
      clearAuthIntent,
    }),
    [
      user,
      isGuest,
      authOverlay,
      authIntent,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      refreshUser,
      continueAsGuest,
      openLogin,
      openRegister,
      dismissAuthOverlay,
      clearAuthIntent,
    ],
  );

  if (loading) {
    return <LoadingView />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
