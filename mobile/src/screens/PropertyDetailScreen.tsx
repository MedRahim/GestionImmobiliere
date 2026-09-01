import React, {useEffect, useRef, useState} from 'react';
import {
  findNodeHandle,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {propertiesApi} from '../api/properties';
import {propertyExtrasApi} from '../api/propertyExtras';
import {bookingsApi} from '../api/bookings';
import {inquiriesApi} from '../api/inquiries';
import {useAuth} from '../context/AuthContext';
import {useAppAlert} from '../context/AlertContext';
import {useRequireAuth} from '../hooks/useRequireAuth';
import {LoadingView} from '../components/LoadingView';
import {ScreenShell} from '../components/ScreenShell';
import {PropertyImageGallery} from '../components/PropertyImageGallery';
import {MapViewOSM} from '../components/MapViewOSM';
import {AvailabilityCalendar} from '../components/AvailabilityCalendar';
import {BookingConfirmModal, PayMethod} from '../components/BookingConfirmModal';
import {
  BuyInterestModal,
  BuyMethod,
  buyMethodDraft,
} from '../components/BuyInterestModal';
import {PropertyGuidePresence} from '../components/PropertyGuidePresence';
import {StarRating} from '../components/StarRating';
import {Button} from '../components/ui/Button';
import {AppIcon} from '../components/ui/AppIcon';
import {AppText} from '../components/ui/AppText';
import {FavoriteHeart} from '../components/ui/FavoriteHeart';
import {
  AvailabilityRange,
  NearbyPlace,
  Property,
  PropertyReview,
} from '../types';
import {colors, radius, shadow} from '../theme';
import {MainStackParamList} from '../navigation/types';
import {resolveMediaUrl, resolvePropertyImageUrl} from '../utils/propertyImage';
import {buildPropertyMarkers} from '../utils/geo';
import {requestMapFocus} from '../utils/mapFocus';

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyDetail'>;

const POI_LABEL: Record<string, string> = {
  pharmacy: 'Pharmacie',
  hospital: 'Santé',
  school: 'École',
  cafe: 'Café',
  bank: 'Banque',
  mosque: 'Mosquée',
  supermarket: 'Courses',
  park: 'Parc',
};

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PropertyDetailScreen({route, navigation}: Props) {
  const {propertyId, property: initial} = route.params;
  const insets = useSafeAreaInsets();
  const {user, isAuthenticated} = useAuth();
  const {alert} = useAppAlert();
  const {requireAuth} = useRequireAuth();
  const [property, setProperty] = useState<Property | null>(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [buyOpen, setBuyOpen] = useState(false);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [pendingStripeSessionId, setPendingStripeSessionId] = useState<string | null>(null);
  const [pendingStripeBookingId, setPendingStripeBookingId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const calendarRef = useRef<View>(null);
  const calendarY = useRef(0);

  const scrollToCalendar = () => {
    const scrollNode = findNodeHandle(scrollRef.current);
    const calNode = findNodeHandle(calendarRef.current);
    if (scrollNode != null && calNode != null) {
      UIManager.measureLayout(
        calNode,
        scrollNode,
        () => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, calendarY.current - 24),
            animated: true,
          });
        },
        (_x, y) => {
          calendarY.current = y;
          scrollRef.current?.scrollTo({y: Math.max(0, y - 24), animated: true});
        },
      );
      return;
    }
    scrollRef.current?.scrollTo({
      y: Math.max(0, calendarY.current - 24),
      animated: true,
    });
  };

  const detailReturnTo = {
    screen: 'PropertyDetail' as const,
    params: {propertyId: Number(propertyId), property: property || undefined},
  };

  const createLeadInquiry = async (message: string) => {
    if (!property) return;
    try {
      await inquiriesApi.create({
        propertyId: Number(property.id || property.propertyId || propertyId),
        message,
        subject: property.title,
      });
    } catch {
      // non-blocking — chat/booking still proceed
    }
  };

  const onToggleDay = (dayKey: string) => {
    // Jour par jour uniquement — pas de plage automatique entre deux dates
    setSelectedDays(prev => {
      if (prev.includes(dayKey)) {
        return prev.filter(d => d !== dayKey);
      }
      return [...prev, dayKey].sort();
    });
  };

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

  useEffect(() => {
    const id = Number(propertyId);
    if (!id) return;
    propertyExtrasApi
      .nearby(id)
      .then(res => setPlaces(res.places || []))
      .catch(() => setPlaces([]));
    propertyExtrasApi
      .getAvailability(id)
      .then(res => setRanges(res.ranges || []))
      .catch(() => setRanges([]));
    propertyExtrasApi
      .getReviews(id)
      .then(res => {
        setReviews(res.reviews || []);
        setAvgRating(res.averageRating);
        setReviewCount(res.reviewCount || 0);
        if (res.myReview) {
          setMyRating(res.myReview.rating);
          setMyComment(res.myReview.comment || '');
        }
      })
      .catch(() => {});
  }, [propertyId]);

  const handleShare = async () => {
    if (!property) return;
    const id = property.id || property.propertyId;
    const location = property.city || property.address || property.location || 'Tunisie';
    const price = `${property.price?.toLocaleString('fr-TN') || ''} ${
      property.currency || 'TND'
    }${property.listingType === 'rent' ? ' /jour' : ''}`.trim();
    try {
      await Share.share({
        title: property.title,
        message: [`🏠 ${property.title}`, price ? `💰 ${price}` : null, `📍 ${location}`, '', 'Immo Dary', id ? `Réf. #${id}` : null]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      // cancelled
    }
  };

  const openOnMap = () => {
    if (!property) return;
    const markers = buildPropertyMarkers([property]);
    const m = markers[0];
    if (m?.latitude == null || m?.longitude == null) {
      alert('Carte', 'Position indisponible pour ce bien', undefined, 'info');
      return;
    }
    const focus = {
      latitude: m.latitude,
      longitude: m.longitude,
      zoom: 16,
      propertyId: property.id || property.propertyId,
    };
    requestMapFocus(focus);
    navigation.navigate({
      name: 'Home',
      params: {
        focusLatitude: focus.latitude,
        focusLongitude: focus.longitude,
        focusZoom: focus.zoom,
        focusPropertyId: focus.propertyId,
      },
      merge: true,
    });
  };

  const reloadAvailability = async () => {
    const id = Number(propertyId);
    if (!id) return;
    try {
      const res = await propertyExtrasApi.getAvailability(id);
      setRanges(res.ranges || []);
    } catch {
      // keep current
    }
  };

  const handleConfirmBooking = async (method: PayMethod) => {
    if (!requireAuth('réserver cette location', detailReturnTo)) return;
    if (!property || selectedDays.length === 0) return;
    const seller = property.owner;
    const myId = user?.id || user?.userId;
    if (seller?.id && myId && Number(seller.id) === Number(myId)) {
      alert('Info', 'Vous ne pouvez pas louer votre propre annonce.', undefined, 'info');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await bookingsApi.create({
        propertyId: Number(property.id || property.propertyId),
        days: [...selectedDays].sort(),
        paymentMethod: method === 'stripe' ? 'stripe' : 'on_arrival',
      });

      await createLeadInquiry(
        `Réservation ${selectedDays.length} j · ${res.booking.rentTotal} TND (${method === 'stripe' ? 'Stripe' : 'à l’arrivée'})`,
      );

      if (res.requiresPayment && res.checkoutUrl) {
        setPendingStripeSessionId(res.sessionId || null);
        setPendingStripeBookingId(res.booking?.bookingId || res.booking?.id || null);
        setStripeCheckoutUrl(res.checkoutUrl);
        setBookingLoading(false);
        return;
      }

      setBookingOpen(false);
      setSelectedDays([]);
      setStripeCheckoutUrl(null);
      setPendingStripeSessionId(null);
      setPendingStripeBookingId(null);
      await reloadAvailability();
      alert(
        'Réservation confirmée',
        `${res.booking.daysCount} jour(s) · ${res.booking.rentTotal.toLocaleString('fr-TN')} TND. Paiement à l’arrivée. Le propriétaire a été notifié.`,
        [
          {
            text: 'Mes réservations',
            onPress: () => navigation.navigate('Bookings'),
          },
          ...(seller?.id
            ? [
                {
                  text: 'Contacter',
                  onPress: () =>
                    navigation.navigate('Chat', {
                      userId: seller.id,
                      userName: seller.name,
                      propertyId: property.id || property.propertyId,
                    }),
                },
              ]
            : []),
          {text: 'OK'},
        ],
        'success',
      );
    } catch (e: any) {
      setStripeCheckoutUrl(null);
      alert(
        'Réservation impossible',
        e?.response?.data?.message ||
          e?.response?.data?.details?.dates ||
          'Ces dates ne sont plus disponibles.',
        undefined,
        'error',
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const finishStripeSuccess = async () => {
    try {
      if (pendingStripeSessionId) {
        await bookingsApi.confirmStripe(pendingStripeSessionId);
      }
      setBookingOpen(false);
      setSelectedDays([]);
      setStripeCheckoutUrl(null);
      setPendingStripeSessionId(null);
      setPendingStripeBookingId(null);
      await reloadAvailability();
      alert(
        'Paiement Stripe réussi',
        'Votre location est confirmée. Le propriétaire a été notifié.',
        [
          {
            text: 'Mes réservations',
            onPress: () => navigation.navigate('Bookings'),
          },
          {text: 'OK'},
        ],
        'success',
      );
    } catch (e: any) {
      setStripeCheckoutUrl(null);
      await reloadAvailability();
      alert(
        'Paiement',
        e?.response?.data?.message ||
          'Impossible de confirmer le paiement. Vérifiez Mes réservations.',
        undefined,
        'error',
      );
    }
  };

  const finishStripeCancel = async () => {
    try {
      if (pendingStripeBookingId) {
        await bookingsApi.cancelPending(pendingStripeBookingId);
      }
    } catch {
      // best-effort unlock
    }
    setStripeCheckoutUrl(null);
    setPendingStripeSessionId(null);
    setPendingStripeBookingId(null);
    await reloadAvailability();
    alert('Paiement annulé', 'Les jours ont été libérés.', undefined, 'info');
  };

  const openChatOnly = async (draft?: string) => {
    if (!requireAuth('discuter avec le vendeur', detailReturnTo)) return;
    if (!property?.owner?.id) return;
    const seller = property.owner;
    const myId = user?.id || user?.userId;
    if (seller.id === myId) {
      alert('Info', 'Ceci est votre annonce', undefined, 'info');
      return;
    }
    const pid = property.id || property.propertyId;
    await createLeadInquiry(draft || `Bonjour, je suis intéressé par « ${property.title} ».`);
    navigation.navigate('Chat', {
      userId: seller.id,
      userName: seller.name,
      draftMessage: draft,
      propertyId: pid,
    });
  };

  const handleBuyContinue = (method: BuyMethod) => {
    if (!property) return;
    setBuyOpen(false);
    openChatOnly(buyMethodDraft(method, property.title));
  };

  const submitReview = async () => {
    if (!requireAuth('laisser un avis', detailReturnTo)) return;
    if (!myRating) {
      alert('Avis', 'Choisissez une note de 1 à 5 étoiles.', undefined, 'info');
      return;
    }
    setSavingReview(true);
    try {
      const res: any = await propertyExtrasApi.upsertReview(
        Number(propertyId),
        myRating,
        myComment.trim() || undefined,
      );
      setReviews(res.reviews || []);
      setAvgRating(res.averageRating);
      setReviewCount(res.reviewCount || 0);
      alert('Merci', 'Votre avis a été enregistré.', undefined, 'success');
    } catch (e: any) {
      alert('Erreur', e?.response?.data?.message || 'Impossible d’enregistrer l’avis', undefined, 'error');
    } finally {
      setSavingReview(false);
    }
  };

  if (loading || !property) {
    return (
      <ScreenShell title="Détail" showBack>
        <LoadingView />
      </ScreenShell>
    );
  }

  const isRent = property.listingType === 'rent';
  const myId = user?.id || user?.userId;
  const isOwner = Boolean(
    property.owner?.id && myId && Number(property.owner.id) === Number(myId),
  );
  const canBookRent = isRent && !isOwner;
  const images = (property.images?.length
    ? property.images
    : property.featuredImage
    ? [property.featuredImage]
    : []
  ).map((u, i) =>
    resolvePropertyImageUrl(u, property.id || property.propertyId || i),
  );
  const videoUrl = resolveMediaUrl(property.videoUrl) || property.videoUrl || null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: isOwner ? 48 : 130},
        ]}
        showsVerticalScrollIndicator={false}>
        <PropertyImageGallery
          images={images}
          videoUrl={videoUrl}
          height={340}
          showThumbnails
          listingBadge={isRent ? 'À LOUER' : 'À VENDRE'}
          overlay={
            <View style={styles.heroActions} pointerEvents="box-none">
              <Pressable style={styles.heroBtn} onPress={() => navigation.goBack()}>
                <AppIcon name="back" size={20} color={colors.white} />
              </Pressable>
              <View style={styles.heroRight}>
                <Pressable style={styles.heroBtn} onPress={handleShare}>
                  <AppIcon name="share" size={20} color={colors.white} filled />
                </Pressable>
                <FavoriteHeart
                  propertyId={property.id || property.propertyId}
                  size={22}
                />
              </View>
            </View>
          }
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {property.title}
            </Text>
            <View style={styles.priceCol}>
              <Text style={styles.price}>
                {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
              </Text>
              <AppText variant="caption" color={colors.textMuted}>
                {isRent ? 'Prix par jour' : 'Prix de vente'}
              </AppText>
            </View>
          </View>

          <View style={styles.locationRow}>
            <AppIcon name="location" size={16} color={colors.accent} filled />
            <AppText variant="bodySm" color={colors.textSecondary}>
              {[property.city, property.state || property.country || 'Tunisie']
                .filter(Boolean)
                .join(', ')}
            </AppText>
          </View>

          <View style={styles.statsGrid}>
            {property.bedrooms != null ? (
              <View style={styles.statCell}>
                <AppIcon name="bed" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{property.bedrooms}</Text>
                <Text style={styles.statLabel}>Chambres</Text>
              </View>
            ) : null}
            {property.bathrooms != null ? (
              <View style={styles.statCell}>
                <AppIcon name="bath" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{property.bathrooms}</Text>
                <Text style={styles.statLabel}>Salle de bain</Text>
              </View>
            ) : null}
            {property.squareFeet != null ? (
              <View style={styles.statCell}>
                <AppIcon name="area" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{property.squareFeet} m²</Text>
                <Text style={styles.statLabel}>Surface</Text>
              </View>
            ) : null}
            {property.yearBuilt != null ? (
              <View style={styles.statCell}>
                <AppIcon name="listings" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{property.yearBuilt}</Text>
                <Text style={styles.statLabel}>Année</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.trustRow}>
            {(avgRating || reviewCount > 0) && (
              <View style={styles.ratingRow}>
                <StarRating rating={avgRating || 0} size={16} />
                <AppText variant="caption" color={colors.textMuted}>
                  {(avgRating || 0).toFixed(1)} ({reviewCount} avis)
                </AppText>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <AppIcon name="shield" size={14} color={colors.accent} filled />
              <AppText variant="caption" color={colors.accent} weight="bold">
                Annonce vérifiée
              </AppText>
            </View>
            </View>

            {property.description ? (
              <>
                <Text style={styles.section}>Description</Text>
                <Text style={styles.text}>{property.description}</Text>
              </>
            ) : null}

            {!!property.amenities?.length && (
              <>
                <Text style={styles.section}>Équipements</Text>
                <View style={styles.amenityWrap}>
                  {property.amenities.map(a => (
                    <View key={a} style={styles.amenityChip}>
                      <AppText variant="caption" color={colors.primary}>
                        {a}
                      </AppText>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.section}>Localisation</Text>
            <Text style={styles.text}>
              📍 {[property.address, property.city, property.state]
                .filter(Boolean)
                .join(', ') || property.location}
            </Text>

            <Pressable style={styles.mapCard} onPress={openOnMap}>
              <MapViewOSM
                properties={[property]}
                interactive={false}
                initialZoom={14}
                style={styles.miniMap}
              />
              <View style={styles.mapCta}>
                <AppIcon name="location" size={16} color={colors.white} filled />
                <AppText variant="caption" color={colors.white} weight="bold">
                  Voir sur la carte
                </AppText>
              </View>
            </Pressable>

            <Text style={styles.section}>À proximité</Text>
            {places.length === 0 ? (
              <AppText variant="bodySm" color={colors.textMuted}>
                Aucun lieu trouvé à proximité (ou coordonnées manquantes).
              </AppText>
            ) : (
              places.slice(0, 10).map(p => (
                <View key={p.id} style={styles.poiRow}>
                  <View style={styles.poiBadge}>
                    <AppText variant="caption" color={colors.primary} weight="bold">
                      {POI_LABEL[p.type] || p.type}
                    </AppText>
                  </View>
                  <View style={styles.poiText}>
                    <AppText variant="bodySm" weight="bold" numberOfLines={1}>
                      {p.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {p.distanceKm < 1
                        ? `${Math.round(p.distanceKm * 1000)} m`
                        : `${p.distanceKm.toFixed(1)} km`}
                    </AppText>
                  </View>
                </View>
              ))
            )}

            {isRent && (
              <>
                <View
                  ref={calendarRef}
                  collapsable={false}
                  onLayout={e => {
                    calendarY.current = e.nativeEvent.layout.y;
                  }}>
                <Text style={styles.section}>
                  {isOwner ? 'Calendrier (votre annonce)' : 'Réserver à la journée'}
                </Text>
                <AppText variant="bodySm" color={colors.textSecondary} style={{marginBottom: 8}}>
                  {Number(property.price).toLocaleString('fr-TN')} {property.currency || 'TND'}{' '}
                  / jour
                  {property.depositAmount
                    ? ` · Caution ${Number(property.depositAmount).toLocaleString('fr-TN')} TND`
                    : ''}
                  {'\n'}Touchez chaque jour libre pour l'ajouter ou le retirer.
                </AppText>
                {isOwner ? (
                  <AppText variant="bodySm" color={colors.textMuted} style={{marginBottom: 10}}>
                    Vous êtes le propriétaire — vous ne pouvez pas louer votre propre bien. Les
                    locataires réservent ici.
                  </AppText>
                ) : null}
                {ranges.length === 0 ? (
                  <AppText variant="bodySm" color={colors.textMuted}>
                    Aucune période définie.
                  </AppText>
                ) : (
                  <>
                    {!isOwner ? (
                      <AppText
                        variant="caption"
                        color={colors.textMuted}
                        style={{marginBottom: 8}}>
                        Touchez chaque jour à réserver (jours verts). Retouchez pour retirer.
                      </AppText>
                    ) : null}
                    <AvailabilityCalendar
                      ranges={ranges}
                      selectable={canBookRent}
                      selectedDays={canBookRent ? selectedDays : []}
                      onToggleDay={canBookRent ? onToggleDay : undefined}
                    />
                    {canBookRent && selectedDays.length > 0 ? (
                      <View style={styles.bookBar}>
                        <View>
                          <AppText variant="caption" color={colors.textMuted}>
                            {selectedDays.length} j · total
                          </AppText>
                          <AppText variant="body" weight="bold" color={colors.primary}>
                            {(
                              Math.round(
                                Number(property.price) * selectedDays.length * 100,
                              ) / 100
                            ).toLocaleString('fr-TN')}{' '}
                            TND
                          </AppText>
                        </View>
                        <Pressable
                          style={styles.bookCta}
                          onPress={() => {
                            if (!requireAuth('réserver cette location', detailReturnTo))
                              return;
                            setStripeCheckoutUrl(null);
                            setBookingOpen(true);
                          }}>
                          <AppText variant="bodySm" weight="bold" color={colors.white}>
                            Réserver
                          </AppText>
                        </Pressable>
                      </View>
                    ) : canBookRent ? (
                      <AppText
                        variant="caption"
                        color={colors.textMuted}
                        style={{marginTop: 10, textAlign: 'center'}}>
                        Sélectionnez un ou plusieurs jours
                      </AppText>
                    ) : null}
                  </>
                )}
                </View>
              </>
            )}

            {!isRent && !isOwner ? (
              <Pressable
                style={styles.buyCard}
                onPress={() => {
                  if (!requireAuth('acheter ce bien', detailReturnTo)) return;
                  setBuyOpen(true);
                }}>
                <View style={styles.buyIcon}>
                  <AppIcon name="price" size={22} color={colors.primary} filled />
                </View>
                <View style={{flex: 1}}>
                  <AppText variant="bodySm" weight="bold" color={colors.primary}>
                    Intéressé par l’achat ?
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Choisissez un mode de paiement, puis discutez avec le vendeur
                  </AppText>
                </View>
              </Pressable>
            ) : null}

            <Text style={styles.section}>Avis</Text>
            {isAuthenticated ? (
              <View style={styles.reviewForm}>
                <AppText variant="bodySm" color={colors.textSecondary}>
                  Votre note
                </AppText>
                <StarRating rating={myRating} size={28} editable onChange={setMyRating} />
                <TextInput
                  style={styles.reviewInput}
                  value={myComment}
                  onChangeText={setMyComment}
                  placeholder="Commentaire (optionnel)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                <Button
                  title={savingReview ? 'Enregistrement…' : 'Publier mon avis'}
                  onPress={submitReview}
                  loading={savingReview}
                />
              </View>
            ) : (
              <AppText variant="bodySm" color={colors.textMuted}>
                Connectez-vous pour laisser un avis.
              </AppText>
            )}
            {reviews.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <AppText variant="bodySm" weight="bold">
                    {r.authorName}
                  </AppText>
                  <StarRating rating={r.rating} size={14} />
                </View>
                {r.comment ? (
                  <AppText variant="bodySm" color={colors.textSecondary}>
                    {r.comment}
                  </AppText>
                ) : null}
              </View>
            ))}

            {property.owner ? (
              <View style={styles.sellerCard}>
                <Text style={styles.section}>Propriétaire</Text>
                <Text style={styles.sellerName}>{property.owner.name}</Text>
                <AppText variant="caption" color={colors.textMuted} style={{marginTop: 4}}>
                  Contactez-le via la messagerie de l’app
                </AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {!isOwner ? (
          <View style={[styles.stickyBar, {paddingBottom: Math.max(insets.bottom, 12)}]}>
            <Pressable
              style={styles.stickyContact}
              onPress={() => openChatOnly()}>
              <AppIcon name="phone" size={18} color={colors.white} />
              <AppText variant="bodySm" weight="bold" color={colors.white}>
                Contacter
              </AppText>
            </Pressable>
            {!isRent ? (
              <Pressable
                style={styles.stickyBook}
                onPress={() => {
                  if (!requireAuth('acheter ce bien', detailReturnTo)) return;
                  setBuyOpen(true);
                }}>
                <AppIcon name="calendar" size={18} color={colors.white} />
                <AppText variant="bodySm" weight="bold" color={colors.white}>
                  Acheter
                </AppText>
              </Pressable>
            ) : canBookRent && selectedDays.length > 0 ? (
              <Pressable
                style={styles.stickyBook}
                onPress={() => {
                  if (!requireAuth('réserver cette location', detailReturnTo)) return;
                  setStripeCheckoutUrl(null);
                  setBookingOpen(true);
                }}>
                <AppIcon name="calendar" size={18} color={colors.white} />
                <AppText variant="bodySm" weight="bold" color={colors.white}>
                  Réserver
                </AppText>
              </Pressable>
            ) : (
              <Pressable style={styles.stickyBook} onPress={scrollToCalendar}>
                <AppIcon name="calendar" size={18} color={colors.white} />
                <AppText variant="bodySm" weight="bold" color={colors.white}>
                  Réserver
                </AppText>
              </Pressable>
            )}
          </View>
        ) : null}

        <PropertyGuidePresence
          visible={!isOwner}
          isRent={isRent}
          bottomInset={insets.bottom + (!isOwner ? 56 : 0)}
          onOpenGuide={() =>
            navigation.navigate('AIAssistant', {
              propertyId: property.id || property.propertyId,
              propertyTitle: property.title,
            })
          }
        />

        {!isRent && !isOwner ? (
          <BuyInterestModal
            visible={buyOpen}
            onClose={() => setBuyOpen(false)}
            propertyTitle={property.title}
            onContinue={handleBuyContinue}
          />
        ) : null}

        {canBookRent && selectedDays.length > 0 ? (
          <BookingConfirmModal
            visible={bookingOpen}
            onClose={() => {
              setBookingOpen(false);
              setStripeCheckoutUrl(null);
            }}
            propertyTitle={property.title}
            selectedDays={selectedDays}
            dailyPrice={Number(property.price) || 0}
            depositAmount={property.depositAmount}
            currency={property.currency || 'TND'}
            loading={bookingLoading}
            stripeCheckoutUrl={stripeCheckoutUrl}
            onConfirm={handleConfirmBooking}
            onStripeSuccess={finishStripeSuccess}
            onStripeCancel={finishStripeCancel}
          />
        ) : null}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 160},
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    ...shadow.float,
  },
  stickyContact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  stickyBook: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  heroActions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  heroRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,31,46,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {padding: 20},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
  },
  priceCol: {alignItems: 'flex-end'},
  price: {fontSize: 20, fontWeight: '800', color: colors.accent},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10},
  statsGrid: {
    flexDirection: 'row',
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    gap: 4,
  },
  statValue: {fontSize: 15, fontWeight: '800', color: colors.text},
  statLabel: {fontSize: 10, color: colors.textMuted, textAlign: 'center'},
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  verifiedBadge: {flexDirection: 'row', alignItems: 'center', gap: 6},
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  ratingRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statText: {fontSize: 13, fontWeight: '700', color: colors.primary},
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  text: {fontSize: 15, color: colors.textSecondary, lineHeight: 22},
  amenityWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  amenityChip: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  mapCard: {
    marginTop: 12,
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  miniMap: {flex: 1, height: 180},
  mapCta: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  poiBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  poiText: {flex: 1},
  reviewForm: {gap: 10, marginBottom: 12},
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 70,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.lg,
    marginTop: 8,
    ...shadow.card,
  },
  sellerName: {fontSize: 16, fontWeight: '700', color: colors.text},
  sellerInfo: {fontSize: 14, color: colors.textSecondary, marginTop: 4},
  bookBar: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  bookCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  buyCard: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    ...shadow.soft,
  },
  buyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
