/**
 * IP de ton PC sur le Wi-Fi (ipconfig → Carte Wi-Fi).
 * Mets à jour si ton IP change.
 */
export const DEV_PC_IP = '192.168.0.42';

/** API Azure VM (déploiement production) */
export const PRODUCTION_API_HOST = 'http://74.248.16.228:5000';

/** true = API sur Azure (même en dev USB). false = API locale sur le PC. */
export const USE_AZURE_API = true;

/** usb = câble + adb reverse | wifi = sans câble, même Wi-Fi | emulator */
export const DEV_MODE: 'usb' | 'wifi' | 'emulator' = 'usb';
