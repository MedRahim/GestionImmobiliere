import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {WebView, WebViewNavigation} from 'react-native-webview';
import {AppText} from './ui/AppText';
import {Button} from './ui/Button';
import {colors, radius, shadow} from '../theme';

export type PayMethod = 'stripe' | 'on_arrival';

interface Props {
  visible: boolean;
  onClose: () => void;
  propertyTitle: string;
  selectedDays: string[];
  dailyPrice: number;
  depositAmount?: number | null;
  currency?: string;
  loading?: boolean;
  stripeCheckoutUrl?: string | null;
  onConfirm: (method: PayMethod) => void;
  onStripeSuccess: () => void;
  onStripeCancel: () => void;
}

export function BookingConfirmModal({
  visible,
  onClose,
  propertyTitle,
  selectedDays,
  dailyPrice,
  depositAmount,
  currency = 'TND',
  loading,
  stripeCheckoutUrl,
  onConfirm,
  onStripeSuccess,
  onStripeCancel,
}: Props) {
  const [paying, setPaying] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (stripeCheckoutUrl) {
      handled.current = false;
      setPaying(true);
    }
  }, [stripeCheckoutUrl]);

  useEffect(() => {
    if (!visible) {
      setPaying(false);
      handled.current = false;
    }
  }, [visible]);

  const quote = useMemo(() => {
    const daysCount = selectedDays.length;
    const rentTotal = Math.round(dailyPrice * daysCount * 100) / 100;
    const sorted = [...selectedDays].sort();
    return {daysCount, rentTotal, sorted};
  }, [selectedDays, dailyPrice]);

  const resetAndClose = () => {
    setPaying(false);
    handled.current = false;
    onClose();
  };

  const onNav = (nav: WebViewNavigation) => {
    const url = nav.url || '';
    const titleHint = '';
    if (handled.current) return;
    if (url.includes('stripe-success') || url.includes('immobiliere-booking-success')) {
      handled.current = true;
      setPaying(false);
      onStripeSuccess();
      return;
    }
    if (url.includes('stripe-cancel') || url.includes('immobiliere-booking-cancel')) {
      handled.current = true;
      setPaying(false);
      onStripeCancel();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <Pressable style={styles.backdrop} onPress={paying ? undefined : resetAndClose}>
        <Pressable style={[styles.sheet, paying && styles.sheetFull]} onPress={e => e.stopPropagation()}>
          {!paying ? (
            <>
              <View style={styles.handle} />
              <AppText variant="h3" style={styles.title}>
                Confirmer la location
              </AppText>
              <AppText variant="bodySm" color={colors.textSecondary} style={styles.sub}>
                {propertyTitle}
              </AppText>

              <View style={styles.row}>
                <AppText variant="bodySm" color={colors.textSecondary}>
                  Jours
                </AppText>
                <AppText variant="bodySm" weight="bold">
                  {quote.daysCount} jour{quote.daysCount > 1 ? 's' : ''}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted} style={styles.daysList}>
                {quote.sorted.slice(0, 8).join(' · ')}
                {quote.sorted.length > 8 ? '…' : ''}
              </AppText>
              <View style={styles.row}>
                <AppText variant="bodySm" color={colors.textSecondary}>
                  Prix / jour
                </AppText>
                <AppText variant="bodySm" weight="bold">
                  {dailyPrice.toLocaleString('fr-TN')} {currency}
                </AppText>
              </View>
              <View style={styles.row}>
                <AppText variant="bodySm" color={colors.textSecondary}>
                  Total
                </AppText>
                <AppText variant="body" weight="bold" color={colors.primary}>
                  {quote.rentTotal.toLocaleString('fr-TN')} {currency}
                </AppText>
              </View>
              {depositAmount ? (
                <View style={styles.row}>
                  <AppText variant="bodySm" color={colors.textSecondary}>
                    Caution
                  </AppText>
                  <AppText variant="bodySm" weight="bold">
                    {Number(depositAmount).toLocaleString('fr-TN')} {currency}
                  </AppText>
                </View>
              ) : null}

              <AppText variant="caption" color={colors.textMuted} style={styles.note}>
                Les jours choisis seront réservés immédiatement. Le propriétaire est notifié.
              </AppText>

              <Button
                title="Payer à l’arrivée"
                variant="secondary"
                onPress={() => onConfirm('on_arrival')}
                loading={loading}
                style={styles.btn}
              />
              <Button
                title={`Payer par Stripe · ${quote.rentTotal.toLocaleString('fr-TN')} ${currency}`}
                onPress={() => onConfirm('stripe')}
                loading={loading}
                style={styles.btn}
              />
              <Pressable onPress={resetAndClose} style={styles.cancel}>
                <AppText variant="bodySm" color={colors.textMuted}>
                  Annuler
                </AppText>
              </Pressable>
            </>
          ) : (
            <View style={styles.webWrap}>
              <View style={styles.webHeader}>
                <AppText variant="body" weight="bold">
                  Paiement Stripe
                </AppText>
                <Pressable
                  onPress={() => {
                    setPaying(false);
                    onStripeCancel();
                  }}>
                  <AppText color={colors.error}>Fermer</AppText>
                </Pressable>
              </View>
              {stripeCheckoutUrl ? (
                <WebView
                  source={{uri: stripeCheckoutUrl}}
                  onNavigationStateChange={onNav}
                  startInLoadingState
                  style={styles.web}
                />
              ) : (
                <View style={styles.webLoading}>
                  <ActivityIndicator color={colors.accent} />
                  <AppText variant="bodySm" color={colors.textSecondary} style={{marginTop: 12}}>
                    Ouverture de Stripe…
                  </AppText>
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,36,56,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
    ...shadow.card,
  },
  sheetFull: {height: '92%', padding: 0, paddingBottom: 0},
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: {marginBottom: 4},
  sub: {marginBottom: 16},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  daysList: {marginBottom: 12, lineHeight: 18},
  note: {marginVertical: 12, lineHeight: 18},
  btn: {marginTop: 8},
  cancel: {alignItems: 'center', paddingVertical: 14},
  webWrap: {flex: 1, minHeight: 480},
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  web: {flex: 1},
  webLoading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
