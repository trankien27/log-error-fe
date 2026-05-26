import type { ErrorLog } from '@/features/errors/types/error.type';
import { apiClient } from '@/services/api/apiClient';

export const errorApi = {
  getAll: async (): Promise<ErrorLog[]> => {
    return apiClient.get<ErrorLog[]>('/logs');
  },

  create: async (log: Omit<ErrorLog, 'id' | 'reportTime'>): Promise<ErrorLog> => {
    return apiClient.post<ErrorLog>('/logs', log);
  },

  update: async (id: string, updatedFields: Partial<ErrorLog>): Promise<ErrorLog> => {
    return apiClient.patch<ErrorLog>(`/logs/${encodeURIComponent(id)}`, updatedFields);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/logs/${encodeURIComponent(id)}`);
    return true;
  }
};
