import { Booth } from '../../types';
import { apiClient } from './apiClient';

export const boothsService = {
  getAll: async (): Promise<Booth[]> => {
    return apiClient.get<Booth[]>('/booths');
  },

  save: async (booth: Booth, isEdit: boolean): Promise<Booth> => {
    if (isEdit) {
      return apiClient.put<Booth>(`/booths/${encodeURIComponent(booth.id)}`, booth);
    }
    return apiClient.post<Booth>('/booths', booth);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/booths/${encodeURIComponent(id)}`);
    return true;
  }
};
