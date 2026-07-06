import api from './client';
import {Inquiry} from '../types';

export const inquiriesApi = {
  getAll: () =>
    api.get<{success: boolean; inquiries: Inquiry[]}>('/inquiries').then(r => r.data),

  create: (data: {propertyId: number; message: string; subject?: string}) =>
    api.post<{success: boolean; inquiry: Inquiry}>('/inquiries', data).then(r => r.data),

  updateStatus: (inquiryId: number, status: string) =>
    api
      .patch(`/inquiries/${inquiryId}/status`, {status})
      .then(r => r.data),
};
