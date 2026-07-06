import api from './client';
import {Property, PropertyFilters} from '../types';

export const propertiesApi = {
  getAll: (filters: PropertyFilters = {}) =>
    api
      .get<{
        success: boolean;
        data: Property[];
        properties: Property[];
        pagination?: {page: number; limit: number; total: number};
      }>('/properties', {params: filters})
      .then(r => r.data),

  // Same filters as /search but uses the stable list endpoint (avoids route/id conflicts).
  search: (filters: PropertyFilters = {}) => propertiesApi.getAll(filters),

  getById: (propertyId: number) =>
    api
      .get<{success: boolean; property: Property}>(`/properties/${propertyId}`)
      .then(r => r.data),

  getMine: () =>
    api
      .get<{success: boolean; data: Property[]; properties: Property[]}>(
        '/properties/mine',
      )
      .then(r => r.data),

  create: (data: Record<string, unknown>) =>
    api.post<{success: boolean; property: Property}>('/properties', data).then(r => r.data),

  update: (propertyId: number, data: Record<string, unknown>) =>
    api
      .put<{success: boolean; property: Property}>(`/properties/${propertyId}`, data)
      .then(r => r.data),

  delete: (propertyId: number) =>
    api.delete(`/properties/${propertyId}`).then(r => r.data),
};
