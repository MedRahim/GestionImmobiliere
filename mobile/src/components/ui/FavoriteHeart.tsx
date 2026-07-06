import React from 'react';

import {Pressable, StyleSheet, ViewStyle} from 'react-native';

import {useFavorites} from '../../context/FavoritesContext';

import {useAppAlert} from '../../context/AlertContext';

import {useRequireAuth} from '../../hooks/useRequireAuth';

import {AppIcon} from './AppIcon';

import {colors} from '../../theme';



interface Props {

  propertyId: number;

  size?: number;

  style?: ViewStyle;

  light?: boolean;

}



export function FavoriteHeart({propertyId, size = 22, style, light}: Props) {

  const {isFavorite, toggleFavorite} = useFavorites();

  const {requireAuth} = useRequireAuth();

  const {alert} = useAppAlert();

  const active = isFavorite(propertyId);

  const iconColor = active ? colors.error : light ? colors.white : colors.textMuted;



  return (

    <Pressable

      style={[styles.btn, style]}

      hitSlop={10}

      onPress={async e => {

        e?.stopPropagation?.();

        if (!requireAuth('ajouter aux favoris')) return;

        try {

          await toggleFavorite(propertyId);

        } catch {

          alert('Erreur', 'Impossible de mettre à jour les favoris.', undefined, 'error');

        }

      }}>

      <AppIcon name="heart" size={size} color={iconColor} filled={active} />

    </Pressable>

  );

}



const styles = StyleSheet.create({

  btn: {

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'rgba(255,255,255,0.92)',

    borderRadius: 20,

    width: 36,

    height: 36,

    ...{

      shadowColor: '#000',

      shadowOpacity: 0.12,

      shadowRadius: 4,

      elevation: 3,

    },

  },

});


