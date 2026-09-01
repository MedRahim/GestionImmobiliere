import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {favoritesApi} from '../api/favorites';
import {useAuth} from './AuthContext';

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  isFavorite: (propertyId: number) => boolean;
  toggleFavorite: (propertyId: number) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({children}: {children: React.ReactNode}) {
  const {isAuthenticated} = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await favoritesApi.getIds();
      setFavoriteIds(new Set(res.ids || []));
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback(
    (propertyId: number) => favoriteIds.has(propertyId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (propertyId: number) => {
      const id = propertyId;
      const wasFavorite = favoriteIds.has(id);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (wasFavorite) {
          await favoritesApi.remove(id);
        } else {
          await favoritesApi.add(id);
        }
      } catch (err) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (wasFavorite) next.add(id);
          else next.delete(id);
          return next;
        });
        throw err;
      }
    },
    [favoriteIds],
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      isFavorite,
      toggleFavorite,
      refreshFavorites,
      loading,
    }),
    [favoriteIds, isFavorite, toggleFavorite, refreshFavorites, loading],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
