import { R2Usage } from '../../features/r2-usage/r2Usage.types';
import { apiClient } from './apiClient';

export const r2UsageService = {
  get: () => apiClient.get<R2Usage>('/api/r2-usage'),
};
