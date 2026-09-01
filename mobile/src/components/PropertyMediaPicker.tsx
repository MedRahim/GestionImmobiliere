import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadApi} from '../api/upload';
import {useAppAlert} from '../context/AlertContext';
import {AppIcon} from './ui/AppIcon';
import {colors, radius} from '../theme';

export interface ImageSlot {
  uri: string;
  url?: string;
  uploading?: boolean;
}

const MAX_PHOTOS = 10;

interface Props {
  images: ImageSlot[];
  onChange: (images: ImageSlot[]) => void;
  videoUrl?: string | null;
  videoLocalUri?: string | null;
  videoUploading?: boolean;
  onVideoChange: (payload: {
    url: string | null;
    localUri?: string | null;
  }) => void;
  onVideoUploading?: (uploading: boolean) => void;
}

export function PropertyMediaPicker({
  images,
  onChange,
  videoUrl,
  videoLocalUri,
  videoUploading,
  onVideoChange,
  onVideoUploading,
}: Props) {
  const {alert} = useAppAlert();
  const [batchUploading, setBatchUploading] = useState(false);

  const pickPhoto = async () => {
    if (images.length >= MAX_PHOTOS) {
      alert('Limite', `Maximum ${MAX_PHOTOS} photos par annonce`, undefined, 'info');
      return;
    }
    const remaining = MAX_PHOTOS - images.length;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.didCancel || !result.assets?.length) return;

    const assets = result.assets.filter(a => a.uri).slice(0, remaining);
    if (!assets.length) return;

    const startIndex = images.length;
    const pending: ImageSlot[] = assets.map(a => ({
      uri: a.uri!,
      uploading: true,
    }));
    const next = [...images, ...pending];
    onChange(next);
    setBatchUploading(true);

    try {
      const uploadedSlots = await Promise.all(
        assets.map(async (asset, i) => {
          try {
            const uploaded = await uploadApi.uploadImage(
              asset.uri!,
              asset.fileName,
              asset.type,
            );
            return {
              uri: asset.uri!,
              url: uploaded.fullUrl || uploaded.url,
              uploading: false,
            } as ImageSlot;
          } catch {
            return null;
          }
        }),
      );

      const failed = uploadedSlots.filter(s => s == null).length;
      const ok = uploadedSlots.filter(Boolean) as ImageSlot[];
      const keptBefore = next.slice(0, startIndex);
      onChange([...keptBefore, ...ok]);

      if (failed > 0 && ok.length === 0) {
        alert('Erreur', "Impossible d'envoyer les photos", undefined, 'error');
      } else if (failed > 0) {
        alert(
          'Photos',
          `${ok.length} photo(s) ajoutée(s), ${failed} échec(s)`,
          undefined,
          'info',
        );
      }
    } finally {
      setBatchUploading(false);
    }
  };

  const pickVideo = async () => {
    if (videoUrl || videoLocalUri || videoUploading) {
      alert(
        'Vidéo',
        'Une seule vidéo par annonce. Supprimez-la pour en choisir une autre.',
        undefined,
        'info',
      );
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'video',
      selectionLimit: 1,
      videoQuality: 'medium',
    });
    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    onVideoUploading?.(true);
    onVideoChange({url: null, localUri: asset.uri});
    try {
      const uploaded = await uploadApi.uploadVideo(
        asset.uri!,
        asset.fileName || undefined,
        asset.type || 'video/mp4',
      );
      const url = uploaded.fullUrl || uploaded.url;
      if (!url) {
        throw new Error('URL vidéo manquante après upload');
      }
      onVideoChange({
        url,
        localUri: asset.uri,
      });
    } catch (e: any) {
      onVideoChange({url: null, localUri: null});
      alert('Vidéo', e?.message || 'Échec envoi vidéo', undefined, 'error');
    } finally {
      onVideoUploading?.(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const hasVideo = Boolean(videoUrl || videoLocalUri || videoUploading);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Ajoutez plusieurs photos d’un coup et/ou une vidéo (affichée en premier)
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
        <Pressable
          style={[styles.addCard, (images.length >= MAX_PHOTOS || batchUploading) && styles.addCardDisabled]}
          onPress={pickPhoto}
          disabled={batchUploading || images.length >= MAX_PHOTOS}>
          <AppIcon name="image" size={26} color={colors.primary} />
          <Text style={styles.addText}>
            {batchUploading ? 'Envoi…' : 'Photos'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.addCard, hasVideo && styles.addCardDisabled]}
          onPress={pickVideo}
          disabled={!!videoUploading}>
          <AppIcon name="video" size={26} color={hasVideo ? colors.textMuted : colors.primary} />
          <Text style={[styles.addText, hasVideo && styles.addTextMuted]}>
            {videoUploading ? 'Envoi…' : 'Vidéo'}
          </Text>
        </Pressable>

        {hasVideo ? (
          <View style={styles.thumbWrap}>
            <View style={[styles.thumb, styles.videoThumb]}>
              {videoUploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <AppIcon name="video" size={28} color={colors.white} filled />
                  <Text style={styles.videoBadge}>1ʳᵉ</Text>
                  <Text style={styles.videoLabel}>Vidéo</Text>
                </>
              )}
            </View>
            {!videoUploading ? (
              <Pressable
                style={styles.removeBtn}
                onPress={() => onVideoChange({url: null, localUri: null})}>
                <Text style={styles.removeText}>X</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {images.map((img, index) => (
          <View key={`${img.uri}-${index}`} style={styles.thumbWrap}>
            <Image source={{uri: img.uri}} style={styles.thumb} />
            {img.uploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
            <Pressable style={styles.removeBtn} onPress={() => removeImage(index)}>
              <Text style={styles.removeText}>X</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: 8},
  hint: {fontSize: 12, color: colors.textSecondary, marginBottom: 12},
  gallery: {marginBottom: 4},
  addCard: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    gap: 4,
  },
  addCardDisabled: {
    borderColor: colors.border,
    opacity: 0.7,
  },
  addText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  addTextMuted: {color: colors.textMuted},
  thumbWrap: {marginRight: 10, position: 'relative'},
  thumb: {width: 100, height: 100, borderRadius: radius.md},
  videoThumb: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  videoLabel: {fontSize: 11, fontWeight: '700', color: colors.white},
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {color: colors.white, fontWeight: '800', fontSize: 14, lineHeight: 16},
});
