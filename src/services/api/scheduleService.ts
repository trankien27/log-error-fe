import {
  BulkCreateWorkScheduleRequest,
  CalendarDayDto,
  CalendarResponseDto,
  ChangeShiftRequest,
  ChangeUserRequest,
  CreateWorkScheduleRequest,
  ShiftDto,
  UpdateWorkScheduleRequest,
  UpdateWorkScheduleStatusRequest,
  WorkScheduleDto,
} from '../../types';
import { apiClient } from './apiClient';

type ValidateBulkResponse = {
  isValid: boolean;
  errors: Array<{
    index: number;
    field: string;
    message: string;
  }>;
};

type BulkCreateResponse = {
  createdCount: number;
  items: WorkScheduleDto[];
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

export const scheduleService = {
  getShifts: (isActive: boolean | null = true): Promise<ShiftDto[]> => {
    return apiClient.get<ShiftDto[]>(`/api/shifts${buildQuery({ isActive })}`);
  },

  getCalendar: (fromDate: string, toDate: string): Promise<CalendarResponseDto> => {
    return apiClient.get<CalendarResponseDto>(`/api/work-schedules/calendar${buildQuery({ fromDate, toDate })}`);
  },

  getByDate: (date: string): Promise<CalendarDayDto> => {
    return apiClient.get<CalendarDayDto>(`/api/work-schedules/by-date${buildQuery({ date })}`);
  },

  getWorkSchedules: (params: {
    fromDate: string;
    toDate: string;
    userId?: string;
    shiftId?: number;
    status?: number;
  }): Promise<WorkScheduleDto[]> => {
    return apiClient.get<WorkScheduleDto[]>(`/api/work-schedules${buildQuery(params)}`);
  },

  createWorkSchedule: (schedule: CreateWorkScheduleRequest): Promise<WorkScheduleDto> => {
    return apiClient.post<WorkScheduleDto>('/api/work-schedules', schedule);
  },

  bulkCreateWorkSchedules: (request: BulkCreateWorkScheduleRequest): Promise<BulkCreateResponse> => {
    return apiClient.post<BulkCreateResponse>('/api/work-schedules/bulk', request);
  },

  updateWorkSchedule: (id: number, schedule: UpdateWorkScheduleRequest): Promise<WorkScheduleDto> => {
    return apiClient.put<WorkScheduleDto>(`/api/work-schedules/${id}`, schedule);
  },

  changeShift: (id: number, request: ChangeShiftRequest): Promise<WorkScheduleDto> => {
    return apiClient.patch<WorkScheduleDto>(`/api/work-schedules/${id}/change-shift`, request);
  },

  changeUser: (id: number, request: ChangeUserRequest): Promise<WorkScheduleDto> => {
    return apiClient.patch<WorkScheduleDto>(`/api/work-schedules/${id}/change-user`, request);
  },

  updateWorkScheduleStatus: (id: number, request: UpdateWorkScheduleStatusRequest): Promise<WorkScheduleDto> => {
    return apiClient.patch<WorkScheduleDto>(`/api/work-schedules/${id}/status`, request);
  },

  deleteWorkSchedule: async (id: number): Promise<boolean> => {
    await apiClient.delete<{ id: number }>(`/api/work-schedules/${id}`);
    return true;
  },

  validateDate: (date: string): Promise<CalendarDayDto & { message?: string }> => {
    return apiClient.get<CalendarDayDto & { message?: string }>(`/api/work-schedules/validate-date${buildQuery({ date })}`);
  },

  validateBulk: (request: BulkCreateWorkScheduleRequest): Promise<ValidateBulkResponse> => {
    return apiClient.post<ValidateBulkResponse>('/api/work-schedules/validate-bulk', request);
  },
};
