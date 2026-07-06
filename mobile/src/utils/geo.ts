import {Property} from '../types';

const TUNISIA_CITIES: Record<string, {lat: number; lng: number}> = {
  tunis: {lat: 36.8065, lng: 10.1815},
  ariana: {lat: 36.8625, lng: 10.1956},
  'la marsa': {lat: 36.878, lng: 10.324},
  carthage: {lat: 36.8529, lng: 10.3236},
  sfax: {lat: 34.7406, lng: 10.7603},
  sousse: {lat: 35.8254, lng: 10.636},
  nabeul: {lat: 36.4561, lng: 10.7376},
  bizerte: {lat: 37.2744, lng: 9.8739},
  gabes: {lat: 33.8815, lng: 10.0982},
  monastir: {lat: 35.7643, lng: 10.8113},
  hammamet: {lat: 36.4, lng: 10.6167},
  djerba: {lat: 33.8076, lng: 10.8451},
  kairouan: {lat: 35.6781, lng: 10.0963},
  mahdia: {lat: 35.5047, lng: 11.0622},
  gafsa: {lat: 34.425, lng: 8.7842},
  beja: {lat: 36.7256, lng: 9.1817},
  jendouba: {lat: 36.5011, lng: 8.7802},
  kef: {lat: 36.1749, lng: 8.7049},
  siliana: {lat: 36.0849, lng: 9.3708},
  zaghouan: {lat: 36.4029, lng: 10.1429},
  'ben arous': {lat: 36.7531, lng: 10.2189},
  manouba: {lat: 36.8081, lng: 10.0972},
  medenine: {lat: 33.3549, lng: 10.5055},
  tataouine: {lat: 32.9297, lng: 10.4518},
  tozeur: {lat: 33.9197, lng: 8.1335},
  kebili: {lat: 33.7044, lng: 8.9694},
};

export function resolveCityName(property: {
  city?: string;
  location?: string;
  address?: string;
  state?: string;
}) {
  const raw = (property.city || property.location || property.address || 'Tunis')
    .toLowerCase()
    .trim();
  const match = Object.keys(TUNISIA_CITIES).find(name => raw.includes(name));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : property.city || property.location || 'Tunis';
}

export function getCityCenter(cityName: string) {
  const key = cityName.toLowerCase().trim();
  const match =
    Object.entries(TUNISIA_CITIES).find(([name]) => key.includes(name))?.[1] ||
    TUNISIA_CITIES.tunis;
  return {latitude: match.lat, longitude: match.lng};
}

export function getPropertyCoords(
  property: {id?: number; propertyId?: number; city?: string; location?: string; address?: string},
) {
  const center = getCityCenter(resolveCityName(property));
  const id = property.id || property.propertyId || 1;
  const spread = ((id % 7) - 3) * 0.008;
  const spreadLng = ((id % 5) - 2) * 0.008;
  return {
    latitude: center.latitude + spread,
    longitude: center.longitude + spreadLng,
  };
}

export interface PropertyCluster {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  count: number;
  properties: Property[];
}

export function clusterProperties(properties: Property[]): PropertyCluster[] {
  const map = new Map<string, PropertyCluster>();

  properties.forEach(property => {
    const label = resolveCityName(property);
    const key = label.toLowerCase();
    const center = getCityCenter(label);

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.properties.push(property);
    } else {
      map.set(key, {
        key,
        label,
        latitude: center.latitude,
        longitude: center.longitude,
        count: 1,
        properties: [property],
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export interface MapPropertyMarker {
  key: string;
  propertyId: number;
  title: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  cityLabel: string;
}

export function buildPropertyMarkers(
  properties: Property[],
  imageUrlFor: (property: Property) => string | null,
): MapPropertyMarker[] {
  return properties.map(property => {
    const id = property.id || property.propertyId;
    const hasCoords =
      typeof property.latitude === 'number' &&
      typeof property.longitude === 'number' &&
      Number.isFinite(property.latitude) &&
      Number.isFinite(property.longitude);
    const coords = hasCoords
      ? {latitude: property.latitude!, longitude: property.longitude!}
      : getPropertyCoords(property);

    return {
      key: String(id),
      propertyId: id,
      title: property.title,
      latitude: coords.latitude,
      longitude: coords.longitude,
      imageUrl: imageUrlFor(property),
      cityLabel: resolveCityName(property),
    };
  });
}

export const TUNISIA_REGION = {
  latitude: 34.5,
  longitude: 9.5,
  latitudeDelta: 5.5,
  longitudeDelta: 4.5,
};

export const TUNISIA_GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte',
  'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
  'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine',
  'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];
