import { Booth, LookupItem, PagedResult } from '../../types';
import { apiClient } from './apiClient';

export interface GenerateAgentKeyResponse {
  agentKey?: string;
  AgentKey?: string;
  key?: string;
  [key: string]: unknown;
}

export const boothsService = {
  getAll: async (): Promise<Booth[]> => {
    const result = await apiClient.get<PagedResult<LookupItem>>('/api/booths?pageIndex=0&pageSize=50');

    return result.items.map(item => ({
      id: String(item.id),
      name: item.name,
      ultraviewId: item.code || String(item.id),
      relatedStores: '',
    }));
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
  },

  generateAgentKey: async (boothId: string): Promise<GenerateAgentKeyResponse> => {
    return apiClient.post<GenerateAgentKeyResponse>(`/api/booths/${encodeURIComponent(boothId)}/agent-key`);
  },
};
