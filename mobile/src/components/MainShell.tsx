import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppMenu} from './AppMenu';
import {BottomNavBar} from './BottomNavBar';

export function MainShell({children}: {children: React.ReactNode}) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      <BottomNavBar />
      <AppMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {flex: 1},
});
