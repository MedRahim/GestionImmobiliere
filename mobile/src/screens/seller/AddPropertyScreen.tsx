import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {propertiesApi} from '../../api/properties';
import {propertyExtrasApi} from '../../api/propertyExtras';
import {aiApi} from '../../api/ai';
import {useAppAlert} from '../../context/AlertContext';
import {useLanguage} from '../../context/LanguageContext';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {Screen} from '../../components/ui/Screen';
import {ScreenShell} from '../../components/ScreenShell';
import {AppText} from '../../components/ui/AppText';
import {
  PropertyMediaPicker,
  ImageSlot,
} from '../../components/PropertyMediaPicker';
import {
  AMENITY_OPTIONS,
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
} from '../../types';
import {TUNISIA_GOVERNORATES, getCityCenter} from '../../utils/geo';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';
import {API_HOST} from '../../config/api';
import {resolveMediaUrl} from '../../utils/propertyImage';

type Props = NativeStackScreenProps<MainStackParamList, 'AddProperty'>;

export function AddPropertyScreen({navigation, route}: Props) {
  const {alert} = useAppAlert();
  const {locale} = useLanguage();
  const edit = route.params?.editMode;
  const existing = route.params?.property;

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price?.toString() || '');
  const [city, setCity] = useState(existing?.city || existing?.location || '');
  const [state, setState] = useState(existing?.state || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [bedrooms, setBedrooms] = useState(existing?.bedrooms?.toString() || '');
  const [bathrooms, setBathrooms] = useState(existing?.bathrooms?.toString() || '');
  const [area, setArea] = useState(existing?.squareFeet?.toString() || '');
  const [lotSize, setLotSize] = useState(existing?.lotSize?.toString() || '');
  const [yearBuilt, setYearBuilt] = useState(existing?.yearBuilt?.toString() || '');
  const [propertyType, setPropertyType] = useState(existing?.propertyType || 'apartment');
  const [listingType, setListingType] = useState<'sale' | 'rent'>(
    existing?.listingType === 'rent' ? 'rent' : 'sale',
  );
  const [condition, setCondition] = useState(existing?.condition || existing?.status || 'good');
  const [depositAmount, setDepositAmount] = useState(
    existing?.depositAmount != null ? String(existing.depositAmount) : '',
  );
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  const [availabilityRanges, setAvailabilityRanges] = useState<
    {startDate: string; endDate: string; status: 'available' | 'blocked' | 'booked'}[]
  >([]);
  const [amenities, setAmenities] = useState<string[]>(existing?.amenities || []);
  const [galleryImages, setGalleryImages] = useState<ImageSlot[]>(() => {
    const imgs =
      existing?.images?.length
        ? existing.images
        : existing?.featuredImage
          ? [existing.featuredImage]
          : [];
    return imgs
      .filter(Boolean)
      .map((url: string) => ({uri: url, url}));
  });
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl || '');
  const [videoLocalUri, setVideoLocalUri] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const id = existing?.id || existing?.propertyId;
    if (!id || existing?.listingType !== 'rent') return;
    let cancelled = false;
    propertyExtrasApi
      .getAvailability(Number(id))
      .then(res => {
        if (cancelled || !res.ranges?.length) return;
        setAvailabilityRanges(
          res.ranges.map(r => ({
            startDate: String(r.startDate).slice(0, 10),
            endDate: String(r.endDate).slice(0, 10),
            status: (r.status as 'available' | 'blocked' | 'booked') || 'available',
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [existing?.id, existing?.propertyId, existing?.listingType]);

  const collectImageUrls = () => {
    return (galleryImages.map(img => img.url).filter(Boolean) as string[])
      .map(u => {
        if (/^https?:\/\//i.test(u)) return u;
        if (u.startsWith('/')) return `${API_HOST}${u}`;
        return resolveMediaUrl(u) || u;
      })
      .filter(u => /^https?:\/\//i.test(u));
  };

  const requirePhotosReady = () => {
    if (galleryImages.some(img => img.uploading)) {
      alert('Patientez', "Une photo est encore en cours d'envoi.", undefined, 'info');
      return false;
    }
    if (galleryImages.length === 0) {
      alert(
        'Photos requises',
        'Ajoutez au moins une photo avant d’utiliser l’IA.',
        undefined,
        'info',
      );
      return false;
    }
    const imageUrls = collectImageUrls();
    if (imageUrls.length === 0) {
      alert(
        'Photos requises',
        'Attendez la fin de l’upload des photos, puis réessayez.',
        undefined,
        'info',
      );
      return false;
    }
    return true;
  };

  const runGenerateListing = async () => {
    if (!requirePhotosReady()) return;
    const imageUrls = collectImageUrls();
    setAiLoading(true);
    try {
      const res = await aiApi.generateListing(
        {
          title,
          description,
          city,
          price,
          propertyType,
          bedrooms,
          area,
          amenities,
          condition,
          listingType,
          imageUrls,
          featuredImage: imageUrls[0],
        },
        locale,
      );
      const data = res.data as any;
      setTitle(data.title || title);
      setDescription(data.description || description);
      if (data.suggestedCondition && !existing?.condition) {
        setCondition(data.suggestedCondition);
      }
      if (Array.isArray(data.suggestedAmenities) && data.suggestedAmenities.length) {
        setAmenities(prev => [...new Set([...prev, ...data.suggestedAmenities])]);
      }
      alert(
        'IA',
        data.imageSummary
          ? `Annonce générée à partir des photos.\n${data.imageSummary}`
          : 'Annonce générée',
        undefined,
        'success',
      );
    } catch {
      alert('IA', 'Génération impossible — ajoutez des photos et réessayez', undefined, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const runEstimatePrice = async () => {
    if (!requirePhotosReady()) return;
    const imageUrls = collectImageUrls();
    setAiLoading(true);
    try {
      const res = await aiApi.estimatePrice(
        {
          city,
          state,
          propertyType,
          bedrooms,
          bathrooms,
          area,
          squareFeet: area,
          lotSize,
          condition,
          amenities,
          listingType,
          imageUrls,
          featuredImage: imageUrls[0],
        },
        locale,
      );
      const mid = Math.round((res.data.minPrice + res.data.maxPrice) / 2);
      setPrice(String(mid));
      const extra = (res.data as any).imageSummary
        ? `\n\nPhotos: ${(res.data as any).imageSummary}`
        : '';
      alert('Estimation IA', `${res.data.explanation}${extra}`, undefined, 'info');
    } catch {
      alert('IA', 'Estimation impossible', undefined, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAmenity = (item: string) => {
    setAmenities(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item],
    );
  };

  const handleSubmit = async () => {
    if (!title || !price || !city) {
      alert('Erreur', 'Titre, prix et ville sont obligatoires', undefined, 'error');
      return;
    }
    if (galleryImages.some(img => img.uploading) || videoUploading) {
      alert('Patientez', "Un média est encore en cours d'envoi", undefined, 'info');
      return;
    }
    setLoading(true);
    try {
      const images = galleryImages.map(img => img.url).filter(Boolean) as string[];
      const resolvedVideo =
        resolveMediaUrl(videoUrl) || videoUrl || null;
      const coords = getCityCenter(city || state || 'Tunis');
      const payload = {
        title,
        description,
        price: Number(price),
        city,
        state: state || null,
        governorate: state || null,
        location: city,
        address: address || city,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        squareFeet: area ? Number(area) : null,
        area: area ? Number(area) : null,
        lotSize: lotSize ? Number(lotSize) : null,
        yearBuilt: yearBuilt ? Number(yearBuilt) : null,
        propertyType,
        listingType,
        condition,
        status: 'active',
        rentPeriod: listingType === 'rent' ? 'day' : null,
        depositAmount:
          listingType === 'rent' && depositAmount ? Number(depositAmount) : null,
        availabilityRanges: listingType === 'rent' ? availabilityRanges : undefined,
        amenities,
        images,
        featuredImage: images[0] || null,
        videoUrl: resolvedVideo,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      if (edit && existing) {
        await propertiesApi.update(existing.id || existing.propertyId, payload);
      } else {
        await propertiesApi.create(payload);
      }
      alert('Succès', edit ? 'Annonce mise à jour' : 'Annonce publiée', undefined, 'success');
      navigation.goBack();
    } catch (e: any) {
      alert('Erreur', e?.response?.data?.message || 'Échec de la publication', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      title={edit ? 'Modifier' : 'Publier'}
      subtitle="Détails du bien"
      showBack>
      <Screen scroll style={styles.scrollPad}>
        <View style={styles.aiBar}>
          <AppText variant="bodySm" color={colors.textSecondary} style={styles.aiLabel}>
            Outils IA — photos obligatoires (état + équipements)
          </AppText>
          <View style={styles.aiBtns}>
            <Pressable style={styles.aiChip} onPress={runGenerateListing} disabled={aiLoading}>
              <AppText variant="caption" color={colors.primary}>Générer texte</AppText>
            </Pressable>
            <Pressable style={styles.aiChip} onPress={runEstimatePrice} disabled={aiLoading}>
              <AppText variant="caption" color={colors.primary}>Estimer prix</AppText>
            </Pressable>
          </View>
        </View>
        <Section
          title="Ajouter photo ou vidéo"
          subtitle="La vidéo apparaît en premier sur l'annonce. Photos utiles pour l'IA.">
          <PropertyMediaPicker
            images={galleryImages}
            onChange={setGalleryImages}
            videoUrl={videoUrl || null}
            videoLocalUri={videoLocalUri}
            videoUploading={videoUploading}
            onVideoUploading={setVideoUploading}
            onVideoChange={({url, localUri}) => {
              setVideoUrl(url || '');
              setVideoLocalUri(localUri ?? null);
            }}
          />
        </Section>

        <Section title="Type d'annonce">
          <View style={styles.chips}>
            <Chip
              label="À vendre"
              active={listingType === 'sale'}
              onPress={() => setListingType('sale')}
            />
            <Chip
              label="À louer"
              active={listingType === 'rent'}
              onPress={() => setListingType('rent')}
            />
          </View>
          <Input
            label={listingType === 'rent' ? 'Prix par jour (TND) *' : 'Prix (TND) *'}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          {listingType === 'rent' ? (
            <>
              <Input
                label="Caution (TND)"
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
              />
              <AppText variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
                Périodes disponibles (AAAA-MM-JJ)
              </AppText>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input
                    label="Début"
                    value={availStart}
                    onChangeText={setAvailStart}
                    placeholder="2026-08-01"
                  />
                </View>
                <View style={styles.half}>
                  <Input
                    label="Fin"
                    value={availEnd}
                    onChangeText={setAvailEnd}
                    placeholder="2026-08-31"
                  />
                </View>
              </View>
              <Pressable
                style={styles.aiChip}
                onPress={() => {
                  if (!availStart || !availEnd) {
                    alert('Erreur', 'Indiquez début et fin (AAAA-MM-JJ)', undefined, 'error');
                    return;
                  }
                  setAvailabilityRanges(prev => [
                    ...prev,
                    {startDate: availStart, endDate: availEnd, status: 'available'},
                  ]);
                  setAvailStart('');
                  setAvailEnd('');
                }}>
                <AppText variant="caption" color={colors.primary}>
                  + Ajouter période disponible
                </AppText>
              </Pressable>
              {availabilityRanges.map((r, i) => (
                <AppText key={`${r.startDate}-${i}`} variant="caption" color={colors.textSecondary}>
                  • {r.startDate} → {r.endDate}
                </AppText>
              ))}
            </>
          ) : null}
        </Section>

        <Section title="Informations générales">
          <Input label="Titre *" value={title} onChangeText={setTitle} placeholder="Villa avec piscine..." />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textArea}
            placeholder="Décrivez le bien, le quartier, les avantages..."
          />
        </Section>

        <Section title="Type & état">
          <AppText variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
            Type de bien
          </AppText>
          <View style={styles.chips}>
            {PROPERTY_TYPES.map(t => (
              <Chip key={t.value} label={t.label} active={propertyType === t.value} onPress={() => setPropertyType(t.value)} />
            ))}
          </View>
          <AppText variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
            État du bien
          </AppText>
          <View style={styles.chips}>
            {PROPERTY_CONDITIONS.map(c => (
              <Chip key={c.value} label={c.label} active={condition === c.value} onPress={() => setCondition(c.value)} />
            ))}
          </View>
        </Section>

        <Section title="Localisation">
          <Input label="Ville / Quartier *" value={city} onChangeText={setCity} placeholder="La Marsa" />
          <AppText variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
            Gouvernorat
          </AppText>
          <View style={styles.chips}>
            {TUNISIA_GOVERNORATES.map(gov => (
              <Chip key={gov} label={gov} active={state === gov} onPress={() => setState(state === gov ? '' : gov)} />
            ))}
          </View>
          <Input label="Adresse précise" value={address} onChangeText={setAddress} placeholder="Rue, numéro, résidence..." />
        </Section>

        <Section title="Dimensions & pièces" subtitle="Surface, terrain, pièces">
          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Surface (m²)" value={area} onChangeText={setArea} keyboardType="numeric" placeholder="120" />
            </View>
            <View style={styles.half}>
              <Input label="Terrain (m²)" value={lotSize} onChangeText={setLotSize} keyboardType="numeric" placeholder="300" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Chambres" value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Input label="Salles de bain" value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
            </View>
          </View>
          <Input label="Année de construction" value={yearBuilt} onChangeText={setYearBuilt} keyboardType="numeric" placeholder="2020" />
        </Section>

        <Section title="Équipements">
          <View style={styles.chips}>
            {AMENITY_OPTIONS.map(item => (
              <Chip
                key={item}
                label={item}
                active={amenities.includes(item)}
                onPress={() => toggleAmenity(item)}
              />
            ))}
          </View>
        </Section>

        <Button
          title={edit ? 'Enregistrer les modifications' : "Publier l'annonce"}
          onPress={handleSubmit}
          loading={loading}
          variant="accent"
          style={styles.submit}
        />
      </Screen>
    </ScreenShell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="h3" style={styles.sectionTitle}>{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.sectionSub}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

function Chip({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <AppText variant="bodySm" color={active ? colors.white : colors.text} weight={active ? 'bold' : 'regular'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollPad: {paddingBottom: 40},
  aiBar: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  aiLabel: {marginBottom: 8},
  aiBtns: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  aiChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    ...shadow.soft,
  },
  sectionTitle: {marginBottom: 4, letterSpacing: 0.3},
  sectionSub: {marginBottom: 12},
  fieldLabel: {marginBottom: 8, marginTop: 4},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  row: {flexDirection: 'row', gap: 12},
  half: {flex: 1},
  textArea: {minHeight: 100, textAlignVertical: 'top'},
  submit: {marginTop: 8, marginBottom: 32},
});
