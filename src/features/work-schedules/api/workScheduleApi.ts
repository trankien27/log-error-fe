import { apiClient } from '../../../services/api/apiClient';
import {
  AutoArrangeConfirmRequest,
  AutoArrangeOptionsResponse,
  AutoArrangePreviewRequest,
  AutoArrangePreviewResponse,
  QuickArrangeOptionsResponse,
  QuickArrangeWorkScheduleRequest,
  QuickArrangeWorkScheduleResponse,
} from '../types/workScheduleArrange.types';

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

export async function getQuickArrangeOptions(params: {
  userId: string;
  weekStartDate: string;
}): Promise<QuickArrangeOptionsResponse> {
  return apiClient.get<QuickArrangeOptionsResponse>(
    `/api/work-schedules/quick-arrange/options${buildQuery(params)}`,
  );
}

export async function quickArrangeWorkSchedule(
  request: QuickArrangeWorkScheduleRequest,
): Promise<QuickArrangeWorkScheduleResponse> {
  return apiClient.post<QuickArrangeWorkScheduleResponse>(
    '/api/work-schedules/quick-arrange',
    request,
  );
}

export async function getAutoArrangeOptions(params: {
  weekStartDate: string;
  storeId?: string | number;
  departmentId?: string | number;
}): Promise<AutoArrangeOptionsResponse> {
  return apiClient.get<AutoArrangeOptionsResponse>(
    `/api/work-schedules/auto-arrange/options${buildQuery(params)}`,
  );
}

export async function previewAutoArrangeWorkSchedule(
  request: AutoArrangePreviewRequest,
): Promise<AutoArrangePreviewResponse> {
  return apiClient.post<AutoArrangePreviewResponse>(
    '/api/work-schedules/auto-arrange/preview',
    request,
  );
}

export async function confirmAutoArrangeWorkSchedule(
  request: AutoArrangeConfirmRequest,
): Promise<AutoArrangePreviewResponse> {
  return apiClient.post<AutoArrangePreviewResponse>(
    '/api/work-schedules/auto-arrange/confirm',
    request,
  );
}
