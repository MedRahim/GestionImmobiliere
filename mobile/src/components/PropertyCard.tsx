import React from 'react';
import {Image, Pressable, View} from 'react-native';
import {Property, PROPERTY_TYPES} from '../types';
import {radius} from '../theme';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {Badge} from './ui/Badge';
import {FavoriteHeart} from './ui/FavoriteHeart';
import {resolveListThumbnailUrl} from '../utils/propertyImage';

interface Props {
  property: Property;
  onPress: () => void;
  showStatus?: boolean;
  showFavorite?: boolean;
  showStats?: boolean;
}

export function PropertyCard({
  property,
  onPress,
  showStatus,
  showFavorite,
  showStats,
}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles((c, sh) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      marginBottom: 16,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...sh.card,
    },
    image: {width: '100%' as const, height: 190},
    imageWrap: {position: 'relative' as const},
    heart: {position: 'absolute' as const, top: 10, right: 10},
    body: {padding: 16},
    row: {flexDirection: 'row' as const, gap: 8, marginBottom: 8},
    title: {marginBottom: 4},
    locRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      marginBottom: 10,
    },
    location: {flex: 1},
    footer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    metaRow: {flexDirection: 'row' as const},
    statsRow: {
      flexDirection: 'row' as const,
      gap: 14,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
    },
    stat: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4},
  }));

  const typeLabel =
    PROPERTY_TYPES.find(t => t.value === property.propertyType)?.label ||
    property.propertyType;
  const id = property.id || property.propertyId;
  const image = resolveListThumbnailUrl(
    property.featuredImage || property.images?.[0],
    id,
  );
  const location = property.city || property.location || property.address;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{uri: image}} style={styles.image} resizeMode="cover" />
        {showFavorite && <FavoriteHeart propertyId={id} style={styles.heart} />}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Badge label={typeLabel} />
          {property.listingType === 'rent' ? (
            <Badge label="À louer" variant="success" />
          ) : property.listingType === 'sale' ? (
            <Badge label="À vendre" variant="warning" />
          ) : null}
          {showStatus && property.status && (
            <Badge
              label={property.status}
              variant={property.status === 'active' ? 'success' : 'default'}
            />
          )}
        </View>
        <AppText variant="body" weight="bold" numberOfLines={2} style={styles.title}>
          {property.title}
        </AppText>
        <View style={styles.locRow}>
          <AppIcon name="location" size={12} color={colors.textMuted} />
          <AppText
            variant="bodySm"
            color={colors.textSecondary}
            numberOfLines={1}
            style={styles.location}>
            {location}
          </AppText>
        </View>
        <View style={styles.footer}>
          <AppText variant="h3" color={colors.primary}>
            {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
            {property.listingType === 'rent' ? ' /jour' : ''}
          </AppText>
          <View style={styles.metaRow}>
            {property.squareFeet ? (
              <AppText variant="caption" color={colors.textMuted}>
                {property.squareFeet} m²
              </AppText>
            ) : null}
            {property.bedrooms != null && (
              <AppText variant="caption" color={colors.textMuted}>
                {property.squareFeet ? ' · ' : ''}
                {property.bedrooms} ch.
              </AppText>
            )}
          </View>
        </View>
        {showStats ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppIcon name="eye" size={13} color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted}>
                {property.viewCount || 0}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppIcon name="heart" size={13} color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted}>
                {property.favoriteCount || 0}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppIcon name="inquiries" size={13} color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted}>
                {property.inquiryCount || 0}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
