import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {bookingsApi, Booking} from '../../api/bookings';
import {useAuth} from '../../context/AuthContext';
import {useAppAlert} from '../../context/AlertContext';
import {useLanguage} from '../../context/LanguageContext';
import {EmptyState} from '../../components/EmptyState';
import {GuestPrompt} from '../../components/GuestPrompt';
import {LoadingView} from '../../components/LoadingView';
import {Badge} from '../../components/ui/Badge';
import {AppText} from '../../components/ui/AppText';
import {ScreenShell} from '../../components/ScreenShell';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'default',
  completed: 'default',
};

function formatDates(b: Booking) {
  const start = String(b.startDate || '').slice(0, 10);
  const end = String(b.endDate || '').slice(0, 10);
  if (start && end && start !== end) return `${start} → ${end}`;
  return start || end || '—';
}

export function BookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {isGuest} = useAuth();
  const {alert} = useAppAlert();
  const {t} = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await bookingsApi.mine();
      setBookings(res.bookings || []);
    } catch (err: any) {
      setBookings([]);
      alert(
        'Erreur',
        err?.response?.data?.message ||
          err?.message ||
          'Impossible de charger vos réservations.',
      );
    }
  }, [alert]);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) {
        setLoading(false);
        return;
      }
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load, isGuest]),
  );

  if (isGuest) {
    return (
      <ScreenShell title={t('bookings.title')} subtitle={t('bookings.subtitle')} showBack>
        <GuestPrompt
          emoji="📅"
          title={t('bookings.guestTitle')}
          message={t('bookings.guestMessage')}
        />
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell title={t('bookings.title')} subtitle={t('bookings.subtitle')} showBack>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={t('bookings.title')} subtitle={t('bookings.subtitle')} showBack>
      <View style={styles.container}>
        <FlatList
          data={bookings}
          keyExtractor={item => String(item.id || item.bookingId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({item}) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('PropertyDetail', {
                  propertyId: item.propertyId,
                })
              }>
              <View style={styles.cardHeader}>
                <AppText variant="body" weight="bold" style={styles.title} numberOfLines={2}>
                  {item.propertyTitle || `Bien #${item.propertyId}`}
                </AppText>
                <Badge
                  label={item.status || 'pending'}
                  variant={STATUS_VARIANT[item.status] || 'default'}
                />
              </View>
              {item.propertyCity ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {item.propertyCity}
                </AppText>
              ) : null}
              <AppText variant="bodySm" color={colors.textSecondary} style={styles.dates}>
                {formatDates(item)} · {item.daysCount || 0} j
              </AppText>
              <View style={styles.footer}>
                <AppText variant="body" weight="bold" color={colors.primary}>
                  {(item.rentTotal || 0).toLocaleString('fr-TN')} TND
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {item.paymentMethod === 'on_arrival'
                    ? 'À l’arrivée'
                    : item.paymentStatus || item.paymentMethod}
                </AppText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              message={t('bookings.empty')}
              actionLabel={t('bookings.explore')}
              onAction={() => navigation.navigate('Home')}
            />
          }
          contentContainerStyle={
            bookings.length === 0 ? styles.empty : styles.list
          }
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: 16, paddingTop: 8, paddingBottom: 32},
  empty: {flexGrow: 1},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {flex: 1},
  dates: {marginTop: 8},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});
