import React, {memo} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {Property, PROPERTY_TYPES} from '../types';
import {colors, radius, shadow} from '../theme';
import {resolvePropertyImageUrl} from '../utils/propertyImage';
import {AppIcon} from './ui/AppIcon';
import {FavoriteHeart} from './ui/FavoriteHeart';
import {AppText} from './ui/AppText';

interface Props {
  property: Property;
  onPress: () => void;
}

export const PropertyMapCard = memo(function PropertyMapCard({property, onPress}: Props) {
  const image = resolvePropertyImageUrl(
    property.featuredImage || property.images?.[0],
    property.id || property.propertyId,
  );
  const typeLabel =
    PROPERTY_TYPES.find(t => t.value === property.propertyType)?.label ||
    property.propertyType;
  const location = property.city || property.location || property.address || 'Tunisie';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{uri: image}} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <AppIcon name="image" size={22} color={colors.accent} />
          </View>
        )}
        <FavoriteHeart
          propertyId={property.id || property.propertyId}
          size={18}
          style={styles.heart}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.typePill}>
          <AppText variant="caption" color={colors.accent} weight="bold">
            {typeLabel}
          </AppText>
        </View>
        <AppText variant="body" weight="bold" numberOfLines={2} style={styles.title}>
          {property.title}
        </AppText>
        <View style={styles.metaRow}>
          <AppIcon name="location" size={12} color={colors.textMuted} />
          <AppText variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={styles.location}>
            {location}
          </AppText>
        </View>
        {(property.squareFeet || property.bedrooms) && (
          <View style={styles.metaRow}>
            {property.squareFeet ? (
              <AppText variant="caption" color={colors.textMuted}>
                {property.squareFeet} m²
              </AppText>
            ) : null}
            {property.bedrooms != null ? (
              <AppText variant="caption" color={colors.textMuted}>
                {property.squareFeet ? ' · ' : ''}{property.bedrooms} ch.
              </AppText>
            ) : null}
          </View>
        )}
        <AppText variant="h3" color={colors.accent} style={styles.price}>
          {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
        </AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  image: {width: 112, height: 112},
  imageWrap: {position: 'relative'},
  heart: {position: 'absolute', top: 6, right: 6, width: 30, height: 30},
  placeholder: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {flex: 1, padding: 12, justifyContent: 'center'},
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 6,
  },
  title: {lineHeight: 20},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  location: {flex: 1},
  price: {marginTop: 8, letterSpacing: 0.3},
});
