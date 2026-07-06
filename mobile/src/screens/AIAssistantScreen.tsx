import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {aiApi, ChatMessage} from '../api/ai';
import {ScreenShell} from '../components/ScreenShell';
import {AppText} from '../components/ui/AppText';
import {useLanguage} from '../context/LanguageContext';
import {MainStackParamList} from '../navigation/types';
import {colors, radius, shadow} from '../theme';
import {getUserLocation, LocationStatus, UserCoords} from '../utils/userLocation';

type Props = NativeStackScreenProps<MainStackParamList, 'AIAssistant'>;

const GUIDE_PROMPTS = [
  'Comment utiliser l’application ?',
  'Ce quartier est-il sûr ?',
  'Le bien est-il proche de moi ?',
  'Quel est le prix moyen dans cette ville ?',
  'Comment contacter le vendeur ?',
];

export function AIAssistantScreen({route}: Props) {
  const insets = useSafeAreaInsets();
  const {t, locale} = useLanguage();
  const propertyId = route.params?.propertyId;
  const propertyTitle = route.params?.propertyTitle;

  const welcome = propertyTitle
    ? t('guide.welcomeProperty', {title: propertyTitle})
    : t('guide.welcome');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {role: 'assistant', content: welcome},
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('unknown');
  const listRef = useRef<FlatList>(null);

  const refreshLocation = async () => {
    const {coords, status} = await getUserLocation();
    setUserCoords(coords);
    setLocationStatus(status);
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  const locationLabel =
    locationStatus === 'granted' && userCoords
      ? t('guide.locationOn')
      : locationStatus === 'denied'
      ? t('guide.locationDenied')
      : t('guide.locationOff');

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg: ChatMessage = {role: 'user', content};
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    let thinkingTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user' && last.content === content) {
          return [...prev, {role: 'assistant', content: t('guide.thinking')}];
        }
        return prev;
      });
      listRef.current?.scrollToEnd({animated: true});
    }, 600);
    try {
      const res = await aiApi.chat(
        next,
        {
          screen: 'guide',
          propertyId,
          propertyTitle,
          userLocation: userCoords,
        },
        locale,
      );
      setMessages([...next, {role: 'assistant', content: res.data.reply}]);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
    } catch {
      setMessages([
        ...next,
        {role: 'assistant', content: t('guide.error')},
      ]);
    } finally {
      if (thinkingTimer) clearTimeout(thinkingTimer);
      setLoading(false);
    }
  };

  return (
    <ScreenShell title={t('guide.title')} subtitle={t('guide.subtitle')} showBack>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
          renderItem={({item}) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
              <AppText
                variant="bodySm"
                color={item.role === 'user' ? colors.white : colors.text}
                style={styles.bubbleText}>
                {item.content}
              </AppText>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.quick}>
              <Pressable
                style={[
                  styles.locBanner,
                  locationStatus === 'granted' && userCoords && styles.locOn,
                  locationStatus === 'denied' && styles.locDenied,
                ]}
                onPress={refreshLocation}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {locationLabel}
                </AppText>
              </Pressable>
              <AppText variant="caption" color={colors.textMuted} style={styles.quickLabel}>
                {t('guide.suggestions')}
              </AppText>
              {GUIDE_PROMPTS.map(p => (
                <Pressable key={p} style={styles.chip} onPress={() => send(p)} disabled={loading}>
                  <AppText variant="caption" color={colors.primary}>
                    {p}
                  </AppText>
                </Pressable>
              ))}
            </View>
          }
        />
        <View style={[styles.inputRow, {paddingBottom: Math.max(insets.bottom, 8)}]}>
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
            style={[styles.send, (!input.trim() || loading) && styles.sendOff]}
            onPress={() => send()}
            disabled={!input.trim() || loading}>
            <AppText variant="button" color={colors.white}>
              {loading ? '...' : '→'}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  list: {padding: 16, paddingBottom: 8},
  quick: {marginBottom: 16, gap: 8},
  locBanner: {
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locOn: {borderColor: colors.accent, backgroundColor: colors.accentSoft},
  locDenied: {borderColor: colors.error},
  quickLabel: {marginBottom: 4},
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 10,
    ...shadow.card,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {lineHeight: 20},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendOff: {opacity: 0.4},
});
