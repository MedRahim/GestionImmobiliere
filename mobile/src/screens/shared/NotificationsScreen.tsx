import React, {useCallback, useState} from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {useFocusEffect} from '@react-navigation/native';
import {notificationsApi, AppNotification} from '../../api/notifications';
import {aiApi} from '../../api/ai';
import {ScreenShell} from '../../components/ScreenShell';
import {EmptyState} from '../../components/EmptyState';
import {LoadingView} from '../../components/LoadingView';
import {useAppShell} from '../../context/AppShellContext';
import {useLanguage} from '../../context/LanguageContext';
import {useAppAlert} from '../../context/AlertContext';
import {colors, radius, shadow} from '../../theme';

const TYPE_ICON: Record<string, string> = {
  message: '💬',
  inquiry: '📩',
  new_property: '🏠',
  viewing_reminder: '📅',
  price_alert: '💰',
};

export function NotificationsScreen() {
  const {t, locale} = useLanguage();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {refreshUnread} = useAppShell();
  const {alert} = useAppAlert();

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.getAll();
      setItems(res.notifications || []);
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => {
        setLoading(false);
        refreshUnread();
      });
    }, [load, refreshUnread]),
  );

  const markRead = async (item: AppNotification) => {
    if (!item.read) {
      await notificationsApi.markAsRead(item.id);
      refreshUnread();
    }
    setItems(prev => prev.map(n => (n.id === item.id ? {...n, read: true} : n)));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setItems(prev => prev.map(n => ({...n, read: true})));
    refreshUnread();
  };

  const summarizeItem = async (item: AppNotification) => {
    try {
      const res = await aiApi.summarizeNotification(
        {title: item.title, message: item.message, type: item.type},
        locale,
      );
      alert('Résumé IA', res.data.summary, undefined, 'info');
    } catch {
      alert('IA', 'Résumé indisponible', undefined, 'error');
    }
  };

  const deleteItem = async (item: AppNotification) => {
    setItems(prev => prev.filter(n => n.id !== item.id));
    try {
      await notificationsApi.delete(item.id);
      refreshUnread();
    } catch {
      await load();
    }
  };

  const renderRightActions = (
    _item: AppNotification,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-88, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.deleteWrap, {transform: [{scale}]}]}>
        <Text style={styles.deleteText}>{t('notifications.delete')}</Text>
      </Animated.View>
    );
  };

  const localeTag = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar' : locale;

  return (
    <ScreenShell title={t('notifications.title')} subtitle={t('notifications.subtitle')} showBack>
      {loading ? (
        <LoadingView />
      ) : (
        <>
          <View style={styles.topRow}>
            {items.some(n => !n.read) ? (
              <Pressable onPress={markAllRead}>
                <Text style={styles.markAll}>{t('notifications.markAll')}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text style={styles.hint}>{t('notifications.swipeHint')}</Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await load();
                  await refreshUnread();
                  setRefreshing(false);
                }}
              />
            }
            renderItem={({item}) => (
              <Swipeable
                friction={2}
                overshootRight={false}
                renderRightActions={(progress, dragX) =>
                  renderRightActions(item, progress, dragX)
                }
                onSwipeableOpen={() => deleteItem(item)}>
                <Pressable
                  style={[styles.card, !item.read && styles.cardUnread]}
                  onPress={() => markRead(item)}
                  onLongPress={() => summarizeItem(item)}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.icon}>{TYPE_ICON[item.type] || '🔔'}</Text>
                  </View>
                  <View style={styles.content}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.message ? (
                      <Text style={styles.cardMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                    ) : null}
                    <Text style={styles.time}>
                      {new Date(item.createdAt).toLocaleString(localeTag)}
                    </Text>
                  </View>
                  {!item.read && <View style={styles.dot} />}
                </Pressable>
              </Swipeable>
            )}
            ListEmptyComponent={
              <EmptyState message={t('notifications.empty')} />
            }
            contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
          />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  markAll: {color: colors.primary, fontWeight: '700', fontSize: 13, alignSelf: 'flex-end'},
  hint: {color: colors.textMuted, fontSize: 11, textAlign: 'center'},
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
  cardUnread: {borderLeftWidth: 4, borderLeftColor: colors.accent},
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {fontSize: 20},
  content: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  cardMessage: {fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18},
  time: {fontSize: 11, color: colors.textMuted, marginTop: 6},
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: 8,
  },
  deleteWrap: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: 10,
    borderRadius: radius.lg,
    marginLeft: 8,
  },
  deleteText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 8,
  },
});
