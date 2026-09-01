import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {propertiesApi} from '../api/properties';
import {useLanguage} from '../context/LanguageContext';
import {useAppAlert} from '../context/AlertContext';
import {AppHeader} from '../components/AppHeader';
import {
  DraggableBottomSheet,
  SHEET_SNAP_HALF,
} from '../components/DraggableBottomSheet';
import {EmptyState} from '../components/EmptyState';
import {MapViewOSM, MapViewOSMHandle} from '../components/MapViewOSM';
import {PropertyMapCard} from '../components/PropertyMapCard';
import {AppIcon} from '../components/ui/AppIcon';
import {AppText} from '../components/ui/AppText';
import {Property} from '../types';
import {MainStackParamList} from '../navigation/types';
import {radius} from '../theme';
import {getUserLocation, openLocationSettings} from '../utils/userLocation';
import {useRequireAuth} from '../hooks/useRequireAuth';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {getPropertyCoords} from '../utils/geo';
import {
  consumeMapFocus,
  subscribeMapFocus,
} from '../utils/mapFocus';

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

const FAB_STACK_H = 100;
const FAB_GAP = 12;

export function HomeScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();
  const {alert} = useAppAlert();
  const {requireAuth} = useRequireAuth();
  const {colors} = useTheme();
  const styles = useThemedStyles((c, sh) => ({
    container: {flex: 1, backgroundColor: c.background},
    headerOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    filterRow: {flexDirection: 'row' as const, gap: 8, marginBottom: 14},
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderSoft,
    },
    filterChipOn: {backgroundColor: c.primary, borderColor: c.primary},
    filterText: {fontSize: 13, fontWeight: '700' as const, color: c.text},
    filterTextOn: {color: c.white},
    focusedCard: {
      borderRadius: radius.xl,
      borderWidth: 2,
      borderColor: c.accent,
      marginBottom: 14,
      overflow: 'hidden' as const,
    },
    previewWrap: {
      position: 'absolute' as const,
      left: 16,
      right: 16,
      zIndex: 14,
      ...sh.float,
    },
    previewClose: {
      position: 'absolute' as const,
      top: -10,
      right: -6,
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    fabColumnLeft: {
      position: 'absolute' as const,
      left: 14,
      zIndex: 12,
      gap: 10,
      alignItems: 'center' as const,
    },
    fabColumn: {
      position: 'absolute' as const,
      right: 14,
      zIndex: 12,
      gap: 10,
      alignItems: 'center' as const,
    },
    mapFab: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.borderSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...sh.float,
    },
    zoomLabel: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: c.primary,
      lineHeight: 30,
    },
    mapFabActive: {
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderWidth: 2,
    },
    publishFab: {
      backgroundColor: c.accent,
      borderColor: c.accentDark,
      width: 56,
      height: 56,
      borderRadius: 18,
    },
    locationChip: {
      marginHorizontal: 14,
      marginTop: 8,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: c.borderSoft,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      ...sh.float,
    },
    locationChipText: {flex: 1, color: c.text, fontSize: 12, fontWeight: '600' as const},
  }));

  const sheetHeight = useRef(new Animated.Value(SHEET_SNAP_HALF)).current;
  const mapControlsMinTop = insets.top + 72;
  const screenH = Dimensions.get('window').height;
  const maxFabBottom = Math.max(
    SHEET_SNAP_HALF,
    screenH - mapControlsMinTop - FAB_STACK_H,
  );
  const fabBottom = useMemo(
    () =>
      sheetHeight.interpolate({
        inputRange: [0, maxFabBottom - FAB_GAP],
        outputRange: [FAB_GAP, maxFabBottom],
        extrapolate: 'clamp',
      }),
    [sheetHeight, maxFabBottom],
  );
  const previewBottom = useMemo(
    () =>
      sheetHeight.interpolate({
        inputRange: [0, maxFabBottom - FAB_STACK_H],
        outputRange: [FAB_STACK_H + FAB_GAP, maxFabBottom + FAB_STACK_H - 20],
        extrapolate: 'clamp',
      }),
    [sheetHeight, maxFabBottom],
  );

  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [listingFilter, setListingFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [highlightId, setHighlightId] = useState<number | undefined>();
  const [preview, setPreview] = useState<Property | null>(null);
  const mapRef = useRef<MapViewOSMHandle>(null);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocus = useRef<{
    latitude: number;
    longitude: number;
    zoom: number;
    propertyId?: number;
  } | null>(null);
  const homeFocused = useRef(false);
  const lastFetchAt = useRef(0);

  const runPendingFly = useCallback(() => {
    const target = pendingFocus.current;
    if (!target || !homeFocused.current) return;
    if (flyTimer.current) clearTimeout(flyTimer.current);
    let attempt = 0;
    const run = () => {
      const next = pendingFocus.current;
      if (!next || !homeFocused.current) return;
      attempt += 1;
      mapRef.current?.invalidateSize();
      mapRef.current?.flyTo(next.latitude, next.longitude, next.zoom);
      if (attempt < 10) {
        flyTimer.current = setTimeout(run, 280 + attempt * 120);
      } else {
        pendingFocus.current = null;
      }
    };
    flyTimer.current = setTimeout(run, 200);
  }, []);

  const applyMapFocus = useCallback(
    (focus: {
      latitude: number;
      longitude: number;
      zoom?: number;
      propertyId?: number;
    }) => {
      if (
        !Number.isFinite(focus.latitude) ||
        !Number.isFinite(focus.longitude)
      ) {
        return;
      }
      pendingFocus.current = {
        latitude: focus.latitude,
        longitude: focus.longitude,
        zoom: focus.zoom ?? 16,
        propertyId: focus.propertyId,
      };
      if (focus.propertyId) setHighlightId(focus.propertyId);
      setPreview(null);
      runPendingFly();
    },
    [runPendingFly],
  );

  const loadProperties = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchAt.current < 8000) return;
    lastFetchAt.current = now;
    try {
      const response = await propertiesApi.getAll({
        limit: 100,
        ...(listingFilter !== 'all' ? {listingType: listingFilter} : {}),
      });
      const next = response.data || response.properties || [];
      const total =
        response.pagination?.total ?? response.total ?? next.length;
      setTotalCount(total);
      setLoadError(false);
      setProperties(prev => {
        const sig = (list: Property[]) =>
          list.map(p => p.id || p.propertyId).join(',');
        return sig(prev) === sig(next) ? prev : next;
      });
    } catch {
      setLoadError(true);
    }
  }, [listingFilter]);

  useEffect(() => {
    lastFetchAt.current = 0;
    loadProperties(true);
  }, [listingFilter, loadProperties]);

  useEffect(() => {
    return () => {
      if (flyTimer.current) clearTimeout(flyTimer.current);
    };
  }, []);

  // Capture navigation params without cancelling in-flight flyTo retries
  useEffect(() => {
    const focus = route.params;
    if (
      focus?.focusLatitude == null ||
      focus?.focusLongitude == null ||
      !Number.isFinite(focus.focusLatitude) ||
      !Number.isFinite(focus.focusLongitude)
    ) {
      return;
    }
    applyMapFocus({
      latitude: focus.focusLatitude,
      longitude: focus.focusLongitude,
      zoom: focus.focusZoom ?? 16,
      propertyId: focus.focusPropertyId,
    });
    navigation.setParams({
      focusLatitude: undefined,
      focusLongitude: undefined,
      focusZoom: undefined,
      focusPropertyId: undefined,
    } as any);
  }, [
    applyMapFocus,
    navigation,
    route.params?.focusLatitude,
    route.params?.focusLongitude,
    route.params?.focusZoom,
    route.params?.focusPropertyId,
  ]);

  useEffect(() => {
    return subscribeMapFocus(focus => {
      applyMapFocus({
        latitude: focus.latitude,
        longitude: focus.longitude,
        zoom: focus.zoom ?? 16,
        propertyId: focus.propertyId,
      });
    });
  }, [applyMapFocus]);

  useFocusEffect(
    useCallback(() => {
      homeFocused.current = true;
      loadProperties();
      const fromBus = consumeMapFocus();
      if (fromBus) {
        applyMapFocus({
          latitude: fromBus.latitude,
          longitude: fromBus.longitude,
          zoom: fromBus.zoom ?? 16,
          propertyId: fromBus.propertyId,
        });
      } else if (pendingFocus.current) {
        runPendingFly();
      }
      return () => {
        homeFocused.current = false;
        if (flyTimer.current) clearTimeout(flyTimer.current);
      };
    }, [loadProperties, applyMapFocus, runPendingFly]),
  );

  const visibleProperties = useMemo(() => {
    // List always shows all loaded annonces; map still uses full set for pins
    return properties;
  }, [properties]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProperties(true);
    } finally {
      setRefreshing(false);
    }
  };

  const openProperty = useCallback(
    (item: Property) => {
      setPreview(null);
      navigation.navigate('PropertyDetail', {
        propertyId: item.id || item.propertyId,
        property: item,
      });
    },
    [navigation],
  );

  const onPinSelect = useCallback(
    (item: Property) => {
      const id = item.id || item.propertyId;
      setPreview(item);
      setHighlightId(id);
      const coords = getPropertyCoords(item);
      if (coords) {
        mapRef.current?.flyTo(coords.latitude, coords.longitude, 14);
      }
    },
    [],
  );

  const onLocateMe = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const {coords, status} = await getUserLocation({
        quick: false,
        withAddress: true,
        preferCacheMaxAgeMs: 0,
      });
      if (status === 'denied' || !coords) {
        setLocationActive(false);
        setLocationLabel(null);
        openLocationSettings();
        alert(
          t('home.locateMe'),
          status === 'denied'
            ? t('home.locationDenied')
            : t('home.locationUnavailable'),
          [
            {text: t('common.cancel'), style: 'cancel'},
            {text: t('home.openSettings'), onPress: openLocationSettings},
          ],
          'info',
        );
        return;
      }
      mapRef.current?.showUserLocation(
        coords.latitude,
        coords.longitude,
        coords.accuracy,
      );
      mapRef.current?.flyTo(coords.latitude, coords.longitude, 16);
      setLocationActive(true);
      const acc =
        coords.accuracy != null && coords.accuracy < 200
          ? ` · ±${Math.round(coords.accuracy)} m`
          : '';
      setLocationLabel(
        coords.address
          ? `${coords.address}${acc}`
          : `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}${acc}`,
      );
    } finally {
      setLocating(false);
    }
  };

  const renderItem = useCallback(
    ({item}: {item: Property}) => {
      const id = item.id || item.propertyId;
      const focused = highlightId === id;
      return (
        <View style={focused ? styles.focusedCard : undefined}>
          <PropertyMapCard
            property={item}
            onPress={() => {
              setHighlightId(id);
              openProperty(item);
            }}
          />
        </View>
      );
    },
    [highlightId, openProperty, styles.focusedCard],
  );

  const listHeader = (
    <View style={styles.filterRow}>
      {(
        [
          {id: 'all' as const, label: 'Tous'},
          {id: 'sale' as const, label: 'À vendre'},
          {id: 'rent' as const, label: 'À louer'},
        ] as const
      ).map(f => (
        <Pressable
          key={f.id}
          style={[styles.filterChip, listingFilter === f.id && styles.filterChipOn]}
          onPress={() => setListingFilter(f.id)}>
          <Text
            style={[
              styles.filterText,
              listingFilter === f.id && styles.filterTextOn,
            ]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const listEmpty = (
    <EmptyState
      message={loadError ? t('common.loadError') : t('home.empty')}
      actionLabel={loadError ? t('common.retry') : t('menu.publish')}
      onAction={() => {
        if (loadError) {
          loadProperties(true);
          return;
        }
        if (!requireAuth(t('menu.requireAuth'))) return;
        navigation.navigate('AddProperty');
      }}
    />
  );

  return (
    <View style={styles.container}>
      <MapViewOSM
        ref={mapRef}
        properties={properties}
        highlightPropertyId={highlightId}
        onPropertyPress={onPinSelect}
        onClusterPress={cluster => {
          setPreview(null);
          mapRef.current?.flyTo(cluster.latitude, cluster.longitude, 12);
        }}
      />

      <View style={styles.headerOverlay}>
        <AppHeader variant="map" showSearch />
        {locationLabel ? (
          <View style={styles.locationChip}>
            <AppIcon name="myLocation" size={18} color={colors.accent} filled />
            <Text style={styles.locationChipText} numberOfLines={2}>
              {locationLabel}
            </Text>
            <Pressable onPress={() => setLocationLabel(null)} hitSlop={8}>
              <AppIcon name="close" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <Animated.View
        style={[styles.fabColumnLeft, {bottom: fabBottom}]}
        pointerEvents="box-none">
        <Pressable
          style={styles.mapFab}
          onPress={() => mapRef.current?.zoomIn()}
          accessibilityLabel="Zoom +">
          <Text style={styles.zoomLabel}>+</Text>
        </Pressable>
        <Pressable
          style={styles.mapFab}
          onPress={() => mapRef.current?.zoomOut()}
          accessibilityLabel="Zoom -">
          <Text style={styles.zoomLabel}>-</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[styles.fabColumn, {bottom: fabBottom}]}
        pointerEvents="box-none">
        <Pressable
          style={[styles.mapFab, locationActive && styles.mapFabActive]}
          onPress={onLocateMe}
          accessibilityLabel={t('home.locateMe')}>
          {locating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <AppIcon
              name="myLocation"
              size={24}
              color={locationActive ? colors.accent : colors.primary}
              filled={locationActive}
            />
          )}
        </Pressable>
        <Pressable
          style={[styles.mapFab, styles.publishFab]}
          onPress={() => {
            if (!requireAuth('publier une annonce')) return;
            navigation.navigate('AddProperty');
          }}
          accessibilityLabel="Publier">
          <AppIcon name="publish" size={28} color={colors.white} filled />
        </Pressable>
      </Animated.View>

      {preview ? (
        <Animated.View
          style={[styles.previewWrap, {bottom: previewBottom}]}
          pointerEvents="box-none">
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreview(null)}
            accessibilityLabel="Fermer">
            <AppIcon name="close" size={16} color={colors.white} />
          </Pressable>
          <PropertyMapCard property={preview} onPress={() => openProperty(preview)} />
        </Animated.View>
      ) : null}

      <DraggableBottomSheet
        title={t('home.title')}
        subtitle={t('home.subtitle', {
          count: totalCount || properties.length,
        })}
        heightAnim={sheetHeight}
        data={visibleProperties}
        keyExtractor={item => String(item.id || item.propertyId)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        extraData={highlightId}
        onSnap={() => mapRef.current?.invalidateSize()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}
