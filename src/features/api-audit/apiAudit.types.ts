export interface ApiAuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  email?: string | null;
  roles?: string | null;
  httpMethod: string;
  route: string;
  action?: string | null;
  queryParams?: string | null;
  routeParams?: string | null;
  requestBody?: string | null;
  statusCode: number;
  executionTimeMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  errorMessage?: string | null;
  createdAtUtc: string;
}

export interface ApiAuditLogQuery {
  fromDate?: string;
  toDate?: string;
  action?: string;
  routeSearch?: string;
  httpMethod?: string;
  statusCode?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface ApiAuditLogCount {
  name: string;
  count: number;
}

export interface ApiAuditLogRouteCount {
  route: string;
  count: number;
  averageExecutionTimeMs: number;
}

export interface ApiAuditLogSummary {
  totalRequests: number;
  successRequests: number;
  clientErrorRequests: number;
  serverErrorRequests: number;
  averageExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  actionCounts: ApiAuditLogCount[];
  methodCounts: ApiAuditLogCount[];
  statusCounts: ApiAuditLogCount[];
  topRoutes: ApiAuditLogRouteCount[];
}
