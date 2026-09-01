type MapFocusRequest = {
  latitude: number;
  longitude: number;
  zoom?: number;
  propertyId?: number;
};

type Listener = (focus: MapFocusRequest) => void;

let pending: MapFocusRequest | null = null;
const listeners = new Set<Listener>();

export function requestMapFocus(focus: MapFocusRequest) {
  pending = focus;
  listeners.forEach(listener => {
    try {
      listener(focus);
    } catch {
      // ignore listener errors
    }
  });
}

export function consumeMapFocus(): MapFocusRequest | null {
  const next = pending;
  pending = null;
  return next;
}

export function peekMapFocus(): MapFocusRequest | null {
  return pending;
}

export function subscribeMapFocus(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
