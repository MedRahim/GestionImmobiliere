import api from './client';



export interface AppNotification {

  id: number;

  notificationId: number;

  type: string;

  title: string;

  message?: string;

  read: boolean;

  createdAt: string;

  relatedPropertyId?: number;

  relatedInquiryId?: number;

}



export const notificationsApi = {

  getAll: () =>

    api

      .get<{success: boolean; notifications: AppNotification[]}>('/notifications')

      .then(r => r.data),



  getUnreadCount: () =>

    api

      .get<{success: boolean; unreadCount: number}>('/notifications/unread-count')

      .then(r => r.data),



  markAsRead: (id: number) =>

    api.patch(`/notifications/${id}/read`).then(r => r.data),



  markAllAsRead: () =>
    api.patch('/notifications/read-all').then(r => r.data),

  delete: (id: number) =>
    api.delete(`/notifications/${id}`).then(r => r.data),
};


