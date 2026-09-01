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

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads')) {
        return `${API_HOST}${parsed.pathname}${parsed.search || ''}`;
      }
      return url;
    } catch {
      return url;
    }
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_HOST}${path}`;
}

export function resolvePropertyImageUrl(
  url?: string | null,
  propertyId?: number,
): string {
  if (url) {
    return resolveMediaUrl(url) || getPropertyFallbackImage(propertyId || 1);
  }
  return getPropertyFallbackImage(propertyId || 1);
}

function withSize(url: string, w: number, h: number): string {
  if (/images\.unsplash\.com/i.test(url)) {
    const base = url.split('?')[0];
    return `${base}?w=${w}&h=${h}&fit=crop&q=70`;
  }
  if (/[?&]w=\d+/i.test(url)) return url;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url) && /\/uploads\//i.test(url)) {
    return url.includes('?') ? `${url}&w=${w}` : `${url}?w=${w}`;
  }
  return url;
}

/** Petite image pour les pins carte (72px) — charge plus vite */
export function resolveMapThumbnailUrl(
  url?: string | null,
  propertyId?: number,
): string {
  return withSize(resolvePropertyImageUrl(url, propertyId), 72, 72);
}

/** Image liste / cartes (moins de RAM que full-size) */
export function resolveListThumbnailUrl(
  url?: string | null,
  propertyId?: number,
): string {
  return withSize(resolvePropertyImageUrl(url, propertyId), 480, 320);
}
