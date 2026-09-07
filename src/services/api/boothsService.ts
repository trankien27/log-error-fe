import { Booth, LookupItem, PagedResult } from '../../types';
import { apiClient } from './apiClient';

export type BoothsQuery = {
  search?: string;
  storeId?: string | number;
  pageIndex?: number;
  pageSize?: number;
};

export interface AgentKeyResponse {
  agentKey?: string;
  AgentKey?: string;
  key?: string;
  [key: string]: unknown;
}

export interface SyncBoothsResponse {
  added: number;
  updated: number;
  deleted: number;
  total: number;
}

function buildBoothsQuery({ search, storeId, pageIndex = 0, pageSize = 50 }: BoothsQuery = {}) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(pageSize),
  });

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (storeId !== undefined && storeId !== '') {
    params.set('storeId', String(storeId));
  }

  return params.toString();
}

function mapBooth(item: LookupItem | Booth): Booth {
  const code = item.code || ('ultraviewId' in item ? item.ultraviewId : '') || String(item.id);
  const storeId = item.storeId ?? null;

  return {
    id: String(item.id),
    code,
    agentKey: item.agentKey ?? null,
    name: item.name,
    storeId,
    storeName: item.storeName ?? null,
    lastSyncedAt: item.lastSyncedAt ?? null,
    ultraviewId: code,
    relatedStores: item.relatedStores
      ? item.relatedStores
      : item.storeName
        ? item.storeName
      : storeId !== null
        ? String(storeId)
        : '',
  };
}

export const boothsService = {
  getPage: async (query: BoothsQuery = {}): Promise<PagedResult<Booth>> => {
    const result = await apiClient.get<PagedResult<LookupItem>>(`/api/booths?${buildBoothsQuery(query)}`);

    return {
      ...result,
      items: result.items.map(mapBooth),
    };
  },

  getAll: async (query: BoothsQuery = {}): Promise<Booth[]> => {
    const result = await boothsService.getPage(query);

    return result.items;
  },

  syncBooths: async (): Promise<SyncBoothsResponse> => {
    return apiClient.post<SyncBoothsResponse>('/api/booths/sync');
  },

  getLatestSync: async (): Promise<string | null> => {
    return apiClient.get<string | null>('/api/booths/latest-sync');
  },

  search: async (name: string, pageIndex = 0, pageSize = 20): Promise<PagedResult<LookupItem>> => {
    const params = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    });

    if (name.trim()) {
      params.set('name', name.trim());
    }

    return apiClient.get<PagedResult<LookupItem>>(`/api/booths/search?${params.toString()}`);
  },

  save: async (booth: Booth, isEdit: boolean): Promise<Booth> => {
    const payload = {
      ...booth,
      code: booth.code || booth.ultraviewId || booth.id,
      name: booth.name,
      storeId: booth.storeId ?? undefined,
    };

    if (isEdit) {
      const saved = await apiClient.put<Booth | LookupItem>(`/api/booths/${encodeURIComponent(booth.id)}`, payload);
      return mapBooth(saved);
    }
    const saved = await apiClient.post<Booth | LookupItem>('/api/booths', payload);
    return mapBooth(saved);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/api/booths/${encodeURIComponent(id)}`);
    return true;
  },

  generateAgentKey: async (boothId: string): Promise<AgentKeyResponse> => {
    return apiClient.post<AgentKeyResponse>(`/api/booths/${encodeURIComponent(boothId)}/agent-key`);
  },

  getAgentKey: async (boothId: string): Promise<AgentKeyResponse> => {
    return apiClient.get<AgentKeyResponse>(`/api/booths/${encodeURIComponent(boothId)}/agent-key`);
  },
};
