import { ErrorLog } from '../../types';
import { apiClient } from './apiClient';

type BackendErrorLogStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

type BackendErrorLog = {
  id: string;
  name?: string;
  title?: string;
  errorDate?: string;
  reportTime?: string;
  store: string;
  booth: string;
  description?: string;
  reporterId?: string;
  reporterName?: string;
  reporter?: string;
  status?: BackendErrorLogStatus;
  severity?: ErrorLog['severity'];
  attachment?: boolean;
};

type ErrorLogPayload = {
  name: string;
  errorDate: string;
  store: string;
  booth: string;
  description: string;
  reporterId?: string;
};

const statusToBackend: Record<ErrorLog['status'], BackendErrorLogStatus> = {
  'Mới': 'Open',
  'Đang xử lý': 'InProgress',
  'Đã đóng': 'Closed',
};

const statusFromBackend: Record<BackendErrorLogStatus, ErrorLog['status']> = {
  Open: 'Mới',
  InProgress: 'Đang xử lý',
  Resolved: 'Đã đóng',
  Closed: 'Đã đóng',
};

function toErrorLog(log: BackendErrorLog): ErrorLog {
  const title = log.name || log.title || log.description || '';

  return {
    id: log.id,
    title,
    description: log.description || title,
    reporter: log.reporterName || log.reporter || log.reporterId || 'N/A',
    reportTime: log.errorDate || log.reportTime || '',
    store: log.store,
    booth: log.booth,
    attachment: log.attachment ?? false,
    status: log.status ? statusFromBackend[log.status] : 'Mới',
    severity: log.severity || 'Cảnh báo',
  };
}

function toPayload(log: Partial<ErrorLog>): ErrorLogPayload {
  return {
    name: log.title || '',
    errorDate: log.reportTime || new Date().toISOString(),
    store: log.store || '',
    booth: log.booth || '',
    description: log.description || log.title || '',
  };
}

export const logsService = {
  getAll: async (status?: BackendErrorLogStatus): Promise<ErrorLog[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const logs = await apiClient.get<BackendErrorLog[]>(`/api/error-logs${query}`);
    return logs.map(toErrorLog);
  },

  create: async (log: Omit<ErrorLog, 'id' | 'reportTime'>): Promise<ErrorLog> => {
    const createdLog = await apiClient.post<BackendErrorLog>('/api/error-logs', toPayload(log));

    if (log.status && log.status !== 'Mới') {
      const updatedLog = await apiClient.patch<BackendErrorLog>(
        `/api/error-logs/${encodeURIComponent(createdLog.id)}/status`,
        { status: statusToBackend[log.status] }
      );
      return toErrorLog(updatedLog);
    }

    return toErrorLog(createdLog);
  },

  update: async (id: string, updatedFields: Partial<ErrorLog>): Promise<ErrorLog> => {
    const updatedLog = await apiClient.put<BackendErrorLog>(
      `/api/error-logs/${encodeURIComponent(id)}`,
      toPayload(updatedFields)
    );

    if (updatedFields.status) {
      const statusLog = await apiClient.patch<BackendErrorLog>(
        `/api/error-logs/${encodeURIComponent(id)}/status`,
        { status: statusToBackend[updatedFields.status] }
      );
      return toErrorLog(statusLog);
    }

    return toErrorLog(updatedLog);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/api/error-logs/${encodeURIComponent(id)}`);
    return true;
  }
};
