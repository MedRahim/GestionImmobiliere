import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {favoritesApi} from '../api/favorites';
import {useFavorites} from '../context/FavoritesContext';
import {useAuth} from '../context/AuthContext';
import {useLanguage} from '../context/LanguageContext';
import {GuestPrompt} from '../components/GuestPrompt';
import {EmptyState} from '../components/EmptyState';
import {LoadingView} from '../components/LoadingView';
import {PropertyCard} from '../components/PropertyCard';
import {ScreenShell} from '../components/ScreenShell';
import {Property} from '../types';
import {colors} from '../theme';
import {MainStackParamList} from '../navigation/types';

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {isGuest} = useAuth();
  const {t} = useLanguage();
  const {favoriteIds, refreshFavorites} = useFavorites();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await favoritesApi.getAll();
      setProperties(res.properties || []);
    } catch {
      setProperties([]);
    }
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([refreshFavorites(), load()]);
  }, [load, refreshFavorites]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      reload().finally(() => setLoading(false));
    }, [reload]),
  );

  useEffect(() => {
    if (loading) return;
    setProperties(prev =>
      prev.filter(p => favoriteIds.has(p.id || p.propertyId)),
    );
  }, [favoriteIds, loading]);

  if (isGuest) {
    return (
      <ScreenShell title={t('favorites.title')} subtitle={t('favorites.subtitle')} tabScreen>
        <GuestPrompt
          emoji="❤️"
          title={t('favorites.guest.title')}
          message={t('favorites.guest.message')}
        />
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell title={t('favorites.title')} subtitle={t('favorites.subtitle')} tabScreen>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={t('favorites.title')} subtitle={t('favorites.subtitle')} tabScreen>
      <View style={styles.container}>
        <FlatList
          data={properties}
          keyExtractor={item => String(item.id || item.propertyId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({item}) => (
            <PropertyCard
              property={item}
              showFavorite
              onPress={() =>
                navigation.navigate('PropertyDetail', {
                  propertyId: item.id || item.propertyId,
                  property: item,
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState message={t('favorites.empty')} />
          }
          contentContainerStyle={properties.length === 0 ? styles.empty : styles.list}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: 16, paddingTop: 8},
  empty: {flexGrow: 1},
});
