import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Gauge,
  Loader2,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiAuditService } from '../../../services/api/apiAuditService';
import { ApiAuditLog, ApiAuditLogQuery, ApiAuditLogSummary } from '../apiAudit.types';

const PAGE_SIZE = 20;

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return {
    fromDate: toDateInput(start),
    toDate: toDateInput(today),
  };
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('vi-VN') : '0';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

function getStatusClass(statusCode: number) {
  if (statusCode >= 500) return 'badge-error';
  if (statusCode >= 400) return 'badge-warning';
  if (statusCode >= 300) return 'badge-info';
  return 'badge-success';
}

function getMethodClass(method: string) {
  if (method === 'GET') return 'bg-surface-2 text-primary border border-outline-variant';
  if (method === 'POST') return 'bg-success-container text-on-success-container';
  if (method === 'DELETE') return 'bg-error-container text-on-error-container';
  if (method === 'PUT' || method === 'PATCH') return 'bg-warning-container text-on-warning-container';
  return 'bg-secondary-container text-on-secondary-container';
}

function prettyJson(value?: string | null) {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-on-surface-variant">{title}</p>
          <p className="mt-1 text-2xl font-black text-on-surface">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium text-on-surface-variant">{hint}</p>
    </section>
  );
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max <= 0 ? 0 : Math.max(4, Math.round((count / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="truncate font-bold text-on-surface">{label}</span>
        <span className="shrink-0 font-mono text-on-surface-variant">{formatNumber(count)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function DetailBlock({ title, value }: { title: string; value?: string | null }) {
  const text = prettyJson(value);
  if (!text) return null;

  return (
    <div>
      <p className="mb-1 text-[11px] font-black text-on-surface-variant">{title}</p>
      <pre className="max-h-52 overflow-auto rounded-lg border border-outline-variant bg-surface-2 p-3 text-[11px] leading-5 text-on-surface-variant">
        {text}
      </pre>
    </div>
  );
}

export default function ApiAuditLogsTab() {
  const initialRange = useMemo(() => getInitialRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [action, setAction] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [httpMethod, setHttpMethod] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [filters, setFilters] = useState<ApiAuditLogQuery>({
    fromDate: initialRange.fromDate,
    toDate: initialRange.toDate,
  });
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [summary, setSummary] = useState<ApiAuditLogSummary | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = statusCode ? Number(statusCode) : undefined;
      const query = {
        ...filters,
        statusCode: Number.isInteger(status) ? status : undefined,
        pageIndex,
        pageSize: PAGE_SIZE,
      };

      const [logResult, summaryResult] = await Promise.all([
        apiAuditService.getLogs(query),
        apiAuditService.getSummary({ ...query, pageIndex: undefined, pageSize: undefined }),
      ]);

      setLogs(logResult.items);
      setTotalItems(logResult.totalItems);
      setTotalPages(logResult.totalPages);
      setSummary(summaryResult);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải audit log API.');
      setLogs([]);
      setSummary(null);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageIndex, statusCode]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedStatusCode = statusCode ? Number(statusCode) : undefined;
    setPageIndex(1);
    setExpandedId(null);
    setFilters({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      action: action.trim() || undefined,
      routeSearch: routeSearch.trim() || undefined,
      httpMethod: httpMethod || undefined,
      statusCode: Number.isInteger(parsedStatusCode) ? parsedStatusCode : undefined,
    });
  };

  const clearFilters = () => {
    const range = getInitialRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setAction('');
    setRouteSearch('');
    setHttpMethod('');
    setStatusCode('');
    setPageIndex(1);
    setExpandedId(null);
    setFilters({ fromDate: range.fromDate, toDate: range.toDate });
  };

  const maxActionCount = Math.max(...(summary?.actionCounts.map(item => item.count) || [0]), 1);
  const maxRouteCount = Math.max(...(summary?.topRoutes.map(item => item.count) || [0]), 1);

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <section className="rounded-lg border border-outline-variant bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-on-surface">Audit API</h2>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              Kiểm tra user, route, action, body, tham số và thời gian xử lý của các API đã gọi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditLogs()}
            disabled={isLoading}
            className="btn-primary h-10 px-4"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        </div>

        <form onSubmit={applyFilters} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
          <label className="text-[11px] font-bold text-on-surface-variant">
            Từ ngày
            <input
              type="date"
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold focus:outline-primary"
            />
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant">
            Đến ngày
            <input
              type="date"
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold focus:outline-primary"
            />
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant">
            Method
            <select
              value={httpMethod}
              onChange={event => setHttpMethod(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold focus:outline-primary"
            >
              <option value="">Tất cả</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant">
            Action
            <input
              type="text"
              value={action}
              onChange={event => setAction(event.target.value)}
              placeholder="Create, Update..."
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold focus:outline-primary"
            />
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant">
            Status
            <input
              type="number"
              min="100"
              max="599"
              value={statusCode}
              onChange={event => setStatusCode(event.target.value)}
              placeholder="200, 500..."
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold focus:outline-primary"
            />
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant xl:col-span-2">
            Tìm route
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="search"
                value={routeSearch}
                onChange={event => setRouteSearch(event.target.value)}
                placeholder="/api/error-logs"
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-xs font-semibold focus:outline-primary"
              />
            </div>
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-7">
            <button type="submit" disabled={isLoading} className="btn-primary h-10 px-4 text-xs">
              <Filter className="h-4 w-4" />
              Lọc dữ liệu
            </button>
            <button type="button" onClick={clearFilters} disabled={isLoading} className="btn-secondary h-10 px-4 text-xs">
              Xóa lọc
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tổng lượt gọi" value={formatNumber(summary?.totalRequests ?? 0)} hint="Theo bộ lọc hiện tại" icon={<Route className="h-5 w-5" />} />
        <StatCard title="Thành công" value={formatNumber(summary?.successRequests ?? 0)} hint="HTTP 2xx và 3xx" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard title="Lỗi client" value={formatNumber(summary?.clientErrorRequests ?? 0)} hint="HTTP 4xx" icon={<ShieldX className="h-5 w-5" />} />
        <StatCard title="Lỗi server" value={formatNumber(summary?.serverErrorRequests ?? 0)} hint="HTTP 5xx" icon={<ShieldX className="h-5 w-5" />} />
        <StatCard title="Thời gian TB" value={`${Math.round(summary?.averageExecutionTimeMs ?? 0)} ms`} hint={`Chậm nhất ${formatNumber(summary?.maxExecutionTimeMs ?? 0)} ms`} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-outline-variant bg-surface p-4">
          <h3 className="text-sm font-black text-on-surface">Action nhiều nhất</h3>
          <div className="mt-4 space-y-3">
            {summary?.actionCounts.length ? summary.actionCounts.map(item => (
              <MiniBar key={item.name} label={item.name} count={item.count} max={maxActionCount} />
            )) : <p className="text-xs text-on-surface-variant">Chưa có dữ liệu.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface p-4 xl:col-span-2">
          <h3 className="text-sm font-black text-on-surface">Route được gọi nhiều nhất</h3>
          <div className="mt-4 space-y-3">
            {summary?.topRoutes.length ? summary.topRoutes.map(item => (
              <MiniBar
                key={item.route}
                label={`${item.route} · TB ${Math.round(item.averageExecutionTimeMs)} ms`}
                count={item.count}
                max={maxRouteCount}
              />
            )) : <p className="text-xs text-on-surface-variant">Chưa có dữ liệu.</p>}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-2 text-[11px] font-bold uppercase text-on-surface-variant">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Thời gian xử lý</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Đang tải audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">Không có log phù hợp.</td>
                </tr>
              ) : logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-surface-2"
                    onClick={() => setExpandedId(current => current === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{formatDateTime(log.createdAtUtc)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-on-surface">{log.userName || 'Ẩn danh'}</div>
                      <div className="mt-0.5 truncate text-[11px] text-on-surface-variant">{log.email || log.roles || 'Không có token'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-[10px] font-black ${getMethodClass(log.httpMethod)}`}>
                        {log.httpMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[320px] truncate font-mono font-bold text-on-surface">{log.route}</div>
                      <div className="mt-0.5 truncate text-[10px] text-on-surface-variant">{log.correlationId}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface-variant">{log.action || log.httpMethod}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusClass(log.statusCode)}>{log.statusCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-on-surface">
                        <Clock3 className="h-3.5 w-3.5 text-on-surface-variant" />
                        {formatNumber(log.executionTimeMs)} ms
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{log.ipAddress || '-'}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-surface-2">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                          <DetailBlock title="Body" value={log.requestBody} />
                          <DetailBlock title="Query params" value={log.queryParams} />
                          <DetailBlock title="Route params" value={log.routeParams} />
                        </div>
                        {(log.errorMessage || log.userAgent) && (
                          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {log.errorMessage && (
                              <div className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
                                {log.errorMessage}
                              </div>
                            )}
                            {log.userAgent && (
                              <div className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
                                {log.userAgent}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-on-surface-variant">Hiển thị {logs.length} / {totalItems} audit log</span>
          <div className="flex items-center gap-2">
            <span className="min-w-[78px] text-center text-[11px] font-medium text-on-surface-variant">
              Trang {totalPages === 0 ? 0 : pageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex(current => Math.max(1, current - 1))}
              disabled={isLoading || pageIndex <= 1}
              aria-label="Trang audit trước"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPageIndex(current => current + 1)}
              disabled={isLoading || totalPages === 0 || pageIndex >= totalPages}
              aria-label="Trang audit sau"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
