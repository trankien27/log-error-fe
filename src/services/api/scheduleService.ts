import { apiClient } from './apiClient';

export const scheduleService = {
  getAll: async (): Promise<any[]> => {
    return apiClient.get<any[]>('/shifts');
  },

  save: async (shift: any): Promise<any> => {
    const shifts = await scheduleService.getAll();
    const exists = shifts.some(s => s.id === shift.id);
    if (exists) {
      return apiClient.put<any>(`/shifts/${encodeURIComponent(shift.id)}`, shift);
    }
    return apiClient.post<any>('/shifts', shift);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/shifts/${encodeURIComponent(id)}`);
    return true;
  }
};
