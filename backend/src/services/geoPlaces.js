/**
 * Best-effort Nominatim geocode for Tunisia listings.
 */
async function geocodeTunisia({ address, city, state }) {
  const q = [address, city, state, 'Tunisie'].filter(Boolean).join(', ');
  if (!q || q.length < 3) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tn&q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ImmoDary/1.0 (immobilier-app)',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    return {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Nearby amenities via Overpass around a point.
 */
async function fetchNearbyPlaces(lat, lng, radiusMeters = 1200) {
  const around = `${radiusMeters},${lat},${lng}`;
  const query = `
    [out:json][timeout:12];
    (
      node["amenity"="pharmacy"](around:${around});
      node["amenity"="hospital"](around:${around});
      node["amenity"="clinic"](around:${around});
      node["amenity"="school"](around:${around});
      node["amenity"="university"](around:${around});
      node["amenity"="kindergarten"](around:${around});
      node["amenity"="cafe"](around:${around});
      node["amenity"="restaurant"](around:${around});
      node["amenity"="bank"](around:${around});
      node["amenity"="atm"](around:${around});
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${around});
      node["shop"="supermarket"](around:${around});
      node["shop"="convenience"](around:${around});
      node["leisure"="park"](around:${around});
    );
    out body 40;
  `.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ImmoDary/1.0 (immobilier-app)',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const elements = data.elements || [];

    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const mapType = (tags = {}) => {
      if (tags.amenity === 'pharmacy') return 'pharmacy';
      if (tags.amenity === 'hospital' || tags.amenity === 'clinic') return 'hospital';
      if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'kindergarten') return 'school';
      if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') return 'cafe';
      if (tags.amenity === 'bank' || tags.amenity === 'atm') return 'bank';
      if (tags.amenity === 'place_of_worship') return 'mosque';
      if (tags.shop === 'supermarket' || tags.shop === 'convenience') return 'supermarket';
      if (tags.leisure === 'park') return 'park';
      return tags.amenity || tags.shop || 'place';
    };

    const defaultName = (type) => {
      const names = {
        pharmacy: 'Pharmacie',
        hospital: 'Hôpital / clinique',
        school: 'École',
        cafe: 'Café / restaurant',
        bank: 'Banque / ATM',
        mosque: 'Mosquée',
        supermarket: 'Supermarché',
        park: 'Parc',
      };
      return names[type] || 'Lieu';
    };

    return elements
      .filter((el) => el.lat != null && el.lon != null)
      .map((el) => {
        const type = mapType(el.tags);
        const distanceKm =
          Math.round(haversineKm(lat, lng, el.lat, el.lon) * 100) / 100;
        return {
          id: String(el.id),
          type,
          name: el.tags?.name || defaultName(type),
          distanceKm,
          latitude: el.lat,
          longitude: el.lon,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 24);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

module.exports = { geocodeTunisia, fetchNearbyPlaces };
