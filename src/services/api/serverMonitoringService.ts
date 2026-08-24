import { apiClient } from './apiClient';

export type ServerMonitoringStatus = {
  cpu: {
    usagePercent: number;
  };
  memory: {
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  };
  sampledAt: string;
};

export const serverMonitoringService = {
  getStatus: () => apiClient.get<ServerMonitoringStatus>('/api/server-monitoring/status'),
};
