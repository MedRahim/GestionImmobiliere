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
import {messagesApi} from '../../api/messages';
import {useAuth} from '../../context/AuthContext';
import {useLanguage} from '../../context/LanguageContext';
import {GuestPrompt} from '../../components/GuestPrompt';
import {EmptyState} from '../../components/EmptyState';
import {LoadingView} from '../../components/LoadingView';
import {ScreenShell} from '../../components/ScreenShell';
import {Conversation} from '../../types';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

export function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {isGuest} = useAuth();
  const {t} = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await messagesApi.getConversations();
      setConversations(res.conversations || []);
    } catch {
      setConversations([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load, isGuest]),
  );

  if (isGuest) {
    return (
      <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen>
        <GuestPrompt
          emoji="💬"
          title={t('messages.guest.title')}
          message={t('messages.guest.message')}
        />
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen>
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={item => String(item.userId)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }} />
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('Chat', {userId: item.userId, userName: item.name})
            }>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage || t('messages.newConversation')}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState message={t('messages.empty')} />}
        contentContainerStyle={conversations.length === 0 ? styles.empty : styles.list}
      />
    </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: 16, paddingTop: 8},
  empty: {flexGrow: 1},
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    ...shadow.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {color: colors.white, fontSize: 18, fontWeight: '700'},
  content: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  name: {fontSize: 16, fontWeight: '700', color: colors.text, flex: 1},
  preview: {fontSize: 13, color: colors.textSecondary, marginTop: 4},
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {color: colors.white, fontSize: 11, fontWeight: '700'},
});
