import { SystemNotification } from '../../types';
import { apiClient } from './apiClient';

export const notificationsService = {
  getAll: async (): Promise<SystemNotification[]> => {
    return apiClient.get<SystemNotification[]>('/notifications');
  },

  create: async (notification: Omit<SystemNotification, 'id' | 'time' | 'isRead'>): Promise<SystemNotification> => {
    return apiClient.post<SystemNotification>('/notifications', notification);
  },

  toggleReadState: async (id: string): Promise<SystemNotification> => {
    return apiClient.patch<SystemNotification>(`/notifications/${encodeURIComponent(id)}/read-state`);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/notifications/${encodeURIComponent(id)}`);
    return true;
  }
};
