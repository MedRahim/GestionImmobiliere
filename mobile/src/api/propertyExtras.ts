import api from './client';
import {AvailabilityRange, NearbyPlace, PropertyReview} from '../types';

export const propertyExtrasApi = {
  nearby: (propertyId: number) =>
    api
      .get<{success: boolean; places: NearbyPlace[]; message?: string}>(
        `/properties/${propertyId}/nearby`,
      )
      .then(r => r.data),

  getAvailability: (propertyId: number) =>
    api
      .get<{success: boolean; ranges: AvailabilityRange[]}>(
        `/properties/${propertyId}/availability`,
      )
      .then(r => r.data),

  setAvailability: (propertyId: number, ranges: AvailabilityRange[]) =>
    api
      .put<{success: boolean; ranges: AvailabilityRange[]}>(
        `/properties/${propertyId}/availability`,
        {ranges},
      )
      .then(r => r.data),

  getReviews: (propertyId: number) =>
    api
      .get<{
        success: boolean;
        averageRating: number | null;
        reviewCount: number;
        myReview: {id: number; rating: number; comment?: string} | null;
        reviews: PropertyReview[];
      }>(`/properties/${propertyId}/reviews`)
      .then(r => r.data),

  upsertReview: (propertyId: number, rating: number, comment?: string) =>
    api
      .post(`/properties/${propertyId}/reviews`, {rating, comment})
      .then(r => r.data),
};
