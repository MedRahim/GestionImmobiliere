import {API_HOST} from '../config/api';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=120&h=120&fit=crop',
];

export function getPropertyFallbackImage(propertyId = 1): string {
  return FALLBACK_IMAGES[Math.abs(propertyId) % FALLBACK_IMAGES.length];
}

export function getMapFallbackThumbnail(propertyId = 1): string {
  const base = FALLBACK_IMAGES[Math.abs(propertyId) % FALLBACK_IMAGES.length].split('?')[0];
  return `${base}?w=72&h=72&fit=crop&q=70`;
}

export function resolvePropertyImageUrl(
  url?: string | null,
  propertyId?: number,
): string {
  if (url) {
    if (/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/uploads')) {
          return `${API_HOST}${parsed.pathname}`;
        }
        return url;
      } catch {
        return url;
      }
    }
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${API_HOST}${path}`;
  }
  return getPropertyFallbackImage(propertyId || 1);
}

/** Petite image pour les pins carte (72px) — charge plus vite */
export function resolveMapThumbnailUrl(
  url?: string | null,
  propertyId?: number,
): string {
  const full = resolvePropertyImageUrl(url, propertyId);
  if (/images\.unsplash\.com/i.test(full)) {
    const base = full.split('?')[0];
    return `${base}?w=72&h=72&fit=crop&q=70`;
  }
  return full;
}
