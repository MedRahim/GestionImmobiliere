import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {AppAlertModal} from '../components/ui/AppAlertModal';

export type AlertType = 'info' | 'success' | 'error' | 'confirm';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  /** Tap outside to dismiss (default: true for info/success, false for confirm/error) */
  dismissOnBackdrop?: boolean;
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void;
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertType,
  ) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
    setOptions(null);
  }, []);

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type: AlertType = 'info',
    ) => {
      showAlert({title, message, buttons, type});
    },
    [showAlert],
  );

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      hide();
      button.onPress?.();
    },
    [hide],
  );

  const value = useMemo(
    () => ({showAlert, alert}),
    [showAlert, alert],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      {options && (
        <AppAlertModal
          visible={visible}
          title={options.title}
          message={options.message}
          type={options.type || 'info'}
          buttons={options.buttons}
          dismissOnBackdrop={
            options.dismissOnBackdrop ??
            (options.type === 'info' ||
              options.type === 'success' ||
              !options.type)
          }
          onClose={hide}
          onButtonPress={handleButtonPress}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within AlertProvider');
  }
  return ctx;
}
