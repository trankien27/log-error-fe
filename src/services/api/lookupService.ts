import { LookupItem, PagedResult } from '../../types';
import { apiClient } from './apiClient';

type LookupQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

function buildQuery({ search, pageIndex = 0, pageSize = 10 }: LookupQuery) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(pageSize),
  });

  if (search?.trim()) {
    params.set('search', search.trim());
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
