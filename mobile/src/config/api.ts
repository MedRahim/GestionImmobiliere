import {Platform} from 'react-native';
import {DEV_MODE, DEV_PC_IP, PRODUCTION_API_HOST} from './devNetwork';

/**
 * Dev network:
 * - emulator  → 10.0.2.2
 * - usb       → localhost + adb reverse tcp:5000 / tcp:8081
 * - wifi      → IP du PC (même Wi-Fi, sans câble)
 * - release   → PRODUCTION_API_HOST (OpenStack floating IP)
 */
function getDevHost() {
  if (Platform.OS === 'ios') return DEV_PC_IP;
  if (DEV_MODE === 'emulator') return '10.0.2.2';
  if (DEV_MODE === 'usb') return 'localhost';
  return DEV_PC_IP;
}

const devApiHost = `http://${getDevHost()}:5000`;
export const API_HOST = __DEV__ ? devApiHost : PRODUCTION_API_HOST;
export const API_BASE_URL = `${API_HOST}/api`;
