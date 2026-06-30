import { CreateShiftRequest, ShiftDto } from '../../types';
import { apiClient } from './apiClient';

export type ShiftsQuery = {
  isActive?: boolean | null;
  keyword?: string;
};

type ShiftsResponse = ShiftDto[] | {
  items?: ShiftDto[];
};

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

function normalizeList(result: ShiftsResponse) {
  return Array.isArray(result) ? result : result.items || [];
}

export const shiftsService = {
  getAll: (query: ShiftsQuery = {}): Promise<ShiftDto[]> => {
    return apiClient.get<ShiftsResponse>(`/api/shifts${buildQuery(query)}`).then(normalizeList);
  },

  getById: (id: number): Promise<ShiftDto> => {
    return apiClient.get<ShiftDto>(`/api/shifts/${id}`);
  },

  create: (request: CreateShiftRequest): Promise<ShiftDto> => {
    return apiClient.post<ShiftDto>('/api/shifts', request);
  },

  updateStatus: (id: number, isActive: boolean): Promise<ShiftDto> => {
    return apiClient.patch<ShiftDto>(`/api/shifts/${id}/status`, { isActive });
  },
};
