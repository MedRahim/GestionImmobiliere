import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {inquiriesApi} from '../../api/inquiries';
import {useAppAlert} from '../../context/AlertContext';
import {EmptyState} from '../../components/EmptyState';
import {LoadingView} from '../../components/LoadingView';
import {Badge} from '../../components/ui/Badge';
import {ScreenShell} from '../../components/ScreenShell';
import {Inquiry} from '../../types';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  new: 'warning',
  responded: 'success',
  scheduled: 'default',
  closed: 'default',
};

export function SellerInquiriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {alert} = useAppAlert();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await inquiriesApi.getAll();
      setInquiries(res.inquiries || []);
    } catch (err: any) {
      setInquiries([]);
      alert(
        'Erreur',
        err?.response?.data?.message ||
          err?.message ||
          'Impossible de charger les demandes.',
      );
    }
  }, [alert]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const markResponded = async (inquiry: Inquiry) => {
    try {
      await inquiriesApi.updateStatus(inquiry.id, 'responded');
      load();
    } catch (err: any) {
      alert(
        'Erreur',
        err?.response?.data?.message ||
          err?.message ||
          'Impossible de mettre à jour la demande.',
      );
    }
  };

  const contactBuyer = (inquiry: Inquiry) => {
    navigation.navigate('Chat', {
      userId: inquiry.clientId,
      userName: inquiry.clientName || 'Acheteur',
    });
  };

  if (loading) {
    return (
      <ScreenShell title="Demandes" subtitle="Acheteurs intéressés" showBack>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Demandes" subtitle="Acheteurs intéressés" showBack>
    <View style={styles.container}>
      <FlatList
        data={inquiries}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }} />
        }
        renderItem={({item}) => (
          <View style={[styles.card, item.propertyDeleted && styles.cardMuted]}>
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.propertyTitle,
                  item.propertyDeleted && styles.titleMuted,
                ]}>
                {item.propertyTitle || 'Annonce'}
              </Text>
              <View style={styles.badges}>
                {item.propertyDeleted ? (
                  <Badge label="Supprimée" variant="default" />
                ) : null}
                <Badge
                  label={item.status}
                  variant={STATUS_VARIANT[item.status] || 'default'}
                />
              </View>
            </View>
            {item.propertyDeleted ? (
              <Text style={styles.deletedHint}>
                Cette annonce a été supprimée — la conversation reste disponible.
              </Text>
            ) : null}
            <Text style={styles.buyer}>👤 {item.clientName}</Text>
            {item.clientEmail && (
              <Text style={styles.meta}>✉️ {item.clientEmail}</Text>
            )}
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.actions}>
              <Pressable style={styles.btn} onPress={() => contactBuyer(item)}>
                <Text style={styles.btnText}>Message</Text>
              </Pressable>
              {item.status === 'new' && (
                <Pressable
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => markResponded(item)}>
                  <Text style={[styles.btnText, styles.btnOutlineText]}>
                    Marquer traité
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState message="Aucune demande pour le moment" />}
        contentContainerStyle={
          inquiries.length === 0 ? styles.empty : styles.list
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
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end'},
  propertyTitle: {flex: 1, fontSize: 16, fontWeight: '700', color: colors.text},
  titleMuted: {color: colors.textMuted, textDecorationLine: 'line-through'},
  cardMuted: {opacity: 0.92, borderWidth: 1, borderColor: colors.border},
  deletedHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  buyer: {fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 10},
  meta: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
  message: {fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20},
  actions: {flexDirection: 'row', gap: 10, marginTop: 14},
  btn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnOutline: {backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary},
  btnText: {color: colors.white, fontWeight: '700', fontSize: 13},
  btnOutlineText: {color: colors.primary},
});
