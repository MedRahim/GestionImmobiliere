import React from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {Property, PROPERTY_TYPES} from '../types';
import {colors, radius, shadow} from '../theme';
import {AppIcon} from './ui/AppIcon';
import {AppText} from './ui/AppText';
import {Badge} from './ui/Badge';
import {FavoriteHeart} from './ui/FavoriteHeart';

interface Props {
  property: Property;
  onPress: () => void;
  showStatus?: boolean;
  showFavorite?: boolean;
}

export function PropertyCard({property, onPress, showStatus, showFavorite}: Props) {
  const typeLabel =
    PROPERTY_TYPES.find(t => t.value === property.propertyType)?.label ||
    property.propertyType;
  const image = property.featuredImage || property.images?.[0];
  const location = property.city || property.location || property.address;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{uri: image}} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <AppIcon name="image" size={28} color={colors.accent} />
          </View>
        )}
        {showFavorite && (
          <FavoriteHeart
            propertyId={property.id || property.propertyId}
            style={styles.heart}
          />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Badge label={typeLabel} />
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
          <AppText variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={styles.location}>
            {location}
          </AppText>
        </View>
        <View style={styles.footer}>
          <AppText variant="h3" color={colors.accent}>
            {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
          </AppText>
          <View style={styles.metaRow}>
            {property.squareFeet ? (
              <AppText variant="caption" color={colors.textMuted}>{property.squareFeet} m²</AppText>
            ) : null}
            {property.bedrooms != null && (
              <AppText variant="caption" color={colors.textMuted}>
                {property.squareFeet ? ' · ' : ''}{property.bedrooms} ch.
              </AppText>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  image: {width: '100%', height: 190},
  imageWrap: {position: 'relative'},
  heart: {position: 'absolute', top: 10, right: 10},
  placeholder: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {padding: 16},
  row: {flexDirection: 'row', gap: 8, marginBottom: 8},
  title: {marginBottom: 4},
  locRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10},
  location: {flex: 1},
  footer: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  metaRow: {flexDirection: 'row'},
});
