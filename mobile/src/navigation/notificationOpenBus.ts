import {NotifNavTarget} from './notificationRouting';

type TargetListener = (target: NotifNavTarget) => void;

const listeners = new Set<TargetListener>();

export function onRequestOpenTarget(listener: TargetListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenTarget(target: NotifNavTarget) {
  listeners.forEach(fn => {
    try {
      fn(target);
    } catch {
      // ignore
    }
  });
}

/** @deprecated use requestOpenTarget — kept for older call sites */
export function onRequestOpenNotifications(listener: () => void) {
  return onRequestOpenTarget(() => listener());
}

export function requestOpenNotifications() {
  requestOpenTarget({screen: 'Notifications'});
}
