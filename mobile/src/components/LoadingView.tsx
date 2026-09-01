import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {lightColors} from '../theme/colors';

/** Safe spinner — no ThemeProvider required (used during Auth boot). */
export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={lightColors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightColors.background,
  },
});
