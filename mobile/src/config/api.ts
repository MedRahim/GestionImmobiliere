import {Platform} from 'react-native';
import {DEV_MODE, DEV_PC_IP, PRODUCTION_API_HOST, USE_AZURE_API} from './devNetwork';

/**
 * Dev network:
 * - emulator  → 10.0.2.2
 * - usb       → localhost + adb reverse tcp:8081 (Metro)
 * - wifi      → IP du PC (même Wi-Fi)
 * - Azure     → USE_AZURE_API=true → API cloud même en dev
 */
function getDevHost() {
  if (Platform.OS === 'ios') return DEV_PC_IP;
  if (DEV_MODE === 'emulator') return '10.0.2.2';
  if (DEV_MODE === 'usb') return 'localhost';
  return DEV_PC_IP;
}

const devApiHost = `http://${getDevHost()}:5000`;
/** Release / sans PC → toujours Azure. Dev local seulement si USE_AZURE_API=false. */
export const API_HOST =
  __DEV__ && !USE_AZURE_API ? devApiHost : PRODUCTION_API_HOST;
export const API_BASE_URL = `${API_HOST}/api`;
