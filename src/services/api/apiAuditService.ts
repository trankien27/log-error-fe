import { PagedResult } from '../../types';
import {
  ApiAuditLog,
  ApiAuditLogQuery,
  ApiAuditLogSummary,
} from '../../features/api-audit/apiAudit.types';
import { apiClient } from './apiClient';

function buildQuery(query: ApiAuditLogQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const apiAuditService = {
  getLogs: async (query: ApiAuditLogQuery = {}): Promise<PagedResult<ApiAuditLog>> => {
    const pageIndex = query.pageIndex ?? 1;
    const pageSize = query.pageSize ?? 20;
    return apiClient.get<PagedResult<ApiAuditLog>>(
      `/api/api-audit-logs${buildQuery({ ...query, pageIndex, pageSize })}`,
    );
  },

  getSummary: (query: ApiAuditLogQuery = {}): Promise<ApiAuditLogSummary> => (
    apiClient.get<ApiAuditLogSummary>(`/api/api-audit-logs/summary${buildQuery(query)}`)
  ),
};
