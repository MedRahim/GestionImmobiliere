import React, {useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {propertiesApi} from '../api/properties';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';
import {PropertyCard} from '../components/PropertyCard';
import {EmptyState} from '../components/EmptyState';
import {ScreenShell} from '../components/ScreenShell';
import {Button} from '../components/ui/Button';
import {AppText} from '../components/ui/AppText';
import {AMENITY_OPTIONS, PROPERTY_TYPES, Property, PropertyFilters} from '../types';
import {TUNISIA_GOVERNORATES} from '../utils/geo';
import {colors, radius, shadow} from '../theme';
import {MainStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Search'>;

const ALL_TYPES = [{value: '', label: 'Tous'}, ...PROPERTY_TYPES];

export function SearchScreen({navigation, route}: Props) {
  const {alert} = useAppAlert();
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(route.params?.location || '');
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState(route.params?.propertyType || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [minLotSize, setMinLotSize] = useState('');
  const [maxLotSize, setMaxLotSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [amenity, setAmenity] = useState('');
  const [results, setResults] = useState<Property[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const buildFilters = useCallback((): PropertyFilters => {
    const filters: PropertyFilters = {limit: 50};
    if (query.trim()) filters.q = query.trim();
    if (location.trim()) filters.location = location.trim();
    if (state.trim()) filters.state = state.trim();
    if (propertyType) filters.propertyType = propertyType;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (minArea) filters.minArea = minArea;
    if (maxArea) filters.maxArea = maxArea;
    if (minLotSize) filters.minLotSize = minLotSize;
    if (maxLotSize) filters.maxLotSize = maxLotSize;
    if (bedrooms) filters.bedrooms = bedrooms;
    if (bathrooms) filters.bathrooms = bathrooms;
    if (amenity) filters.amenity = amenity;
    return filters;
  }, [
    query, location, state, propertyType, minPrice, maxPrice,
    minArea, maxArea, minLotSize, maxLotSize, bedrooms, bathrooms, amenity,
  ]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await propertiesApi.search(buildFilters());
      setResults(response.data || response.properties || []);
    } catch (error: any) {
      setResults([]);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Connexion impossible. Lancez connect-phone.bat et vérifiez le backend.';
      alert('Recherche impossible', msg, undefined, 'error');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    if (route.params?.location || route.params?.propertyType) {
      const run = async () => {
        setLoading(true);
        setSearched(true);
        try {
          const filters: PropertyFilters = {limit: 50};
          if (route.params?.location) filters.location = route.params.location;
          if (route.params?.propertyType) filters.propertyType = route.params.propertyType;
          const response = await propertiesApi.search(filters);
          setResults(response.data || response.properties || []);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      };
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.location, route.params?.propertyType]);

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setState('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setMinLotSize('');
    setMaxLotSize('');
    setBedrooms('');
    setBathrooms('');
    setAmenity('');
    setResults([]);
    setSearched(false);
  };

  return (
    <ScreenShell title={t('search.title')} subtitle={t('search.subtitle')} tabScreen>
      <View style={styles.container}>
        <ScrollView
          style={[styles.filters, searched && styles.filtersCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Mot-clé global</AppText>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Titre, ville, adresse, équipement..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Type de bien</AppText>
            <View style={styles.chips}>
              {ALL_TYPES.map(type => (
                <Chip
                  key={type.value || 'all'}
                  label={type.label}
                  active={propertyType === type.value}
                  onPress={() => setPropertyType(type.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Localisation</AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              Ville / quartier
            </AppText>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="La Marsa, Sousse centre..."
              placeholderTextColor={colors.textMuted}
            />
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
              Gouvernorat
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.govScroll}>
              <View style={styles.chips}>
                {TUNISIA_GOVERNORATES.map(gov => (
                  <Chip
                    key={gov}
                    label={gov}
                    active={state === gov}
                    onPress={() => setState(state === gov ? '' : gov)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Budget (TND)</AppText>
            <View style={styles.row}>
              <Field label="Min" value={minPrice} onChange={setMinPrice} />
              <Field label="Max" value={maxPrice} onChange={setMaxPrice} />
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Surface & terrain</AppText>
            <View style={styles.row}>
              <Field label="Surface min (m²)" value={minArea} onChange={setMinArea} />
              <Field label="Surface max (m²)" value={maxArea} onChange={setMaxArea} />
            </View>
            <View style={styles.row}>
              <Field label="Terrain min (m²)" value={minLotSize} onChange={setMinLotSize} />
              <Field label="Terrain max (m²)" value={maxLotSize} onChange={setMaxLotSize} />
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Pièces</AppText>
            <View style={styles.row}>
              <Field label="Chambres (min)" value={bedrooms} onChange={setBedrooms} />
              <Field label="Salles de bain (min)" value={bathrooms} onChange={setBathrooms} />
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>Équipements</AppText>
            <View style={styles.chips}>
              {AMENITY_OPTIONS.map(item => (
                <Chip
                  key={item}
                  label={item}
                  active={amenity === item}
                  onPress={() => setAmenity(amenity === item ? '' : item)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title={loading ? t('search.searching') : t('search.find')}
              onPress={handleSearch}
              loading={loading}
              variant="accent"
              style={styles.actionBtn}
            />
            <Button
              title={t('search.reset')}
              onPress={clearFilters}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
            Laissez vide pour voir tous les biens disponibles
          </AppText>
        </ScrollView>

        {searched && (
          <View style={styles.resultsWrap}>
            <AppText variant="bodySm" color={colors.textSecondary} style={styles.resultCount}>
              {results.length} résultat{results.length !== 1 ? 's' : ''}
            </AppText>
            <FlatList
              data={results}
              keyExtractor={item => String(item.id || item.propertyId)}
              contentContainerStyle={styles.resultsContent}
              renderItem={({item}) => (
                <PropertyCard
                  property={item}
                  showFavorite
                  onPress={() => {
                    const id = item.id || item.propertyId;
                    if (!id) {
                      alert('Erreur', 'Données du bien invalides.', undefined, 'error');
                      return;
                    }
                    navigation.navigate('PropertyDetail', {
                      propertyId: Number(id),
                      property: item,
                    });
                  }}
                />
              )}
              ListEmptyComponent={
                <EmptyState message="Aucun bien ne correspond à vos critères" />
              }
            />
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

function Chip({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <AppText variant="bodySm" color={active ? colors.accent : colors.text} weight={active ? 'bold' : 'regular'}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.half}>
      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  filters: {padding: 16, flexGrow: 0},
  filtersCompact: {maxHeight: '52%'},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    ...shadow.soft,
  },
  cardTitle: {marginBottom: 12, letterSpacing: 0.2},
  label: {marginBottom: 6},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
    backgroundColor: colors.surfaceAlt,
    fontFamily: 'sans-serif',
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: {backgroundColor: colors.accentSoft, borderColor: colors.accent},
  govScroll: {marginBottom: 4},
  row: {flexDirection: 'row', gap: 12},
  half: {flex: 1},
  actions: {flexDirection: 'row', gap: 10, marginBottom: 8},
  actionBtn: {flex: 1},
  hint: {textAlign: 'center', marginBottom: 24, lineHeight: 16},
  resultsWrap: {flex: 1, borderTopWidth: 1, borderTopColor: colors.border},
  resultCount: {paddingHorizontal: 16, paddingVertical: 8},
  resultsContent: {padding: 16, paddingTop: 0, paddingBottom: 90},
});

export default SearchScreen;
