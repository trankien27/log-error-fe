import { ErrorGroup, ErrorLog, ErrorLogStatus, PagedResult, ProcessingFlow, Severity } from '../../types';
import { apiClient, API_BASE_URL, AUTH_TOKEN_KEY } from './apiClient';

export type ErrorLogQuery = {
  status?: ErrorLogStatus;
  month?: number;
  store?: string;
  booth?: string;
  errorGroup?: ErrorGroup;
  processingFlow?: ProcessingFlow;
  severity?: Severity;
  pageIndex?: number;
  pageSize?: number;
};

export type ErrorLogPayload = {
  receivedDate: string;
  store: string;
  booth?: string;
  errorGroup: ErrorGroup;
  description: string;
  processingFlow: ProcessingFlow;
  preliminaryCause?: string;
  solution?: string;
  severity: Severity;
  assignedToId: string;
  note?: string;
  status?: ErrorLogStatus;
};

function buildQuery(params: ErrorLogQuery = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function getFileName(response: Response) {
  const contentDisposition = response.headers.get('Content-Disposition');
  const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  return match ? decodeURIComponent(match[1]) : 'BaoCaoLoi.xlsx';
}

export const logsService = {
  getAll: async (query?: ErrorLogQuery): Promise<PagedResult<ErrorLog>> => {
    const result = await apiClient.get<PagedResult<ErrorLog> | ErrorLog[]>(`/api/error-logs${buildQuery(query)}`);

    if (Array.isArray(result)) {
      return {
        items: result,
        totalItems: result.length,
        totalPages: 1,
        pageIndex: query?.pageIndex ?? 1,
        pageSize: query?.pageSize ?? 20,
      };
    }

    return result;
  },

  create: async (log: ErrorLogPayload): Promise<ErrorLog> => {
    const { status, ...createPayload } = log;
    return apiClient.post<ErrorLog>('/api/error-logs', createPayload);
  },

  update: async (id: string, log: ErrorLogPayload): Promise<ErrorLog> => {
    return apiClient.put<ErrorLog>(`/api/error-logs/${encodeURIComponent(id)}`, log);
  },

  updateStatus: async (id: string, status: ErrorLogStatus): Promise<ErrorLog> => {
    return apiClient.patch<ErrorLog>(`/api/error-logs/${encodeURIComponent(id)}/status`, { status });
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/api/error-logs/${encodeURIComponent(id)}`);
    return true;
  },

  syncGoogleSheet: async (): Promise<void> => {
    await apiClient.post<void>('/api/error-logs/sync-google-sheet');
  },

  exportExcel: async (query?: ErrorLogQuery): Promise<{ blob: Blob; fileName: string }> => {
    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/error-logs/export${buildQuery(query)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Không thể xuất file Excel. Status: ${response.status}`);
    }

    return {
      blob: await response.blob(),
      fileName: getFileName(response),
    };
  },
};
