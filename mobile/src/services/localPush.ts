import {AppState, Linking, PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {notificationsApi, AppNotification} from '../api/notifications';
import {navigateFromNotification} from '../navigation/navigationRef';
import {
  NotifNavTarget,
  openNotificationTarget,
  resolveNotificationTarget,
} from '../navigation/notificationRouting';

const CHANNELS = {
  message: 'immodary_messages',
  inquiry: 'immodary_inquiries',
  listing: 'immodary_listings',
  default: 'immodary_updates',
} as const;

const SEEN_KEY = '@immodary_notif_seen_ids';
const PERM_DENIED_HINT_KEY = '@immodary_notif_denied_hint';
const PENDING_OPEN_KEY = '@immodary_notif_open';

let notifee: any = null;
let AndroidImportance: any = {HIGH: 4};
let AndroidCategory: any = {MESSAGE: 'msg', SOCIAL: 'social'};
let AndroidStyle: any = null;
let AuthorizationStatus: any = {AUTHORIZED: 1, PROVISIONAL: 2};
let EventType: any = {PRESS: 1};
let notifeeAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@notifee/react-native');
  notifee = mod.default;
  AndroidImportance = mod.AndroidImportance;
  AndroidCategory = mod.AndroidCategory || AndroidCategory;
  AndroidStyle = mod.AndroidStyle;
  AuthorizationStatus = mod.AuthorizationStatus;
  EventType = mod.EventType;
  notifeeAvailable = true;
} catch {
  notifeeAvailable = false;
}

let channelsReady = false;
let lastSeenIds = new Set<number>();
let bootstrapped = false;

async function loadSeenIds() {
  try {
    const saved = await AsyncStorage.getItem(SEEN_KEY);
    if (saved) lastSeenIds = new Set(JSON.parse(saved) as number[]);
  } catch {
    lastSeenIds = new Set();
  }
}

async function saveSeenIds() {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(lastSeenIds).slice(-200)));
  } catch {
    // ignore
  }
}

function channelForType(type?: string) {
  const t = (type || '').toLowerCase();
  if (t === 'message') return CHANNELS.message;
  if (t === 'inquiry') return CHANNELS.inquiry;
  if (t === 'new_property' || t === 'price_alert' || t === 'viewing_reminder') {
    return CHANNELS.listing;
  }
  return CHANNELS.default;
}

/** Personalized title/body for the tray — feels like a human, not a system alert. */
export function personalizeNotification(n: AppNotification): {
  title: string;
  body: string;
} {
  const type = (n.type || '').toLowerCase();
  const rawTitle = (n.title || '').trim();
  const rawBody = (n.message || '').trim();

  if (type === 'message') {
    // Backend sends title = sender name, message = content
    const sender = rawTitle && rawTitle !== 'Nouveau message' ? rawTitle : 'Nouveau message';
    const preview = rawBody.includes(':') && rawBody.startsWith(sender)
      ? rawBody.slice(sender.length).replace(/^:\s*/, '')
      : rawBody;
    return {
      title: sender,
      body: preview || 'Vous a envoyé un message',
    };
  }

  if (type === 'inquiry') {
    return {
      title: rawTitle || 'Nouvelle demande',
      body: rawBody || 'Quelqu’un s’intéresse à l’un de vos biens',
    };
  }

  if (type === 'booking') {
    return {
      title: rawTitle || 'Nouvelle réservation',
      body: rawBody || 'Un bien a été réservé / loué',
    };
  }

  if (type === 'price_alert') {
    return {
      title: 'Alerte prix',
      body: rawBody || rawTitle || 'Un bien suivi a changé de prix',
    };
  }

  if (type === 'new_property') {
    return {
      title: 'Nouveau bien près de vous',
      body: rawBody || rawTitle || 'Découvrez une nouvelle annonce',
    };
  }

  return {
    title: rawTitle || 'Immo Dary',
    body: rawBody || 'Vous avez une nouvelle notification',
  };
}

function targetFromNotifeeDetail(detail: any): NotifNavTarget {
  const data = detail?.notification?.data || detail?.data || {};
  return resolveNotificationTarget({
    type: data.type,
    title: data.title,
    message: data.message,
    relatedUserId: data.relatedUserId ? Number(data.relatedUserId) : undefined,
    relatedPropertyId: data.relatedPropertyId
      ? Number(data.relatedPropertyId)
      : undefined,
    relatedInquiryId: data.relatedInquiryId
      ? Number(data.relatedInquiryId)
      : undefined,
    data,
  });
}

export async function markPendingNotificationOpen(target?: NotifNavTarget) {
  try {
    await AsyncStorage.setItem(
      PENDING_OPEN_KEY,
      JSON.stringify(target || {screen: 'Notifications'}),
    );
  } catch {
    // ignore
  }
}

export async function consumePendingNotificationOpen(): Promise<NotifNavTarget | null> {
  try {
    const v = await AsyncStorage.getItem(PENDING_OPEN_KEY);
    if (v) {
      await AsyncStorage.removeItem(PENDING_OPEN_KEY);
      if (v === '1') return {screen: 'Notifications'};
      return JSON.parse(v) as NotifNavTarget;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function openAppFromNotification(detail?: any) {
  const target = detail
    ? targetFromNotifeeDetail(detail)
    : ({screen: 'Notifications'} as NotifNavTarget);
  await markPendingNotificationOpen(target);
  openNotificationTarget(target);
  await AsyncStorage.removeItem(PENDING_OPEN_KEY).catch(() => undefined);
  return true;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notifeeAvailable || !notifee) return false;

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        // @ts-expect-error Android 13+
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS ||
          'android.permission.POST_NOTIFICATIONS',
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    } catch {
      return false;
    }
  }

  try {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function openNotificationSettings() {
  try {
    if (Platform.OS === 'android') {
      await Linking.openSettings();
    } else {
      await Linking.openURL('app-settings:');
    }
  } catch {
    // ignore
  }
}

export async function shouldShowNotificationDeniedHint(): Promise<boolean> {
  if (!notifeeAvailable || !notifee) return false;
  try {
    const settings = await notifee.getNotificationSettings();
    const denied =
      settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED &&
      settings.authorizationStatus !== AuthorizationStatus.PROVISIONAL;
    if (!denied) return false;
    const seen = await AsyncStorage.getItem(PERM_DENIED_HINT_KEY);
    if (seen === '1') return false;
    await AsyncStorage.setItem(PERM_DENIED_HINT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function ensureChannel() {
  if (!notifeeAvailable || !notifee || channelsReady) return;
  await notifee.createChannel({
    id: CHANNELS.message,
    name: 'Messages',
    description: 'Conversations Immo Dary',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNELS.inquiry,
    name: 'Demandes',
    description: 'Intérêt pour vos biens',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNELS.listing,
    name: 'Annonces',
    description: 'Alertes prix et nouveaux biens',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await notifee.createChannel({
    id: CHANNELS.default,
    name: 'Immo Dary',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  channelsReady = true;
}

export async function bootstrapNotifications() {
  if (!notifeeAvailable) return;
  const allowed = await ensureNotificationPermission();
  if (allowed) await ensureChannel();
}

export async function displayLocalNotification(n: AppNotification) {
  if (!notifeeAvailable || !notifee) return;
  await ensureChannel();
  const {title, body} = personalizeNotification(n);
  const type = (n.type || '').toLowerCase();
  const channelId = channelForType(type);

  const android: any = {
    channelId,
    pressAction: {id: 'default', launchActivity: 'default'},
    smallIcon: 'ic_notification',
    color: '#00B8C8',
    importance: AndroidImportance.HIGH,
    autoCancel: true,
    showTimestamp: true,
  };

  if (type === 'message' && AndroidCategory?.MESSAGE) {
    android.category = AndroidCategory.MESSAGE;
  }
  if (body.length > 48 && AndroidStyle?.BIGTEXT) {
    android.style = {type: AndroidStyle.BIGTEXT, text: body};
  }

  await notifee.displayNotification({
    id: String(n.id || n.notificationId),
    title,
    body,
    subtitle: type === 'message' ? 'Immo Dary · Message' : 'Immo Dary',
    data: {
      open: 'deep',
      type: String(n.type || ''),
      notificationId: String(n.id || n.notificationId),
      relatedUserId: n.relatedUserId != null ? String(n.relatedUserId) : '',
      relatedPropertyId:
        n.relatedPropertyId != null ? String(n.relatedPropertyId) : '',
      relatedInquiryId:
        n.relatedInquiryId != null ? String(n.relatedInquiryId) : '',
      title: n.title || '',
      message: n.message || '',
    },
    android,
  });
}

export async function syncPushFromServer(): Promise<number> {
  if (!notifeeAvailable) return 0;
  if (!bootstrapped) {
    await loadSeenIds();
    bootstrapped = true;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) return 0;
  await ensureChannel();

  const res = await notificationsApi.getAll();
  const unread = (res.notifications || []).filter(n => !n.read);
  if (!unread.length) return 0;

  let shown = 0;
  for (const n of unread) {
    const id = n.id || n.notificationId;
    if (lastSeenIds.has(id)) continue;
    await displayLocalNotification(n);
    lastSeenIds.add(id);
    shown += 1;
  }

  if (shown > 0) await saveSeenIds();
  return shown;
}

export function attachNotifeeHandlers(onOpenNotifications?: () => void) {
  if (!notifeeAvailable || !notifee) return () => {};
  return notifee.onForegroundEvent(({type, detail}: {type: number; detail?: any}) => {
    if (type === EventType.PRESS) {
      openAppFromNotification(detail);
      onOpenNotifications?.();
    }
  });
}

export function registerNotifeeBackground() {
  if (!notifeeAvailable || !notifee) return;
  try {
    notifee.onBackgroundEvent(async ({type, detail}: {type: number; detail?: any}) => {
      if (type === EventType.PRESS) {
        await markPendingNotificationOpen(targetFromNotifeeDetail(detail));
      }
    });
  } catch {
    // ignore
  }
}

export async function handleNotificationOpenIfNeeded(): Promise<boolean> {
  let target = await consumePendingNotificationOpen();
  if (!target && notifeeAvailable && notifee) {
    try {
      const initial = await notifee.getInitialNotification();
      if (initial?.notification) target = targetFromNotifeeDetail(initial);
    } catch {
      // ignore
    }
  }
  if (!target) return false;
  openNotificationTarget(target);
  return true;
}

export function startAppStatePushSync(onSynced?: (count: number) => void) {
  if (!notifeeAvailable) return () => {};
  const tick = async () => {
    try {
      onSynced?.(await syncPushFromServer());
    } catch {
      // ignore
    }
  };
  const interval = setInterval(() => {
    if (AppState.currentState === 'active') tick();
  }, 60000);
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') tick();
  });
  tick();
  return () => {
    clearInterval(interval);
    sub.remove();
  };
}

export function isPushNativeReady() {
  return notifeeAvailable;
}
