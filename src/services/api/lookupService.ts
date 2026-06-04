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

export const lookupService = {
  searchBooths: (query: LookupQuery = {}) => {
    return apiClient.get<PagedResult<LookupItem>>(`/api/booths?${buildQuery(query)}`);
  },

  searchStores: (query: LookupQuery = {}) => {
    return apiClient.get<PagedResult<LookupItem>>(`/api/stores?${buildQuery({ pageSize: 20, ...query })}`);
  },
};
