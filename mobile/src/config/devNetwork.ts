/**
 * IP de ton PC sur le Wi-Fi (ipconfig → Carte Wi-Fi).
 * Mets à jour si ton IP change.
 */
export const DEV_PC_IP = '192.168.0.42';

/** Floating IP OpenStack de la VM API (déploiement production) */
export const PRODUCTION_API_HOST = 'http://REPLACE_WITH_FLOATING_IP:5000';

/** usb = câble + adb reverse | wifi = sans câble, même Wi-Fi | emulator */
export const DEV_MODE: 'usb' | 'wifi' | 'emulator' = 'wifi';
