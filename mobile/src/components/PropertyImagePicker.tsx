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

import {Input} from './ui/Input';

import {uploadApi} from '../api/upload';

import {useAppAlert} from '../context/AlertContext';

import {colors, radius} from '../theme';



export interface ImageSlot {

  uri: string;

  url?: string;

  uploading?: boolean;

}



interface Props {

  images: ImageSlot[];

  onChange: (images: ImageSlot[]) => void;

  urlInputs: string[];

  onUrlChange: (index: number, value: string) => void;

}



export function PropertyImagePicker({

  images,

  onChange,

  urlInputs,

  onUrlChange,

}: Props) {

  const {alert} = useAppAlert();

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);



  const openGallery = async () => {

    try {

      const {launchImageLibrary} = require('react-native-image-picker');

      return launchImageLibrary({

        mediaType: 'photo',

        selectionLimit: 1,

        quality: 0.8,

      });

    } catch {

      alert(

        'Galerie indisponible',

        'Relancez run-android.bat pour activer la sélection depuis la galerie.',

        undefined,

        'info',

      );

      return null;

    }

  };



  const pickFromGallery = async () => {

    if (images.length >= 4) {

      alert('Limite', 'Maximum 4 images par annonce', undefined, 'info');

      return;

    }



    const result = await openGallery();

    if (!result || result.didCancel || !result.assets?.[0]) return;



    const asset = result.assets[0];

    if (!asset.uri) return;



    const slot: ImageSlot = {uri: asset.uri, uploading: true};

    const next = [...images, slot];

    const index = next.length - 1;

    onChange(next);

    setUploadingIndex(index);



    try {

      const uploaded = await uploadApi.uploadImage(

        asset.uri,

        asset.fileName,

        asset.type,

      );

      onChange(

        next.map((img, i) =>

          i === index ? {uri: asset.uri, url: uploaded.fullUrl, uploading: false} : img,

        ),

      );

    } catch {

      onChange(images);

      alert('Erreur', "Impossible d'envoyer l'image", undefined, 'error');

    } finally {

      setUploadingIndex(null);

    }

  };



  const removeImage = (index: number) => {

    onChange(images.filter((_, i) => i !== index));

  };



  return (

    <View style={styles.wrap}>

      <Text style={styles.label}>Photos du bien</Text>

      <Text style={styles.hint}>Galerie ou lien URL — les deux sont possibles</Text>



      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>

        <Pressable style={styles.addCard} onPress={pickFromGallery}>

          <Text style={styles.addEmoji}>📷</Text>

          <Text style={styles.addText}>Galerie</Text>

        </Pressable>



        {images.map((img, index) => (

          <View key={`${img.uri}-${index}`} style={styles.thumbWrap}>

            <Image source={{uri: img.uri}} style={styles.thumb} />

            {img.uploading || uploadingIndex === index ? (

              <View style={styles.uploadOverlay}>

                <ActivityIndicator color={colors.white} />

              </View>

            ) : null}

            <Pressable style={styles.removeBtn} onPress={() => removeImage(index)}>

              <Text style={styles.removeText}>×</Text>

            </Pressable>

          </View>

        ))}

      </ScrollView>



      <Input

        label="Image par URL (optionnel)"

        value={urlInputs[0] || ''}

        onChangeText={v => onUrlChange(0, v)}

        placeholder="https://..."

        autoCapitalize="none"

      />

      <Input

        label="Image URL 2 (optionnel)"

        value={urlInputs[1] || ''}

        onChangeText={v => onUrlChange(1, v)}

        placeholder="https://..."

        autoCapitalize="none"

      />

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {marginBottom: 8},

  label: {fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4},

  hint: {fontSize: 12, color: colors.textSecondary, marginBottom: 12},

  gallery: {marginBottom: 12},

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

  },

  addEmoji: {fontSize: 28},

  addText: {fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 4},

  thumbWrap: {marginRight: 10, position: 'relative'},

  thumb: {width: 100, height: 100, borderRadius: radius.md},

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


