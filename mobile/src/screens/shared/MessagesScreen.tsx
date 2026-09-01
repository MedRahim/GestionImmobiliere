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
import {useAppShell} from '../../context/AppShellContext';
import {GuestPrompt} from '../../components/GuestPrompt';
import {EmptyState} from '../../components/EmptyState';
import {LoadingView} from '../../components/LoadingView';
import {ScreenShell} from '../../components/ScreenShell';
import {UserAvatar} from '../../components/UserAvatar';
import {Conversation} from '../../types';
import {colors, radius, shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

export function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {isGuest} = useAuth();
  const {t} = useLanguage();
  const {refreshMessageUnread} = useAppShell();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await messagesApi.getConversations();
      setConversations(res.conversations || []);
      refreshMessageUnread();
    } catch {
      setConversations([]);
    }
  }, [refreshMessageUnread]);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load, isGuest]),
  );

  if (isGuest) {
    return (
      <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen showSearch>
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
      <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen showSearch>
        <LoadingView />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={t('messages.title')} subtitle={t('messages.subtitle')} tabScreen showSearch>
      <View style={styles.container}>
        <FlatList
          data={conversations}
          keyExtractor={item => String(item.userId)}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
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
          renderItem={({item}) => {
            const parts = (item.name || '').trim().split(/\s+/);
            const firstName = item.firstName || parts[0] || '';
            const lastName = item.lastName || parts.slice(1).join(' ') || '';
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.navigate('Chat', {
                    userId: item.userId,
                    userName: item.name,
                    profileImage: item.profileImage,
                  })
                }>
                <UserAvatar
                  user={{firstName, lastName, profileImage: item.profileImage}}
                  size={48}
                />
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
            );
          }}
          ListEmptyComponent={<EmptyState message={t('messages.empty')} />}
          contentContainerStyle={conversations.length === 0 ? styles.empty : styles.list}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: 16, paddingTop: 8, paddingBottom: 110},
  empty: {flexGrow: 1, paddingBottom: 110},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 12,
    ...shadow.soft,
  },
  content: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  name: {fontSize: 16, fontWeight: '700', color: colors.text, flex: 1},
  preview: {marginTop: 4, color: colors.textSecondary, fontSize: 13},
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {color: colors.white, fontSize: 11, fontWeight: '700'},
});
