import {
  CreateOvertimeRequest,
  OvertimeMonthlyReportRow,
  OvertimeRequestDto,
  OvertimeStatus,
} from '../../types';
import { apiClient } from './apiClient';

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const overtimeService = {
  getAll: (params: {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    status?: OvertimeStatus | '';
  } = {}): Promise<OvertimeRequestDto[]> => {
    return apiClient.get<OvertimeRequestDto[]>(`/api/overtime-requests${buildQuery(params)}`);
  },

  create: (request: CreateOvertimeRequest): Promise<OvertimeRequestDto> => {
    return apiClient.post<OvertimeRequestDto>('/api/overtime-requests', request);
  },

  approve: (id: number): Promise<OvertimeRequestDto> => {
    return apiClient.post<OvertimeRequestDto>(`/api/overtime-requests/${id}/approve`);
  },

  reject: (id: number, rejectReason: string): Promise<OvertimeRequestDto> => {
    return apiClient.post<OvertimeRequestDto>(`/api/overtime-requests/${id}/reject`, { rejectReason });
  },

  getMonthlyReport: (params: {
    year: number;
    month: number;
    userId?: string;
  }): Promise<OvertimeMonthlyReportRow[]> => {
    return apiClient.get<OvertimeMonthlyReportRow[]>(`/api/overtime-requests/monthly-report${buildQuery(params)}`);
  },
};
