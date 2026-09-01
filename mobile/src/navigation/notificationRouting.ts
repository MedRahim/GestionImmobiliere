import {AppNotification} from '../api/notifications';
import {MainStackParamList} from './types';
import {requestOpenTarget} from './notificationOpenBus';

export type NotifNavTarget = {
  screen: keyof MainStackParamList;
  params?: MainStackParamList[keyof MainStackParamList];
};

/** Where a notification should open. */
export function resolveNotificationTarget(
  n: Pick<
    AppNotification,
    'type' | 'title' | 'message' | 'relatedPropertyId' | 'relatedInquiryId' | 'relatedUserId'
  > & {data?: Record<string, string>},
): NotifNavTarget {
  const type = (n.type || n.data?.type || '').toLowerCase();
  const relatedUserId = Number(
    n.relatedUserId || n.data?.relatedUserId || 0,
  ) || undefined;
  const relatedPropertyId = Number(
    n.relatedPropertyId || n.data?.relatedPropertyId || 0,
  ) || undefined;

  if (type === 'message' && relatedUserId) {
    const raw = n.message || '';
    const nameFromMsg = raw.includes(':')
      ? raw.split(':')[0].trim()
      : 'Conversation';
    return {
      screen: 'Chat',
      params: {userId: relatedUserId, userName: nameFromMsg || 'Conversation'},
    };
  }

  if (type === 'inquiry') {
    return {screen: 'Inquiries'};
  }

  if (type === 'booking') {
    if (relatedPropertyId) {
      return {
        screen: 'Bookings',
      };
    }
    return {screen: 'Bookings'};
  }

  if (
    (type === 'new_property' ||
      type === 'price_alert' ||
      type === 'viewing_reminder') &&
    relatedPropertyId
  ) {
    return {
      screen: 'PropertyDetail',
      params: {propertyId: relatedPropertyId},
    };
  }

  if (relatedPropertyId) {
    return {
      screen: 'PropertyDetail',
      params: {propertyId: relatedPropertyId},
    };
  }

  return {screen: 'Notifications'};
}

export function openNotificationTarget(target: NotifNavTarget) {
  requestOpenTarget(target);
}
