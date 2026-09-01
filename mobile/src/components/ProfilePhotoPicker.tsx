import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {AppText} from './ui/AppText';
import {colors, radius} from '../theme';

interface Props {
  imageUri?: string | null;
  onChange: (uri: string | null) => void;
  size?: number;
  label?: string;
}

const openGallery = async () => {
  const {launchImageLibrary} = require('react-native-image-picker');
  return launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.85,
  });
};

export function ProfilePhotoPicker({
  imageUri,
  onChange,
  size = 96,
  label = 'Photo de profil',
}: Props) {
  const [picking, setPicking] = useState(false);

  const pick = async () => {
    setPicking(true);
    try {
      const result = await openGallery();
      if (result?.didCancel || !result?.assets?.[0]?.uri) return;
      onChange(result.assets[0].uri);
    } catch {
      // gallery unavailable
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySm" color={colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
      <Pressable onPress={pick} style={styles.btn}>
        {imageUri ? (
          <Image
            source={{uri: imageUri}}
            style={{width: size, height: size, borderRadius: size / 2}}
          />
        ) : (
          <View style={[styles.placeholder, {width: size, height: size, borderRadius: size / 2}]}>
            <AppText style={styles.camera}>📷</AppText>
          </View>
        )}
        <View style={styles.badge}>
          {picking ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <AppText variant="caption" color={colors.white} weight="bold">
              +
            </AppText>
          )}
        </View>
      </Pressable>
      {imageUri ? (
        <Pressable onPress={() => onChange(null)}>
          <AppText variant="caption" color={colors.error} style={styles.remove}>
            Supprimer la photo
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', marginBottom: 16},
  label: {marginBottom: 10},
  btn: {position: 'relative'},
  placeholder: {
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {fontSize: 28},
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  remove: {marginTop: 8},
});
