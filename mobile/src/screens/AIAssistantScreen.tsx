import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {aiApi, ChatAttachment, ChatMessage} from '../api/ai';
import {uploadApi} from '../api/upload';
import {AppHeader} from '../components/AppHeader';
import {AppIcon, IconName} from '../components/ui/AppIcon';
import {AppText} from '../components/ui/AppText';
import {useLanguage} from '../context/LanguageContext';
import {MainStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';
import {getUserLocation, LocationStatus, openLocationSettings, UserCoords} from '../utils/userLocation';

type Props = NativeStackScreenProps<MainStackParamList, 'AIAssistant'>;

const GENERAL_CHIPS: {icon: IconName; labelKey?: string; label?: string}[] = [
  {icon: 'search', label: 'Appartements 2 chambres'},
  {icon: 'filter', label: 'Budget < 600K TND'},
  {icon: 'location', label: 'À La Marsa'},
];

const PROPERTY_PROMPTS = [
  {icon: 'info' as const, key: 'guide.prompt.howApp'},
  {icon: 'shield' as const, key: 'guide.prompt.safety'},
  {icon: 'myLocation' as const, key: 'guide.prompt.nearMe'},
  {icon: 'price' as const, key: 'guide.prompt.avgPrice'},
  {icon: 'messages' as const, key: 'guide.prompt.contact'},
] as const;

async function pickDocumentFile(): Promise<{
  uri: string;
  name: string;
  type: string;
} | null> {
  try {
    // Optional native module — present after APK rebuild with document-picker
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DocumentPicker = require('react-native-document-picker');
    const res = await DocumentPicker.pickSingle({
      type: [
        DocumentPicker.types.pdf,
        DocumentPicker.types.images,
        DocumentPicker.types.plainText,
      ],
      copyTo: 'cachesDirectory',
    });
    const uri = res.fileCopyUri || res.uri;
    if (!uri) return null;
    return {
      uri,
      name: res.name || `document-${Date.now()}.pdf`,
      type: res.type || 'application/pdf',
    };
  } catch (e: any) {
    if (e?.code === 'DOCUMENT_PICKER_CANCELED' || e?.message?.includes('cancel')) {
      return null;
    }
    // Module missing or failed — fall back to image library
    Alert.alert(
      'Fichier',
      'Sélection PDF indisponible sur cette version. Choisissez une photo, ou une capture d’écran du document.',
    );
    return null;
  }
}

export function AIAssistantScreen({route}: Props) {
  const insets = useSafeAreaInsets();
  const {t, locale} = useLanguage();
  const propertyId = route.params?.propertyId;
  const propertyTitle = route.params?.propertyTitle;
  const aboutProperty = Boolean(propertyId || propertyTitle);

  const welcome = aboutProperty
    ? t('guide.welcomeProperty', {title: propertyTitle || 'ce bien'})
    : t('guide.welcome');

  const suggestionChips = useMemo(() => {
    if (aboutProperty) {
      return PROPERTY_PROMPTS.map(p => ({
        icon: p.icon,
        label: t(p.key),
      }));
    }
    return [
      ...GENERAL_CHIPS.map(c => ({
        icon: c.icon,
        label: c.label || (c.labelKey ? t(c.labelKey) : ''),
      })),
      {icon: 'info' as const, label: t('guide.prompt.howApp')},
      {icon: 'shield' as const, label: t('guide.prompt.safety')},
    ];
  }, [aboutProperty, t]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {role: 'assistant', content: welcome},
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('unknown');
  const listRef = useRef<FlatList>(null);
  const thinkingLabel = t('guide.thinking');

  const refreshLocation = async () => {
    const {coords, status} = await getUserLocation({
      withAddress: true,
      preferCacheMaxAgeMs: 60000,
    });
    setUserCoords(coords);
    setLocationStatus(status);
    return status;
  };

  const onLocationBannerPress = async () => {
    const status = await refreshLocation();
    if (status === 'denied' || status === 'unavailable') {
      openLocationSettings();
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  const locationLabel =
    locationStatus === 'granted' && userCoords
      ? userCoords.address
        ? t('guide.locationExact', {place: userCoords.address})
        : t('guide.locationOn')
      : locationStatus === 'denied'
      ? t('guide.locationDenied')
      : t('guide.locationOff');

  const historyForApi = (thread: ChatMessage[]) =>
    thread.filter(m => {
      const c = (m.content || '').trim();
      if (!c && !(m.attachments && m.attachments.length)) return false;
      if (c === thinkingLabel) return false;
      if (/réfléch|thinking|جاري|impossible de répondre|could not reach/i.test(c)) {
        return false;
      }
      return true;
    });

  const uploadLocalFile = async (uri: string, fileName: string, type: string) => {
    setUploading(true);
    try {
      const attachment = await uploadApi.uploadGuide(uri, {fileName, type});
      setPending(prev => [...prev, attachment].slice(-4));
    } catch (e: any) {
      Alert.alert('Upload', e?.message || 'Impossible d’envoyer le fichier');
    } finally {
      setUploading(false);
    }
  };

  const onAttach = () => {
    if (loading || uploading) return;
    Alert.alert('Joindre', 'Photo, PDF ou texte pour le guide', [
      {
        text: 'Galerie',
        onPress: async () => {
          const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.85,
          });
          const asset = result.assets?.[0];
          if (!asset?.uri) return;
          await uploadLocalFile(
            asset.uri,
            asset.fileName || `photo-${Date.now()}.jpg`,
            asset.type || 'image/jpeg',
          );
        },
      },
      {
        text: 'Caméra',
        onPress: async () => {
          const result = await launchCamera({
            mediaType: 'photo',
            quality: 0.85,
            saveToPhotos: false,
          });
          const asset = result.assets?.[0];
          if (!asset?.uri) return;
          await uploadLocalFile(
            asset.uri,
            asset.fileName || `camera-${Date.now()}.jpg`,
            asset.type || 'image/jpeg',
          );
        },
      },
      {
        text: 'PDF / fichier',
        onPress: async () => {
          const doc = await pickDocumentFile();
          if (!doc) {
            // Fallback: image of a document page
            const result = await launchImageLibrary({
              mediaType: 'photo',
              selectionLimit: 1,
              quality: 0.9,
            });
            const asset = result.assets?.[0];
            if (!asset?.uri) return;
            await uploadLocalFile(
              asset.uri,
              asset.fileName || `scan-${Date.now()}.jpg`,
              asset.type || 'image/jpeg',
            );
            return;
          }
          await uploadLocalFile(doc.uri, doc.name, doc.type);
        },
      },
      {text: 'Annuler', style: 'cancel'},
    ]);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    const attachments = [...pending];
    if ((!content && !attachments.length) || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: content || (attachments.length ? '📎 Fichier joint' : ''),
      attachments: attachments.length ? attachments : undefined,
    };
    const next = [...messages.filter(m => m.content !== thinkingLabel), userMsg];
    setMessages(next);
    setInput('');
    setPending([]);
    setLoading(true);

    let thinkingTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setMessages(prev => {
        const cleaned = prev.filter(m => m.content !== thinkingLabel);
        const last = cleaned[cleaned.length - 1];
        if (last?.role === 'user') {
          return [...cleaned, {role: 'assistant', content: thinkingLabel}];
        }
        return cleaned;
      });
      listRef.current?.scrollToEnd({animated: true});
    }, 500);

    try {
      const apiMessages = historyForApi(next).map(m => ({
        role: m.role,
        content: m.content,
        ...(m.attachments?.length ? {attachments: m.attachments} : {}),
      }));

      const res = await aiApi.chat(
        apiMessages,
        {
          screen: 'guide',
          propertyId,
          propertyTitle,
          userLocation: userCoords,
          attachments: attachments.map(a => ({
            type: a.type,
            url: a.url,
            name: a.name,
            extractedText: a.extractedText,
            note: a.note,
          })),
        },
        locale,
      );
      const reply = res.data?.reply?.trim() || t('guide.error');
      setMessages([...next, {role: 'assistant', content: reply}]);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 80);
    } catch (e: any) {
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.message;
      const detail =
        status === 503
          ? t('guide.errorOffline')
          : apiMsg
          ? String(apiMsg)
          : t('guide.error');
      setMessages([...next, {role: 'assistant', content: detail}]);
    } finally {
      if (thinkingTimer) clearTimeout(thinkingTimer);
      setLoading(false);
    }
  };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
  const canSend = Boolean(input.trim() || pending.length) && !loading && !uploading;

  return (
    <View style={styles.root}>
      <AppHeader
        title={t('guide.title')}
        subtitle={t('guide.subtitle')}
        showSearch
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
          ListHeaderComponent={
            <Pressable
              style={[
                styles.locBanner,
                locationStatus === 'granted' && userCoords && styles.locOn,
                locationStatus === 'denied' && styles.locDenied,
              ]}
              onPress={onLocationBannerPress}>
              <AppIcon name="location" size={14} color={colors.accent} />
              <AppText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                {locationLabel}
              </AppText>
            </Pressable>
          }
          renderItem={({item}) => (
            <View
              style={[
                styles.row,
                item.role === 'user' ? styles.rowUser : styles.rowBot,
              ]}>
              {item.role === 'assistant' ? (
                <View style={styles.avatar}>
                  <AppIcon name="guide" size={18} color={colors.white} filled />
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}>
                {item.attachments?.map((att, idx) =>
                  att.type === 'image' ? (
                    <Image
                      key={`${att.url}-${idx}`}
                      source={{uri: att.localUri || att.url}}
                      style={styles.attachPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View key={`${att.url}-${idx}`} style={styles.fileChip}>
                      <AppIcon name="attach" size={14} color={colors.accent} />
                      <AppText variant="caption" color={colors.text} numberOfLines={1}>
                        {att.name || att.type}
                      </AppText>
                    </View>
                  ),
                )}
                {item.content ? (
                  <AppText
                    variant="bodySm"
                    color={item.role === 'user' ? colors.text : colors.white}
                    style={styles.bubbleText}>
                    {item.content}
                  </AppText>
                ) : null}
                <View style={styles.bubbleMeta}>
                  <AppText
                    variant="caption"
                    color={
                      item.role === 'user' ? colors.textMuted : 'rgba(255,255,255,0.75)'
                    }>
                    {timeStr}
                  </AppText>
                  {item.role === 'user' ? (
                    <AppIcon name="check" size={12} color={colors.accent} filled />
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />

        <View style={styles.suggestions}>
          <AppText variant="caption" color={colors.textMuted} style={styles.suggestionsLabel}>
            {t('guide.suggestions')}
          </AppText>
          {suggestionChips.map(chip => (
            <Pressable
              key={chip.label}
              style={styles.suggestionChip}
              onPress={() => send(chip.label)}
              disabled={loading || uploading}>
              <AppIcon name={chip.icon} size={14} color={colors.accent} />
              <AppText variant="caption" color={colors.primary} weight="bold">
                {chip.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {pending.length > 0 ? (
          <View style={styles.pendingRow}>
            {pending.map((att, i) => (
              <View key={`${att.url}-${i}`} style={styles.pendingItem}>
                {att.type === 'image' ? (
                  <Image
                    source={{uri: att.localUri || att.url}}
                    style={styles.pendingThumb}
                  />
                ) : (
                  <View style={styles.pendingFile}>
                    <AppIcon name="attach" size={16} color={colors.accent} />
                  </View>
                )}
                <Pressable
                  style={styles.pendingRemove}
                  onPress={() => setPending(p => p.filter((_, idx) => idx !== i))}>
                  <AppText variant="caption" color={colors.white}>
                    ×
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.inputRow, {paddingBottom: Math.max(insets.bottom, 10)}]}>
          <Pressable
            style={styles.attachBtn}
            onPress={onAttach}
            disabled={loading || uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <AppIcon
                name="attach"
                size={20}
                color={pending.length ? colors.accent : colors.textMuted}
              />
            )}
          </Pressable>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('guide.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!loading}
          />
          <Pressable
            style={[styles.send, !canSend && styles.sendOff]}
            onPress={() => send()}
            disabled={!canSend}>
            <AppIcon name="send" size={18} color={colors.white} filled />
          </Pressable>
        </View>

        <AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>
          Immo Dary AI Guide peut se tromper. Vérifiez les informations importantes.
        </AppText>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  list: {padding: 16, paddingBottom: 8},
  locBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },
  locOn: {borderColor: colors.accent, backgroundColor: colors.accentSoft},
  locDenied: {borderColor: colors.error},
  row: {flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end', gap: 8},
  rowUser: {justifyContent: 'flex-end'},
  rowBot: {justifyContent: 'flex-start'},
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
  userBubble: {
    backgroundColor: colors.surfaceAlt,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  botBubble: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {lineHeight: 20},
  attachPreview: {
    width: 180,
    height: 120,
    borderRadius: radius.md,
    marginBottom: 8,
    backgroundColor: colors.borderSoft,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestionsLabel: {
    width: '100%',
    marginBottom: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  pendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  pendingItem: {position: 'relative'},
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.borderSoft,
  },
  pendingFile: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {opacity: 0.4},
  disclaimer: {textAlign: 'center', paddingVertical: 8, paddingHorizontal: 20},
});
