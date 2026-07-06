import {Linking, PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface UserCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type GeoError = {code: number; message: string};

const POSITION_OPTS = [
  {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000},
  {enableHighAccuracy: false, timeout: 20000, maximumAge: 60000},
  {enableHighAccuracy: true, timeout: 30000, maximumAge: 0},
] as const;

function isValidCoords(lat?: number, lng?: number) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function getCurrentPositionOnce(
  options: (typeof POSITION_OPTS)[number],
): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => {
        const {latitude, longitude, accuracy} = pos.coords;
        if (!isValidCoords(latitude, longitude)) {
          reject({code: 2, message: 'invalid coordinates'});
          return;
        }
        resolve({latitude, longitude, accuracy});
      },
      err => reject(err),
      options,
    );
  });
}

function watchPositionOnce(timeoutMs: number): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    const stop = () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const timer = setTimeout(() => {
      stop();
      reject({code: 3, message: 'watch timeout'});
    }, timeoutMs);

    watchId = Geolocation.watchPosition(
      pos => {
        clearTimeout(timer);
        stop();
        const {latitude, longitude, accuracy} = pos.coords;
        if (!isValidCoords(latitude, longitude)) {
          reject({code: 2, message: 'invalid coordinates'});
          return;
        }
        resolve({latitude, longitude, accuracy});
      },
      err => {
        clearTimeout(timer);
        stop();
        reject(err);
      },
      {enableHighAccuracy: true, distanceFilter: 0, maximumAge: 0},
    );
  });
}

async function ensureLocationPermission(): Promise<LocationStatus> {
  if (Platform.OS !== 'android') return 'granted';

  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

  const hasFine = await PermissionsAndroid.check(fine);
  const hasCoarse = await PermissionsAndroid.check(coarse);
  if (hasFine || hasCoarse) return 'granted';

  const results = await PermissionsAndroid.requestMultiple([fine, coarse]);
  const fineResult = results[fine];
  const coarseResult = results[coarse];

  if (
    fineResult === PermissionsAndroid.RESULTS.GRANTED ||
    coarseResult === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return 'granted';
  }

  if (
    fineResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    coarseResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return 'denied';
  }

  return 'denied';
}

export function openLocationSettings() {
  Linking.openSettings().catch(() => {});
}

export async function getUserLocation(): Promise<{
  coords: UserCoords | null;
  status: LocationStatus;
}> {
  const perm = await ensureLocationPermission();
  if (perm !== 'granted') return {coords: null, status: 'denied'};

  let lastError: GeoError | null = null;

  for (const opts of POSITION_OPTS) {
    try {
      const coords = await getCurrentPositionOnce(opts);
      return {coords, status: 'granted'};
    } catch (e) {
      lastError = e as GeoError;
      if (lastError?.code === 1) {
        return {coords: null, status: 'denied'};
      }
    }
  }

  try {
    const coords = await watchPositionOnce(25000);
    return {coords, status: 'granted'};
  } catch (e) {
    lastError = e as GeoError;
    if (lastError?.code === 1) {
      return {coords: null, status: 'denied'};
    }
  }

  return {coords: null, status: 'unavailable'};
}
