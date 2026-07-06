import React, {useEffect, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {propertiesApi} from '../api/properties';
import {inquiriesApi} from '../api/inquiries';
import {messagesApi} from '../api/messages';
import {aiApi} from '../api/ai';
import {useAuth} from '../context/AuthContext';
import {useAppAlert} from '../context/AlertContext';
import {useLanguage} from '../context/LanguageContext';
import {useRequireAuth} from '../hooks/useRequireAuth';
import {LoadingView} from '../components/LoadingView';
import {ScreenShell} from '../components/ScreenShell';
import {Button} from '../components/ui/Button';
import {Badge} from '../components/ui/Badge';
import {FavoriteHeart} from '../components/ui/FavoriteHeart';
import {Property, PROPERTY_TYPES} from '../types';
import {colors, radius, shadow} from '../theme';
import {MainStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyDetail'>;

export function PropertyDetailScreen({route, navigation}: Props) {
  const {propertyId, property: initial} = route.params;
  const {user} = useAuth();
  const {alert} = useAppAlert();
  const {requireAuth} = useRequireAuth();
  const {t, locale} = useLanguage();
  const [property, setProperty] = useState<Property | null>(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (!propertyId || Number.isNaN(Number(propertyId))) {
      alert('Erreur', 'Ce bien est introuvable.', undefined, 'error');
      navigation.goBack();
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const response = await propertiesApi.getById(Number(propertyId));
        setProperty(response.property);
      } catch {
        if (!initial) {
          alert('Erreur', 'Ce bien est introuvable ou plus disponible.', undefined, 'error');
          navigation.goBack();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId, initial, navigation, alert]);

  const handleContact = async () => {
    if (!requireAuth('contacter le vendeur')) return;
    if (!property) return;
    const seller = property.owner;
    if (!seller?.id) return;
    const myId = user?.id || user?.userId;
    if (seller.id === myId) {
      alert('Info', 'Ceci est votre annonce', undefined, 'info');
      return;
    }
    setContacting(true);
    try {
      let message = `Bonjour, je suis intéressé(e) par "${property.title}".`;
      try {
        const ai = await aiApi.contactMessage(property, locale);
        if (ai.data.message) message = ai.data.message;
      } catch {
        // fallback message
      }
      await inquiriesApi.create({
        propertyId: property.id || property.propertyId,
        message,
        subject: `Intérêt: ${property.title}`,
      });
      await messagesApi.send({
        receiverId: seller.id,
        message,
        propertyId: property.id,
      });
      alert('Message envoyé', 'Le vendeur a reçu votre demande.', [
        {
          text: 'Voir la conversation',
          onPress: () =>
            navigation.navigate('Chat', {
              userId: seller.id,
              userName: seller.name,
            }),
        },
        {text: 'OK'},
      ], 'success');
    } catch (e: any) {
      alert('Erreur', e?.response?.data?.message || 'Envoi impossible', undefined, 'error');
    } finally {
      setContacting(false);
    }
  };

  if (loading || !property) {
    return (
      <ScreenShell title="Détail" showBack>
        <LoadingView />
      </ScreenShell>
    );
  }

  const typeLabel =
    PROPERTY_TYPES.find(t => t.value === property.propertyType)?.label ||
    property.propertyType;
  const images = property.images?.length
    ? property.images
    : property.featuredImage
    ? [property.featuredImage]
    : [];

  return (
    <ScreenShell title="Détail du bien" subtitle={property.title} showBack>
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {images[0] ? (
          <View style={styles.heroWrap}>
            <Image source={{uri: images[0]}} style={styles.hero} />
            <FavoriteHeart
              propertyId={property.id || property.propertyId}
              size={24}
              style={styles.heroHeart}
            />
          </View>
        ) : (
          <View style={[styles.hero, styles.placeholder]}>
            <Text style={{fontSize: 64}}>🏡</Text>
          </View>
        )}

        <View style={styles.content}>
          <Badge label={typeLabel} />
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.price}>
            {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
          </Text>

          <View style={styles.metaRow}>
            {property.bedrooms != null && (
              <Text style={styles.meta}>🛏 {property.bedrooms} ch.</Text>
            )}
            {property.bathrooms != null && (
              <Text style={styles.meta}>🚿 {property.bathrooms} sdb</Text>
            )}
            <Text style={styles.meta}>👁 {property.viewCount || 0}</Text>
          </View>

          <Text style={styles.section}>Localisation</Text>
          <Text style={styles.text}>
            📍 {property.address || property.city || property.location}
          </Text>

          {property.description && (
            <>
              <Text style={styles.section}>Description</Text>
              <Text style={styles.text}>{property.description}</Text>
            </>
          )}

          {property.owner && (
            <View style={styles.sellerCard}>
              <Text style={styles.section}>Vendeur</Text>
              <Text style={styles.sellerName}>{property.owner.name}</Text>
              {property.owner.email && (
                <Text style={styles.sellerInfo}>{property.owner.email}</Text>
              )}
              {property.owner.phone && (
                <Text style={styles.sellerInfo}>{property.owner.phone}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {property.owner && (user?.id || user?.userId) !== property.owner.id && (
        <View style={styles.footer}>
          <Button
            title={t('guide.askAboutProperty')}
            variant="secondary"
            onPress={() =>
              navigation.navigate('AIAssistant', {
                propertyId: property.id || property.propertyId,
                propertyTitle: property.title,
              })
            }
            style={styles.guideBtn}
          />
          <Button
            title="Contacter le vendeur"
            onPress={handleContact}
            loading={contacting}
          />
        </View>
      )}
    </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  hero: {width: '100%', height: 260},
  heroWrap: {position: 'relative'},
  heroHeart: {position: 'absolute', top: 14, right: 14},
  placeholder: {backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center'},
  content: {padding: 20},
  title: {fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 10},
  price: {fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 8},
  metaRow: {flexDirection: 'row', gap: 16, marginTop: 12},
  meta: {fontSize: 14, color: colors.textSecondary},
  section: {fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 8},
  text: {fontSize: 15, color: colors.textSecondary, lineHeight: 22},
  sellerCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.lg,
    marginTop: 8,
    ...shadow.card,
  },
  sellerName: {fontSize: 16, fontWeight: '700', color: colors.text},
  sellerInfo: {fontSize: 14, color: colors.textSecondary, marginTop: 4},
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  guideBtn: {marginBottom: 0},
});
