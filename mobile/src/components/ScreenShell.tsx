import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppHeader} from './AppHeader';
import {colors} from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  tabScreen?: boolean;
  children: React.ReactNode;
}

export function ScreenShell({title, subtitle, showBack, tabScreen, children}: Props) {
  return (
    <View style={styles.container}>
      <AppHeader title={title} subtitle={subtitle} showBack={showBack} tabScreen={tabScreen} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  body: {flex: 1},
});
