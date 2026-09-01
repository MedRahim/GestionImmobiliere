type SessionExpiredListener = () => void;

let listener: SessionExpiredListener | null = null;

export function onSessionExpired(cb: SessionExpiredListener) {
  listener = cb;
  return () => {
    if (listener === cb) listener = null;
  };
}

export function emitSessionExpired() {
  listener?.();
}
