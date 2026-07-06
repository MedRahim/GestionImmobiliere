import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {messagesApi} from '../../api/messages';
import {useAuth} from '../../context/AuthContext';
import {useAppAlert} from '../../context/AlertContext';
import {LoadingView} from '../../components/LoadingView';
import {ScreenShell} from '../../components/ScreenShell';
import {ChatMessage} from '../../types';
import {colors, radius} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
};

export function ChatScreen({route}: Props) {
  const {userId, userName} = route.params;
  const {user} = useAuth();
  const {alert} = useAppAlert();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const myId = user?.id || user?.userId;

  const load = useCallback(async () => {
    try {
      const res = await messagesApi.getThread(userId);
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const send = async () => {
    if (!text.trim() || !myId || sending) return;
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
      await messagesApi.send({receiverId: userId, message: messageText});
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(messageText);
      alert('Erreur', "Impossible d'envoyer le message", undefined, 'error');
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => String(item.id || item.messageId)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
            renderItem={({item}) => {
              const mine = Number(item.senderId) === Number(myId);
              const body = item.content || (item as {message?: string}).message || '';
              return (
                <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, mine && styles.mineText]}>{body}</Text>
                    <Text style={[styles.time, mine && styles.timeMine]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>Nouvelle conversation</Text>
                <Text style={styles.empty}>Écrivez à {userName}</Text>
              </View>
            }
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Votre message..."
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!sending}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!text.trim() || sending}>
              <Text style={styles.sendBtnText}>{sending ? '...' : 'Envoyer'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: 16, paddingBottom: 8, flexGrow: 1},
  row: {marginBottom: 10},
  rowMine: {alignItems: 'flex-end'},
  rowTheirs: {alignItems: 'flex-start'},
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  mine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {fontSize: 15, color: colors.text, lineHeight: 21},
  mineText: {color: colors.white},
  time: {fontSize: 10, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end'},
  timeMine: {color: 'rgba(255,255,255,0.75)'},
  emptyWrap: {alignItems: 'center', marginTop: 48, paddingHorizontal: 24},
  emptyEmoji: {fontSize: 40, marginBottom: 12},
  emptyTitle: {fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6},
  empty: {textAlign: 'center', color: colors.textMuted, fontSize: 14},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendBtnDisabled: {opacity: 0.45},
  sendBtnText: {color: colors.white, fontWeight: '700', fontSize: 14},
});
