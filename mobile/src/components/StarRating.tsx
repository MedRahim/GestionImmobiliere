import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from './ui/AppText';
import {colors} from '../theme';

interface Props {
  rating: number;
  size?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
}

export function StarRating({rating, size = 18, editable, onChange}: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(rating);
        const mark = (
          <AppText key={star} style={{fontSize: size, color: filled ? '#F5A623' : colors.border}}>
            {filled ? '★' : '☆'}
          </AppText>
        );
        if (!editable) return mark;
        return (
          <Pressable key={star} onPress={() => onChange?.(star)} hitSlop={6}>
            {mark}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 2},
});
