import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {propertiesApi} from '../api/properties';
import {useLanguage} from '../context/LanguageContext';
import {useAppAlert} from '../context/AlertContext';
import {AppHeader} from '../components/AppHeader';
import {DraggableBottomSheet} from '../components/DraggableBottomSheet';
import {EmptyState} from '../components/EmptyState';
import {MapViewOSM, MapViewOSMHandle} from '../components/MapViewOSM';
import {PropertyMapCard} from '../components/PropertyMapCard';
import {AppIcon} from '../components/ui/AppIcon';
import {Property} from '../types';
import {MainStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';
import {getUserLocation, openLocationSettings} from '../utils/userLocation';

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();
  const {alert} = useAppAlert();
  const [properties, setProperties] = useState<Property[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const mapRef = useRef<MapViewOSMHandle>(null);

  const loadProperties = useCallback(async () => {
    try {
      const response = await propertiesApi.getAll({limit: 40});
      const next = response.data || response.properties || [];
      setProperties(prev => {
        const sig = (list: Property[]) =>
          list.map(p => p.id || p.propertyId).join(',');
        return sig(prev) === sig(next) ? prev : next;
      });
    } catch {
      // Keep existing listings if refresh fails
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProperties();
    } finally {
      setRefreshing(false);
    }
  };

  const openProperty = (item: Property) => {
    navigation.navigate('PropertyDetail', {
      propertyId: item.id || item.propertyId,
      property: item,
    });
  };

  const onLocateMe = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const {coords, status} = await getUserLocation();
      if (status === 'denied') {
        alert(t('home.locateMe'), t('home.locationDenied'), [
          {text: t('common.cancel'), style: 'cancel'},
          {text: t('home.openSettings'), onPress: openLocationSettings},
        ], 'info');
        return;
      }
      if (!coords) {
        alert(t('home.locateMe'), t('home.locationUnavailable'), [
          {text: t('common.cancel'), style: 'cancel'},
          {text: t('home.openSettings'), onPress: openLocationSettings},
        ], 'info');
        return;
      }
      mapRef.current?.showUserLocation(
        coords.latitude,
        coords.longitude,
        coords.accuracy,
      );
      setLocationActive(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapViewOSM
        ref={mapRef}
        properties={properties}
        onPropertyPress={openProperty}
        onClusterPress={cluster =>
          navigation.navigate('Search', {location: cluster.label})
        }
      />

      <View style={[styles.headerOverlay, {paddingTop: insets.top}]}>
        <AppHeader variant="map" />
      </View>

      <View style={styles.fabColumn}>
        <Pressable
          style={[styles.mapFab, locationActive && styles.mapFabActive]}
          onPress={onLocateMe}
          accessibilityLabel={t('home.locateMe')}>
          {locating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <AppIcon
              name="myLocation"
              size={22}
              color={locationActive ? colors.accent : colors.text}
              filled={locationActive}
              boxed
            />
          )}
        </Pressable>
        <Pressable
          style={styles.mapFab}
          onPress={() => navigation.navigate('AddProperty')}>
          <AppIcon name="publish" size={26} color={colors.white} filled boxed />
        </Pressable>
      </View>

      <DraggableBottomSheet
        title={t('home.title')}
        subtitle={t('home.subtitle', {count: properties.length})}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }>
        {properties.length === 0 ? (
          <EmptyState message={t('home.empty')} />
        ) : (
          <FlatList
            data={properties}
            keyExtractor={item => String(item.id || item.propertyId)}
            renderItem={({item}) => (
              <PropertyMapCard property={item} onPress={() => openProperty(item)} />
            )}
            scrollEnabled={false}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
          />
        )}
      </DraggableBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fabColumn: {
    position: 'absolute',
    right: 18,
    bottom: '42%',
    zIndex: 12,
    gap: 12,
    alignItems: 'center',
  },
  mapFab: {
    ...shadow.soft,
  },
  mapFabActive: {
    borderRadius: radius.md,
  },
});
