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

export type DashboardUserErrorRanking = {
  userId?: string | null;
  userName: string;
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
  userErrorRanking: DashboardUserErrorRanking[];
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

function pick<T = unknown>(source: any, camelKey: string, pascalKey?: string): T | undefined {
  return source?.[camelKey] ?? source?.[pascalKey ?? `${camelKey.charAt(0).toUpperCase()}${camelKey.slice(1)}`];
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function toCamelKey(key: string) {
  return key ? `${key.charAt(0).toLowerCase()}${key.slice(1)}` : key;
}

function toCamelCaseDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCaseDeep);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, entry]) => {
    result[toCamelKey(key)] = toCamelCaseDeep(entry);
    return result;
  }, {});
}

function normalizeDashboardSummary(payload: any): DashboardSummary {
  const source = toCamelCaseDeep(payload?.data ?? payload?.Data ?? payload ?? {}) as any;

  return {
    today: pick<string>(source, 'today') ?? '',
    fromDate: pick<string>(source, 'fromDate') ?? '',
    toDate: pick<string>(source, 'toDate') ?? '',
    actionItems: asArray<DashboardActionItem>(pick(source, 'actionItems')),
    todaySchedules: asArray<WorkScheduleDto>(pick(source, 'todaySchedules')),
    dueTasks: asArray<DashboardTask>(pick(source, 'dueTasks')),
    attentionLogs: asArray<ErrorLog>(pick(source, 'attentionLogs')),
    pendingOvertimeRequests: asArray<OvertimeRequestDto>(pick(source, 'pendingOvertimeRequests')),
    recentActivities: asArray<RecentActivity>(pick(source, 'recentActivities')),
    errorGroups: asArray<DashboardGroupCount>(pick(source, 'errorGroups')),
    storeRanking: asArray<DashboardStoreRanking>(pick(source, 'storeRanking')),
    userErrorRanking: asArray<DashboardUserErrorRanking>(pick(source, 'userErrorRanking')),
  };
}

export const dashboardService = {
  getSummary: async (params: { fromDate?: string; toDate?: string } = {}): Promise<DashboardSummary> => {
    const payload = await apiClient.get<unknown>(`/api/dashboard/summary${buildQuery(params)}`);
    return normalizeDashboardSummary(payload);
  },
};
