import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {messagesApi} from '../../api/messages';
import {useAuth} from '../../context/AuthContext';
import {useAppAlert} from '../../context/AlertContext';
import {useAppShell} from '../../context/AppShellContext';
import {LoadingView} from '../../components/LoadingView';
import {ScreenShell} from '../../components/ScreenShell';
import {UserAvatar} from '../../components/UserAvatar';
import {ChatMessage} from '../../types';
import {radius} from '../../theme';
import {useTheme} from '../../context/ThemeContext';
import {useThemedStyles} from '../../hooks/useThemedStyles';
import {MainStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
};

export function ChatScreen({route}: Props) {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useThemedStyles(c => ({
    container: {flex: 1, backgroundColor: c.background},
    list: {padding: 16, paddingBottom: 8, flexGrow: 1},
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.lg,
      marginBottom: 8,
    },
    mine: {
      alignSelf: 'flex-end' as const,
      backgroundColor: c.accent,
      borderBottomRightRadius: 4,
    },
    theirs: {
      alignSelf: 'flex-start' as const,
      backgroundColor: c.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.borderSoft,
    },
    bubbleText: {color: c.text, fontSize: 15, lineHeight: 20},
    mineText: {color: c.white},
    time: {fontSize: 11, color: c.textMuted, marginTop: 4, alignSelf: 'flex-end' as const},
    mineTime: {color: 'rgba(255,255,255,0.75)'},
    empty: {textAlign: 'center' as const, color: c.textMuted, marginTop: 40},
    composer: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      minHeight: 42,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      backgroundColor: c.background,
    },
    sendBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: radius.lg,
    },
    sendDisabled: {opacity: 0.45},
    sendText: {color: c.white, fontWeight: '700' as const},
    peerBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.surface,
    },
    peerMeta: {flex: 1},
    peerName: {fontSize: 16, fontWeight: '700' as const, color: c.text},
    propertyChip: {marginTop: 2, fontSize: 12, fontWeight: '600' as const, color: c.primary},
    errorBar: {backgroundColor: c.errorSoft, padding: 10},
    errorText: {color: c.error, textAlign: 'center' as const, fontSize: 13},
  }));
  const {userId, userName, profileImage, draftMessage, propertyId} = route.params;
  const {user} = useAuth();
  const {alert} = useAppAlert();
  const {refreshMessageUnread} = useAppShell();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(draftMessage || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const myId = user?.id || user?.userId;

  const nameParts = (userName || '').trim().split(/\s+/);
  const peerUser = {
    firstName: nameParts[0] || userName,
    lastName: nameParts.slice(1).join(' ') || '',
    profileImage,
  };

  const load = useCallback(async (silent = false) => {
    try {
      const res = await messagesApi.getThread(userId);
      setMessages(res.messages || []);
      setLoadError(null);
      if (!silent) refreshMessageUnread();
    } catch (error: any) {
      const status = error?.response?.status;
      if (!silent) {
        if (status === 401) {
          setLoadError('Session expiree — reconnectez-vous');
        } else if (status === 429) {
          setLoadError('Serveur occupe — reessayez dans un instant');
        } else {
          setLoadError(error?.response?.data?.message || 'Impossible de charger les messages');
        }
      }
    }
  }, [userId, refreshMessageUnread]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      load(false).finally(() => {
        if (alive) setLoading(false);
      });

      const interval = setInterval(() => {
        if (alive) load(true);
      }, 18000);

      return () => {
        alive = false;
        clearInterval(interval);
      };
    }, [load]),
  );

  const send = async () => {
    if (!text.trim() || sending) return;
    if (!myId) {
      alert('Erreur', 'Session invalide — reconnectez-vous', undefined, 'error');
      return;
    }
    const messageText = text.trim();
    const tempId = Date.now();
    setSending(true);
    setText('');
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        messageId: tempId,
        senderId: myId,
        receiverId: userId,
        content: messageText,
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 50);
    try {
      await messagesApi.send({
        receiverId: userId,
        message: messageText,
        propertyId,
      });
      await load(true);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(messageText);
      alert(
        'Erreur',
        error?.response?.data?.message || "Impossible d'envoyer le message",
        undefined,
        'error',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenShell title={userName} subtitle="Conversation" showBack>
      {loading ? (
        <LoadingView />
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}>
          <View style={styles.peerBar}>
            <UserAvatar user={peerUser} size={40} />
            <View style={styles.peerMeta}>
              <Text style={styles.peerName}>{userName}</Text>
              {propertyId ? (
                <Text style={styles.propertyChip}>Annonce #{propertyId}</Text>
              ) : null}
            </View>
          </View>
          {loadError ? (
            <Pressable style={styles.errorBar} onPress={() => load(false)}>
              <Text style={styles.errorText}>{loadError} — Touchez pour reessayer</Text>
            </Pressable>
          ) : null}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => String(item.id || item.messageId)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
            renderItem={({item}) => {
              const mine = item.senderId === myId;
              return (
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine && styles.mineText]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.time, mine && styles.mineTime]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun message — dites bonjour !</Text>
            }
          />
          <View style={[styles.composer, {paddingBottom: Math.max(insets.bottom, 12)}]}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Votre message..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendDisabled]}
              onPress={send}
              disabled={!text.trim() || sending}>
              <Text style={styles.sendText}>{sending ? '...' : 'Envoyer'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </ScreenShell>
  );
}
