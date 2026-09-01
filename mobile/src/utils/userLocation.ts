import {Linking, PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface UserCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export type LocationStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type GeoError = {code: number; message: string};

const QUICK_OPTS = [
  {enableHighAccuracy: true, timeout: 12000, maximumAge: 15000},
  {enableHighAccuracy: false, timeout: 10000, maximumAge: 60000},
] as const;

const PRECISE_OPTS = [
  {enableHighAccuracy: true, timeout: 18000, maximumAge: 0},
  {enableHighAccuracy: true, timeout: 25000, maximumAge: 5000},
  {enableHighAccuracy: false, timeout: 12000, maximumAge: 30000},
] as const;

let lastGood: UserCoords | null = null;
let lastGoodAt = 0;

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
  options: {enableHighAccuracy: boolean; timeout: number; maximumAge: number},
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

function watchUntilAccurate(
  timeoutMs: number,
  targetAccuracy = 60,
): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let best: UserCoords | null = null;

    const stop = () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const timer = setTimeout(() => {
      stop();
      if (best) resolve(best);
      else reject({code: 3, message: 'watch timeout'});
    }, timeoutMs);

    watchId = Geolocation.watchPosition(
      pos => {
        const {latitude, longitude, accuracy} = pos.coords;
        if (!isValidCoords(latitude, longitude)) return;
        const next = {latitude, longitude, accuracy};
        if (
          !best ||
          (accuracy != null && (best.accuracy == null || accuracy < best.accuracy))
        ) {
          best = next;
        }
        if (accuracy != null && accuracy <= targetAccuracy) {
          clearTimeout(timer);
          stop();
          resolve(next);
        }
      },
      err => {
        clearTimeout(timer);
        stop();
        if (best) resolve(best);
        else reject(err);
      },
      {enableHighAccuracy: true, distanceFilter: 0, maximumAge: 0, interval: 2000},
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
  if (
    results[fine] === PermissionsAndroid.RESULTS.GRANTED ||
    results[coarse] === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return 'granted';
  }

  return 'denied';
}

/** Opens phone Location settings (GPS), not only the app page. */
export function openLocationSettings() {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      Linking.openSettings().catch(() => {});
    });
    return;
  }
  Linking.openURL('App-Prefs:Privacy&path=LOCATION').catch(() => {
    Linking.openSettings().catch(() => {});
  });
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    // zoom=18 = street / building level for more specific place names
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}` +
      `&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ImmoDary/1.0 (stage immobilier)',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address || {};
    const street = [addr.house_number, addr.road || addr.pedestrian || addr.footway]
      .filter(Boolean)
      .join(' ');
    const parts = [
      street || addr.neighbourhood || addr.suburb,
      addr.suburb || addr.quarter,
      addr.village || addr.town || addr.city || addr.municipality,
      addr.state || addr.county,
    ].filter((p, i, arr) => p && arr.indexOf(p) === i);
    if (parts.length > 0) return parts.join(', ');
    return data?.display_name || null;
  } catch {
    return null;
  }
}

export async function getUserLocation(options?: {
  withAddress?: boolean;
  quick?: boolean;
  preferCacheMaxAgeMs?: number;
}): Promise<{
  coords: UserCoords | null;
  status: LocationStatus;
}> {
  const quick = options?.quick === true;
  const withAddress = options?.withAddress === true;
  const cacheMax = options?.preferCacheMaxAgeMs ?? (quick ? 120000 : 0);

  if (cacheMax > 0 && lastGood && Date.now() - lastGoodAt < cacheMax) {
    return {coords: {...lastGood}, status: 'granted'};
  }

  const perm = await ensureLocationPermission();
  if (perm !== 'granted') return {coords: null, status: 'denied'};

  let lastError: GeoError | null = null;
  let coords: UserCoords | null = null;
  const attempts = quick ? QUICK_OPTS : PRECISE_OPTS;

  for (const opts of attempts) {
    try {
      coords = await getCurrentPositionOnce(opts);
      break;
    } catch (e) {
      lastError = e as GeoError;
      if (lastError?.code === 1) {
        return {coords: null, status: 'denied'};
      }
    }
  }

  if (!quick && (!coords || (coords.accuracy != null && coords.accuracy > 50))) {
    try {
      const refined = await watchUntilAccurate(20000, 35);
      if (
        !coords ||
        refined.accuracy == null ||
        coords.accuracy == null ||
        refined.accuracy <= coords.accuracy
      ) {
        coords = refined;
      }
    } catch (e) {
      lastError = e as GeoError;
    }
  }

  if (!coords && lastGood) {
    coords = {...lastGood};
  }

  if (!coords) {
    return {coords: null, status: 'unavailable'};
  }

  lastGood = coords;
  lastGoodAt = Date.now();

  if (withAddress) {
    const address = await reverseGeocode(coords.latitude, coords.longitude);
    if (address) coords = {...coords, address};
  }

  return {coords, status: 'granted'};
}
