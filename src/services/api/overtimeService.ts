import {
  CreateOvertimeRequest,
  OvertimeMonthlyReportRow,
  OvertimeRequestDto,
  OvertimeStatus,
} from '../../types';
import { apiClient, API_BASE_URL, AUTH_TOKEN_KEY } from './apiClient';

type OvertimeMonthlyReportExportResponse = {
  data: string;
  fileName?: string;
};

function parseMonthlyExportPayload(payload: unknown): OvertimeMonthlyReportExportResponse {
  if (typeof payload === 'string') {
    return { data: payload };
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Dữ liệu export OT không hợp lệ.');
  }

  const root = payload as Record<string, unknown>;
  const rootData = root.data;

  if (typeof rootData === 'string') {
    return {
      data: rootData,
      fileName: typeof root.fileName === 'string' ? root.fileName : undefined,
    };
  }

  if (rootData && typeof rootData === 'object') {
    const inner = rootData as Record<string, unknown>;
    if (typeof inner.data === 'string') {
      return {
        data: inner.data,
        fileName:
          typeof inner.fileName === 'string'
            ? inner.fileName
            : typeof root.fileName === 'string'
              ? root.fileName
              : undefined,
      };
    }
  }

  throw new Error('Dữ liệu export OT không hợp lệ.');
}

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

  exportMonthlyReport: async (params: {
    year: number;
    month: number;
    userId?: string;
  }): Promise<OvertimeMonthlyReportExportResponse> => {
    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/overtime-requests/monthly-report/export${buildQuery(params)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Không thể xuất báo cáo OT. Status: ${response.status}`);
    }

    const payload = await response.json();
    return parseMonthlyExportPayload(payload);
  },
};
