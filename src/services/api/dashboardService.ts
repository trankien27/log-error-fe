import {
  ErrorLog,
  OvertimeRequestDto,
  RecentActivity,
  WorkScheduleDto,
} from '../../types';
import { apiClient } from './apiClient';

export type DashboardTask = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  status: number;
  assigneeId?: string | null;
  assigneeName?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
};

export type DashboardActionItem = {
  type: string;
  title: string;
  description: string;
  targetUrl?: string | null;
  priority: 'high' | 'normal' | string;
  occurredAt?: string | null;
};

export type DashboardGroupCount = {
  name: string;
  count: number;
};

export type DashboardStoreRanking = {
  store: string;
  errorCount: number;
};

export type DashboardSummary = {
  today: string;
  fromDate: string;
  toDate: string;
  actionItems: DashboardActionItem[];
  todaySchedules: WorkScheduleDto[];
  dueTasks: DashboardTask[];
  attentionLogs: ErrorLog[];
  pendingOvertimeRequests: OvertimeRequestDto[];
  recentActivities: RecentActivity[];
  errorGroups: DashboardGroupCount[];
  storeRanking: DashboardStoreRanking[];
};

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const dashboardService = {
  getSummary: (params: { fromDate?: string; toDate?: string } = {}): Promise<DashboardSummary> => {
    return apiClient.get<DashboardSummary>(`/api/dashboard/summary${buildQuery(params)}`);
  },
};
