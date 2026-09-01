import api from './client';
import {Property} from '../types';

export const favoritesApi = {
  getIds: () =>
    api.get<{success: boolean; ids: number[]}>('/favorites/ids').then(r => r.data),

  getAll: () =>
    api.get<{success: boolean; properties: Property[]}>('/favorites').then(r => r.data),

  add: (propertyId: number) =>
    api.post<{success: boolean; propertyId: number}>(`/favorites/${propertyId}`).then(r => r.data),

  remove: (propertyId: number) =>
    api.delete<{success: boolean; propertyId: number}>(`/favorites/${propertyId}`).then(r => r.data),
};
