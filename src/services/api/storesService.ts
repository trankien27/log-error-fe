import { PagedResult, Store } from '../../types';
import { apiClient } from './apiClient';

export type StoresQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

export interface SyncStoresResponse {
  added: number;
  updated: number;
  deleted: number;
  total: number;
}

function buildStoresQuery({ search, pageIndex = 0, pageSize = 20 }: StoresQuery = {}) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(pageSize),
  });

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  return params.toString();
}

export const storesService = {
  getPage: (query: StoresQuery = {}): Promise<PagedResult<Store>> => {
    return apiClient.get<PagedResult<Store>>(`/api/stores?${buildStoresQuery(query)}`);
  },

  syncStores: (): Promise<SyncStoresResponse> => {
    return apiClient.post<SyncStoresResponse>('/api/stores/sync');
  },

  getLatestSync: (): Promise<string | null> => {
    return apiClient.get<string | null>('/api/stores/latest-sync');
  },
};
