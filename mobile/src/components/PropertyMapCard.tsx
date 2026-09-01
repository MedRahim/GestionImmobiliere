import React, {memo} from 'react';
import {Image, Pressable, View} from 'react-native';
import {Property, PROPERTY_TYPES} from '../types';
import {radius} from '../theme';
import {resolveListThumbnailUrl, resolveMediaUrl} from '../utils/propertyImage';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {AppIcon} from './ui/AppIcon';
import {FavoriteHeart} from './ui/FavoriteHeart';
import {AppText} from './ui/AppText';
import {VideoThumb} from './VideoThumb';

interface Props {
  property: Property;
  onPress: () => void;
}

export const PropertyMapCard = memo(function PropertyMapCard({property, onPress}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles((c, sh) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      marginBottom: 14,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...sh.card,
    },
    image: {width: '100%' as const, height: 168},
    imageWrap: {position: 'relative' as const},
    heart: {position: 'absolute' as const, top: 12, right: 12, width: 34, height: 34, zIndex: 3},
    typeOverlay: {
      position: 'absolute' as const,
      left: 12,
      bottom: 12,
      backgroundColor: 'rgba(11,31,46,0.78)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.md,
      zIndex: 2,
    },
    typeText: {letterSpacing: 0.6, textTransform: 'uppercase' as const, fontSize: 10},
    placeholder: {
      backgroundColor: c.accentSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    body: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16},
    title: {lineHeight: 22, marginBottom: 6},
    metaRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4},
    location: {flex: 1},
    footer: {
      marginTop: 12,
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
    },
  }));

  const videoUrl = resolveMediaUrl(property.videoUrl) || property.videoUrl || null;
  const image = resolveListThumbnailUrl(
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
        {videoUrl ? (
          <VideoThumb
            url={videoUrl}
            mode="poster"
            fit="contain"
            style={styles.image}
          />
        ) : image ? (
          <Image
            source={{uri: image}}
            style={styles.image}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <AppIcon name="image" size={22} color={colors.accent} />
          </View>
        )}
        <View style={styles.typeOverlay}>
          <AppText variant="caption" color={colors.white} weight="bold" style={styles.typeText}>
            {property.listingType === 'rent'
              ? 'À louer'
              : property.listingType === 'sale'
                ? 'À vendre'
                : typeLabel}
          </AppText>
        </View>
        <FavoriteHeart
          propertyId={property.id || property.propertyId}
          size={18}
          style={styles.heart}
        />
      </View>
      <View style={styles.body}>
        <AppText variant="h3" numberOfLines={2} style={styles.title}>
          {property.title}
        </AppText>
        <View style={styles.metaRow}>
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
          <AppText variant="price" color={colors.primary}>
            {property.price?.toLocaleString('fr-TN')} {property.currency || 'TND'}
            {property.listingType === 'rent' ? ' /jour' : ''}
          </AppText>
          {(property.squareFeet || property.bedrooms != null) && (
            <AppText variant="caption" color={colors.textMuted}>
              {[
                property.squareFeet ? `${property.squareFeet} m²` : null,
                property.bedrooms != null ? `${property.bedrooms} ch.` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
});
