import { PagedResult, RecentActivity } from '../../types';
import { apiClient } from './apiClient';

export type RecentActivityQuery = {
  date?: string;
  activityType?: number;
  pageIndex?: number;
  pageSize?: number;
};

function buildQuery(query: RecentActivityQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const activitiesService = {
  getRecent: async (query: RecentActivityQuery = {}): Promise<PagedResult<RecentActivity>> => {
    const pageIndex = query.pageIndex ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await apiClient.get<PagedResult<RecentActivity> | RecentActivity[]>(
      `/api/recent-activities${buildQuery({ ...query, pageIndex, pageSize })}`,
    );

    if (Array.isArray(result)) {
      return {
        items: result,
        totalItems: result.length,
        totalPages: result.length > 0 ? 1 : 0,
        pageIndex,
        pageSize,
      };
    }

    return result;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/api/recent-activities/${encodeURIComponent(id)}`);
  },
};
