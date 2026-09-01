import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from './types';
import {requestOpenTarget} from './notificationOpenBus';
import {NotifNavTarget} from './notificationRouting';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToNotifications() {
  requestOpenTarget({screen: 'Notifications'});
  return true;
}

export function navigateFromNotification(target: NotifNavTarget) {
  requestOpenTarget(target);
  return true;
}
