import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {authApi, RegisterPayload} from '../api/auth';
import {User} from '../types';
import {storage} from '../utils/storage';
import {LoadingView} from '../components/LoadingView';

export type AuthIntent = 'welcome' | 'login' | 'register';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasAppAccess: boolean;
  authIntent: AuthIntent;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  continueAsGuest: () => void;
  openLogin: () => void;
  openRegister: () => void;
  clearAuthIntent: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
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

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({email, password});
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setIsGuest(false);
    setAuthIntent('welcome');
    setUser(response.user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await authApi.loginWithGoogle(idToken);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setIsGuest(false);
    setAuthIntent('welcome');
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const response = await authApi.register(data);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setIsGuest(false);
    setAuthIntent('welcome');
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    await storage.clear();
    setIsGuest(false);
    setAuthIntent('welcome');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    storage.setUser(updated);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setAuthIntent('welcome');
  }, []);

  const openLogin = useCallback(() => {
    setIsGuest(false);
    setAuthIntent('login');
  }, []);

  const openRegister = useCallback(() => {
    setIsGuest(false);
    setAuthIntent('register');
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
      clearAuthIntent,
    }),
    [
      user,
      isGuest,
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
