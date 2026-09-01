import React from 'react';
import {View} from 'react-native';
import {AppText} from './ui/AppText';
import {Button} from './ui/Button';
import {useTheme} from '../context/ThemeContext';
import {useThemedStyles} from '../hooks/useThemedStyles';
import {layout, radius} from '../theme';

interface Props {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  message = 'Aucun résultat trouvé',
  actionLabel,
  onAction,
}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(c => ({
    container: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 32,
      paddingBottom: layout.tabBarClearance,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: c.accentSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 14,
    },
    mark: {fontSize: 28, color: c.accent, fontWeight: '700' as const},
    message: {textAlign: 'center' as const, lineHeight: 22},
    btn: {marginTop: 18, minWidth: 180},
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <AppText style={styles.mark}>◇</AppText>
      </View>
      <AppText variant="body" color={colors.textSecondary} style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}
