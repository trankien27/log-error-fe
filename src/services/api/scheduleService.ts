import {
  BulkCreateWorkScheduleRequest,
  BulkAssignWorkScheduleRequest,
  CalendarDayDto,
  CalendarResponseDto,
  ChangeShiftRequest,
  ChangeUserRequest,
  CopyWeekWorkScheduleRequest,
  CreateWorkScheduleRequest,
  ShiftDto,
  UpdateWorkScheduleRequest,
  UpdateWorkScheduleStatusRequest,
  MonthlyWorkScheduleStats,
  MonthlySuggestionApplyRequest,
  MonthlySuggestionApplyResponse,
  MonthlySuggestionPreviewRequest,
  MonthlySuggestionPreviewResponse,
  WorkScheduleWeekResponse,
  WorkScheduleDto,
} from '../../types';
import { apiClient } from './apiClient';
import { shiftsService } from './shiftsService';

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
  skippedCount?: number;
  conflicts?: unknown[];
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
    return shiftsService.getAll({ isActive });
  },

  getWeekSchedule: (params: {
    date: string;
    userId?: string;
    shiftId?: number | string;
    storeId?: string | number;
    departmentId?: string | number;
    keyword?: string;
  }): Promise<WorkScheduleWeekResponse> => {
    return apiClient.get<WorkScheduleWeekResponse>(`/api/work-schedules/week${buildQuery(params)}`);
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

  getMonthlyStats: (params: {
    year: number;
    month: number;
    userId?: string;
  }): Promise<MonthlyWorkScheduleStats[]> => {
    return apiClient.get<MonthlyWorkScheduleStats[]>(`/api/work-schedules/monthly-stats${buildQuery(params)}`);
  },

  bulkCreateWorkSchedules: (request: BulkCreateWorkScheduleRequest): Promise<BulkCreateResponse> => {
    return apiClient.post<BulkCreateResponse>('/api/work-schedules/bulk', request);
  },

  bulkAssignWorkSchedules: (request: BulkAssignWorkScheduleRequest): Promise<BulkCreateResponse> => {
    return apiClient.post<BulkCreateResponse>('/api/work-schedules/bulk', request);
  },

  // Endpoint /batch tra ve mang WorkScheduleDto truc tiep trong `data`, khong boc trong { items }
  batchCreateWorkSchedules: (request: BulkCreateWorkScheduleRequest): Promise<WorkScheduleDto[]> => {
    return apiClient.post<WorkScheduleDto[]>('/api/work-schedules/batch', request);
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

  moveWorkSchedule: (id: number, request: {
    targetDate: string;
    targetUserId: string;
    targetShiftId: number;
  }): Promise<WorkScheduleDto> => {
    return apiClient.patch<WorkScheduleDto>(`/api/work-schedules/${id}/move`, request);
  },

  deleteWorkSchedule: async (id: number): Promise<boolean> => {
    await apiClient.delete<{ id: number }>(`/api/work-schedules/${id}`);
    return true;
  },

  sendToTelegram: (date: string): Promise<unknown> => {
    return apiClient.post<unknown>(`/api/work-schedules/send-to-telegram${buildQuery({ date })}`);
  },

  validateDate: (date: string): Promise<CalendarDayDto & { message?: string }> => {
    return apiClient.get<CalendarDayDto & { message?: string }>(`/api/work-schedules/validate-date${buildQuery({ date })}`);
  },

  validateBulk: (request: BulkCreateWorkScheduleRequest): Promise<ValidateBulkResponse> => {
    return apiClient.post<ValidateBulkResponse>('/api/work-schedules/validate-bulk', request);
  },

  copyWeek: (request: CopyWeekWorkScheduleRequest): Promise<BulkCreateResponse> => {
    return apiClient.post<BulkCreateResponse>('/api/work-schedules/copy-week', request);
  },

  previewMonthlySuggestion: (request: MonthlySuggestionPreviewRequest): Promise<MonthlySuggestionPreviewResponse> => {
    return apiClient.post<MonthlySuggestionPreviewResponse>('/api/work-schedules/monthly-suggestions/preview', request);
  },

  applyMonthlySuggestion: (request: MonthlySuggestionApplyRequest): Promise<MonthlySuggestionApplyResponse> => {
    return apiClient.post<MonthlySuggestionApplyResponse>('/api/work-schedules/monthly-suggestions/apply', request);
  },
};
