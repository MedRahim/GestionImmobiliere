import React from 'react';
import {View} from 'react-native';
import {AppHeader} from './AppHeader';
import {useThemedStyles} from '../hooks/useThemedStyles';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  tabScreen?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  children: React.ReactNode;
}

export function ScreenShell({
  title,
  subtitle,
  showBack,
  tabScreen,
  showSearch,
  showNotifications,
  children,
}: Props) {
  const styles = useThemedStyles(c => ({
    container: {flex: 1, backgroundColor: c.background},
    body: {flex: 1},
  }));

  return (
    <View style={styles.container}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        tabScreen={tabScreen}
        showSearch={showSearch}
        showNotifications={showNotifications}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}
