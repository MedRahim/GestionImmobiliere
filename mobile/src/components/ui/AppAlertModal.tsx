import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {AlertButton, AlertType} from '../../context/AlertContext';
import {useLanguage} from '../../context/LanguageContext';
import {AppIcon, IconName} from './AppIcon';
import {AppText} from './AppText';
import {colors, radius, shadow} from '../../theme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  type: AlertType;
  buttons?: AlertButton[];
  dismissOnBackdrop?: boolean;
  onClose: () => void;
  onButtonPress: (button: AlertButton) => void;
}

const TYPE_CONFIG: Record<
  AlertType,
  {
    icon: IconName;
    color: string;
    bg: string;
    ring: string;
    accent: string;
  }
> = {
  success: {
    icon: 'check',
    color: colors.success,
    bg: '#E8FBF8',
    ring: 'rgba(46,196,182,0.28)',
    accent: colors.success,
  },
  error: {
    icon: 'alert',
    color: colors.error,
    bg: '#FEF0F0',
    ring: 'rgba(229,57,53,0.22)',
    accent: colors.error,
  },
  info: {
    icon: 'info',
    color: colors.accentDark,
    bg: colors.accentSoft,
    ring: 'rgba(30,202,211,0.28)',
    accent: colors.accent,
  },
  confirm: {
    icon: 'confirm',
    color: colors.primary,
    bg: '#E8EEF4',
    ring: 'rgba(27,58,87,0.18)',
    accent: colors.primary,
  },
};

export function AppAlertModal({
  visible,
  title,
  message,
  type,
  buttons,
  dismissOnBackdrop = true,
  onClose,
  onButtonPress,
}: Props) {
  const {t} = useLanguage();
  const config = TYPE_CONFIG[type];
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{text: t('common.ok'), style: 'default'}];

  const singleButton = resolvedButtons.length === 1;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity, backdropOpacity]);

  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissOnBackdrop ? onClose : undefined}>
      <Animated.View style={[styles.backdrop, {opacity: backdropOpacity}]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        <Animated.View
          style={[
            styles.cardWrap,
            {opacity, transform: [{scale}]},
          ]}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={styles.card}>
              <View style={[styles.accentBar, {backgroundColor: config.accent}]} />

              <View style={styles.body}>
                <View style={[styles.iconRing, {borderColor: config.ring}]}>
                  <View style={[styles.iconWrap, {backgroundColor: config.bg}]}>
                    <AppIcon
                      name={config.icon}
                      size={30}
                      color={config.color}
                      filled
                    />
                  </View>
                </View>

                <AppText variant="h3" style={styles.title}>
                  {title}
                </AppText>

                {message ? (
                  <AppText
                    variant="bodySm"
                    color={colors.textSecondary}
                    style={styles.message}>
                    {message}
                  </AppText>
                ) : null}

                <View
                  style={[
                    styles.actions,
                    singleButton ? styles.actionsSingle : styles.actionsRow,
                  ]}>
                  {resolvedButtons.map((btn, index) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    const isPrimary =
                      !isCancel &&
                      !isDestructive &&
                      (singleButton || index === resolvedButtons.length - 1);

                    return (
                      <Pressable
                        key={`${btn.text}-${index}`}
                        style={({pressed}) => [
                          styles.btn,
                          singleButton && styles.btnFull,
                          isPrimary && [
                            styles.btnPrimary,
                            {backgroundColor: config.accent},
                          ],
                          isCancel && styles.btnCancel,
                          isDestructive && styles.btnDestructive,
                          !singleButton &&
                            !isPrimary &&
                            !isCancel &&
                            !isDestructive &&
                            styles.btnSecondary,
                          pressed && styles.btnPressed,
                        ]}
                        onPress={() => onButtonPress(btn)}>
                        <AppText
                          variant="button"
                          color={
                            isPrimary || isDestructive
                              ? colors.white
                              : isCancel
                                ? colors.textSecondary
                                : colors.primary
                          }>
                          {btn.text}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,33,43,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(213,232,236,0.9)',
    ...shadow.card,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  actionsSingle: {},
  actionsRow: {
    flexDirection: 'row',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnFull: {
    flex: undefined,
    width: '100%',
  },
  btnPrimary: {},
  btnSecondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDestructive: {
    backgroundColor: colors.error,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{scale: 0.98}],
  },
});
