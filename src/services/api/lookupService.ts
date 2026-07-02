import { LookupItem, PagedResult } from '../../types';
import { apiClient } from './apiClient';

type LookupQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
  storeId?: string | number;
};

function buildQuery({ search, pageIndex = 0, pageSize = 10, storeId }: LookupQuery) {
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

function buildBoothSearchQuery({ search, pageIndex = 0, pageSize = 10 }: LookupQuery) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(pageSize),
  });

  if (search?.trim()) {
    params.set('name', search.trim());
  }

  return params.toString();
}

export const lookupService = {
  searchBooths: (query: LookupQuery = {}) => {
    if (query.storeId !== undefined && query.storeId !== '') {
      return apiClient.get<PagedResult<LookupItem>>(`/api/booths?${buildQuery(query)}`);
    }

    return apiClient.get<PagedResult<LookupItem>>(`/api/booths/search?${buildBoothSearchQuery(query)}`);
  },

  searchStores: (query: LookupQuery = {}) => {
    return apiClient.get<PagedResult<LookupItem>>(`/api/stores?${buildQuery({ pageSize: 20, ...query })}`);
  },
};
