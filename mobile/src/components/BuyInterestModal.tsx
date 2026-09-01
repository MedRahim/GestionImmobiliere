import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {AppText} from './ui/AppText';
import {Button} from './ui/Button';
import {colors, radius, shadow} from '../theme';

export type BuyMethod = 'cash' | 'bank_transfer' | 'credit' | 'other';

const METHODS: {id: BuyMethod; label: string; hint: string}[] = [
  {id: 'cash', label: 'Comptant', hint: 'Paiement cash / chèque'},
  {id: 'bank_transfer', label: 'Virement bancaire', hint: 'Transfert vers le vendeur'},
  {id: 'credit', label: 'Crédit immobilier', hint: 'Banque / organisme'},
  {id: 'other', label: 'À discuter', hint: 'On en parle ensemble'},
];

interface Props {
  visible: boolean;
  onClose: () => void;
  propertyTitle: string;
  onContinue: (method: BuyMethod) => void;
}

export function BuyInterestModal({visible, onClose, propertyTitle, onContinue}: Props) {
  const [method, setMethod] = useState<BuyMethod>('cash');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <AppText variant="h3">Acheter ce bien</AppText>
          <AppText variant="bodySm" color={colors.textSecondary} style={styles.sub}>
            {propertyTitle}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
            Choisissez comment vous souhaitez acheter, puis ouvrez la discussion — aucun message
            n’est envoyé automatiquement.
          </AppText>

          {METHODS.map(m => (
            <Pressable
              key={m.id}
              style={[styles.method, method === m.id && styles.methodOn]}
              onPress={() => setMethod(m.id)}>
              <AppText variant="bodySm" weight="bold" color={colors.primary}>
                {m.label}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {m.hint}
              </AppText>
            </Pressable>
          ))}

          <Button
            title="Continuer vers le chat"
            onPress={() => onContinue(method)}
            style={styles.btn}
          />
          <Pressable onPress={onClose} style={styles.cancel}>
            <AppText variant="bodySm" color={colors.textMuted}>
              Annuler
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function buyMethodDraft(method: BuyMethod, title: string) {
  const labels: Record<BuyMethod, string> = {
    cash: 'comptant',
    bank_transfer: 'virement bancaire',
    credit: 'crédit immobilier',
    other: 'à discuter',
  };
  return `Bonjour, je suis intéressé(e) par « ${title} ». Mode d’achat souhaité : ${labels[method]}.`;
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
    paddingBottom: 28,
    ...shadow.card,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sub: {marginTop: 4, marginBottom: 8},
  hint: {marginBottom: 14, lineHeight: 18},
  method: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  methodOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  btn: {marginTop: 8},
  cancel: {alignItems: 'center', paddingVertical: 14},
});
