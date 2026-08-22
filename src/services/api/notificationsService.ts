import { SystemNotification } from '../../types';
import { apiClient } from './apiClient';

export const notificationsService = {
  getAll: async (): Promise<SystemNotification[]> => {
    return apiClient.get<SystemNotification[]>('/api/notifications');
  },

  create: async (notification: {
    title: string;
    content: string;
    type: SystemNotification['type'];
    tagName: string;
    audienceType: 'all' | 'users';
    recipientUserIds: string[];
  }): Promise<{ sentCount: number }> => {
    return apiClient.post<{ sentCount: number }>('/api/notifications', notification);
  },

  toggleReadState: async (id: string): Promise<SystemNotification> => {
    return apiClient.patch<SystemNotification>(`/api/notifications/${encodeURIComponent(id)}/read-state`);
  },

  markAllRead: async (): Promise<{ updatedCount: number }> => {
    return apiClient.patch<{ updatedCount: number }>('/api/notifications/read-all');
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/api/notifications/${encodeURIComponent(id)}`);
    return true;
  }
};
