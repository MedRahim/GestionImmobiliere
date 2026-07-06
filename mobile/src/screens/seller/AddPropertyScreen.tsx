import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {propertiesApi} from '../../api/properties';
import {aiApi} from '../../api/ai';
import {useAppAlert} from '../../context/AlertContext';
import {useLanguage} from '../../context/LanguageContext';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {Screen} from '../../components/ui/Screen';
import {ScreenShell} from '../../components/ScreenShell';
import {AppText} from '../../components/ui/AppText';
import {PropertyImagePicker, ImageSlot} from '../../components/PropertyImagePicker';
import {
  AMENITY_OPTIONS,
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
} from '../../types';
import {TUNISIA_GOVERNORATES} from '../../utils/geo';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

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
  const [condition, setCondition] = useState(existing?.status || 'good');
  const [amenities, setAmenities] = useState<string[]>(existing?.amenities || []);
  const [galleryImages, setGalleryImages] = useState<ImageSlot[]>([]);
  const [urlInputs, setUrlInputs] = useState<[string, string]>([
    existing?.featuredImage || existing?.images?.[0] || '',
    existing?.images?.[1] || '',
  ]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const runGenerateListing = async () => {
    setAiLoading(true);
    try {
      const res = await aiApi.generateListing(
        {title, description, city, price, propertyType, bedrooms, area, amenities},
        locale,
      );
      setTitle(res.data.title || title);
      setDescription(res.data.description || description);
      alert('IA', 'Annonce générée', undefined, 'success');
    } catch {
      alert('IA', 'Génération impossible', undefined, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const runEstimatePrice = async () => {
    setAiLoading(true);
    try {
      const res = await aiApi.estimatePrice(
        {city, propertyType, bedrooms, area, squareFeet: area, lotSize},
        locale,
      );
      const mid = Math.round((res.data.minPrice + res.data.maxPrice) / 2);
      setPrice(String(mid));
      alert('Estimation IA', res.data.explanation, undefined, 'info');
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

  const handleUrlChange = (index: number, value: string) => {
    setUrlInputs(prev => {
      const next: [string, string] = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title || !price || !city) {
      alert('Erreur', 'Titre, prix et ville sont obligatoires', undefined, 'error');
      return;
    }
    if (galleryImages.some(img => img.uploading)) {
      alert('Patientez', "Une image est encore en cours d'envoi", undefined, 'info');
      return;
    }
    setLoading(true);
    try {
      const uploadedUrls = galleryImages.map(img => img.url).filter(Boolean) as string[];
      const urlImages = urlInputs.filter(Boolean);
      const images = [...uploadedUrls, ...urlImages];
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
        condition,
        status: condition,
        amenities,
        images,
        featuredImage: images[0] || null,
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
            Outils IA
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
        <Section title="Photos" subtitle="Galerie ou liens URL">
          <PropertyImagePicker
            images={galleryImages}
            onChange={setGalleryImages}
            urlInputs={urlInputs}
            onUrlChange={handleUrlChange}
          />
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
          <Input label="Prix (TND) *" value={price} onChangeText={setPrice} keyboardType="numeric" />
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
            {TUNISIA_GOVERNORATES.slice(0, 12).map(gov => (
              <Chip key={gov} label={gov} active={state === gov} onPress={() => setState(state === gov ? '' : gov)} />
            ))}
          </View>
          <Input label="Adresse précise" value={address} onChangeText={setAddress} placeholder="Rue, numéro, résidence..." />
        </Section>

        <Section title="Dimensions & pièces" subtitle="Comme Mooshir — surface, terrain, pièces">
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
