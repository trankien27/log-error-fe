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

export type ErrorLogStats = {
  total: number;
  inProgress: number;
  sentToDev: number;
  monitoringAfterFix: number;
};

export type ErrorLogStatsQuery = {
  fromDate: string;
  toDate: string;
};

export type ErrorLogReportTextQuery = {
  fromDate: string;
  toDate: string;
};

export type ErrorLogReportPayload = {
  ids: string[];
};

export type ErrorLogStatsByGroupItem = {
  errorGroup: string;
  count: number;
};

export type ErrorLogStatsByGroup = {
  total: number;
  byGroup: ErrorLogStatsByGroupItem[];
};

export type ErrorLogByStore = {
  store: string;
  errorCount: number;
};

export type ErrorLogByStoreQuery = {
  month: number;
  year: number;
  ascending: boolean;
};

export type TransactionImageUploadResponse = {
  transactionId: string;
  uploadedCount: number;
  responseBody: string;
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

  getStats: async (query: ErrorLogStatsQuery): Promise<ErrorLogStats> => {
    const searchParams = new URLSearchParams({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return apiClient.get<ErrorLogStats>(`/api/error-logs/stats?${searchParams.toString()}`);
  },

  getReportText: async (query: ErrorLogReportTextQuery): Promise<string> => {
    const searchParams = new URLSearchParams({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return apiClient.get<string>(`/api/error-logs/report-text?${searchParams.toString()}`);
  },

  createReport: async (payload: ErrorLogReportPayload): Promise<string> => {
    return apiClient.post<string>('/api/error-logs/report', payload);
  },

  getStatsByGroup: async (query: ErrorLogStatsQuery): Promise<ErrorLogStatsByGroup> => {
    const searchParams = new URLSearchParams({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return apiClient.get<ErrorLogStatsByGroup>(`/api/error-logs/stats/by-group?${searchParams.toString()}`);
  },

  getByStore: async (query: ErrorLogByStoreQuery): Promise<ErrorLogByStore[]> => {
    const searchParams = new URLSearchParams({
      month: String(query.month),
      year: String(query.year),
      ascending: String(query.ascending),
    });

    return apiClient.get<ErrorLogByStore[]>(`/api/error-logs/by-store?${searchParams.toString()}`);
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

  uploadTransactionImages: async (
    transactionId: string,
    images: File[],
  ): Promise<TransactionImageUploadResponse> => {
    const formData = new FormData();
    images.forEach(image => formData.append('images', image));

    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/error-logs/transactions/${encodeURIComponent(transactionId)}/upload-images`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || `Không thể upload ảnh. Status: ${response.status}`);
    }

    const payload = await response.json();
    return payload?.data ?? payload;
  },
};
