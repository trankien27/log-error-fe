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
  ScrollText,
  Search,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiAuditService } from '../../../services/api/apiAuditService';
import { ApiAuditLog, ApiAuditLogQuery, ApiAuditLogSummary } from '../apiAudit.types';
import { EmptyState, FilterBar, PageHeader, SectionCard, TableSkeletonRows } from '../../../components/ui';

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
    <section className="card-surface px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-on-surface-variant">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-on-surface">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">{hint}</p>
    </section>
  );
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max <= 0 ? 0 : Math.max(4, Math.round((count / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium text-on-surface">{label}</span>
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
      <p className="mb-1 text-xs font-medium text-on-surface-variant">{title}</p>
      <pre className="max-h-52 overflow-auto rounded-lg border border-outline-variant bg-surface p-3 text-[11px] leading-5 text-on-surface-variant">
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
      toast.error(error.message || 'Không thể tải nhật ký API. Vui lòng thử lại.');
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

  const inputClass =
    'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Nhật ký API"
        description="Xem ai đã gọi API nào, kết quả ra sao và mất bao lâu."
        icon={ScrollText}
        actions={(
          <button
            type="button"
            onClick={() => void loadAuditLogs()}
            disabled={isLoading}
            className="btn-secondary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        )}
        className="mb-0!"
      />

      <form onSubmit={applyFilters}>
        <FilterBar onReset={isLoading ? undefined : clearFilters} className="mb-0!">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              aria-label="Tìm route"
              value={routeSearch}
              onChange={event => setRouteSearch(event.target.value)}
              placeholder="Tìm route, vd /api/error-logs"
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="Từ ngày"
              title="Từ ngày"
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              className={`${inputClass} w-[9.5rem]`}
            />
            <span className="text-sm text-on-surface-variant">–</span>
            <input
              type="date"
              aria-label="Đến ngày"
              title="Đến ngày"
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              className={`${inputClass} w-[9.5rem]`}
            />
          </div>
          <select
            aria-label="Phương thức"
            value={httpMethod}
            onChange={event => setHttpMethod(event.target.value)}
            className={`${inputClass} w-32`}
          >
            <option value="">Mọi method</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            aria-label="Hành động"
            value={action}
            onChange={event => setAction(event.target.value)}
            placeholder="Hành động (Create…)"
            className={`${inputClass} w-40`}
          />
          <input
            type="number"
            min="100"
            max="599"
            aria-label="Mã trạng thái"
            value={statusCode}
            onChange={event => setStatusCode(event.target.value)}
            placeholder="Mã (200, 500…)"
            className={`${inputClass} w-32`}
          />
          <button type="submit" disabled={isLoading} className="btn-primary h-9 px-3 text-sm">
            <Filter className="h-4 w-4" />
            Lọc
          </button>
        </FilterBar>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tổng lượt gọi" value={formatNumber(summary?.totalRequests ?? 0)} hint="Theo bộ lọc hiện tại" icon={<Route className="h-5 w-5" />} />
        <StatCard title="Thành công" value={formatNumber(summary?.successRequests ?? 0)} hint="HTTP 2xx và 3xx" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard title="Lỗi phía client" value={formatNumber(summary?.clientErrorRequests ?? 0)} hint="HTTP 4xx" icon={<ShieldX className="h-5 w-5" />} />
        <StatCard title="Lỗi máy chủ" value={formatNumber(summary?.serverErrorRequests ?? 0)} hint="HTTP 5xx" icon={<ShieldX className="h-5 w-5" />} />
        <StatCard title="Thời gian TB" value={`${Math.round(summary?.averageExecutionTimeMs ?? 0)} ms`} hint={`Chậm nhất ${formatNumber(summary?.maxExecutionTimeMs ?? 0)} ms`} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard title="Hành động phổ biến" icon={Activity}>
          <div className="space-y-3">
            {summary?.actionCounts.length ? summary.actionCounts.map(item => (
              <MiniBar key={item.name} label={item.name} count={item.count} max={maxActionCount} />
            )) : <p className="text-sm text-on-surface-variant">Chưa có dữ liệu.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Route gọi nhiều nhất" icon={Route} className="xl:col-span-2">
          <div className="space-y-3">
            {summary?.topRoutes.length ? summary.topRoutes.map(item => (
              <MiniBar
                key={item.route}
                label={`${item.route} · TB ${Math.round(item.averageExecutionTimeMs)} ms`}
                count={item.count}
                max={maxRouteCount}
              />
            )) : <p className="text-sm text-on-surface-variant">Chưa có dữ liệu.</p>}
          </div>
        </SectionCard>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-2/60 text-xs text-on-surface-variant">
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Hành động</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thời gian xử lý</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <TableSkeletonRows columns={8} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState compact icon={ScrollText} title="Không có nhật ký phù hợp" description="Thử mở rộng khoảng ngày hoặc bỏ bớt bộ lọc." />
                  </td>
                </tr>
              ) : logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-surface-2/50 ${expandedId === log.id ? 'bg-surface-2/50' : ''}`}
                    onClick={() => setExpandedId(current => current === log.id ? null : log.id)}
                    aria-expanded={expandedId === log.id}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{formatDateTime(log.createdAtUtc)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-on-surface">{log.userName || 'Ẩn danh'}</div>
                      <div className="mt-0.5 truncate text-xs text-on-surface-variant">{log.email || log.roles || 'Không có token'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getMethodClass(log.httpMethod)}`}>
                        {log.httpMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[320px] truncate font-mono text-[13px] font-medium text-on-surface">{log.route}</div>
                      <div className="mt-0.5 truncate text-xs text-on-surface-variant">{log.correlationId}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{log.action || log.httpMethod}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusClass(log.statusCode)}>{log.statusCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[13px] text-on-surface">
                        <Clock3 className="h-3.5 w-3.5 text-on-surface-variant" />
                        {formatNumber(log.executionTimeMs)} ms
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{log.ipAddress || '-'}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-surface-2/60">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                          <DetailBlock title="Body" value={log.requestBody} />
                          <DetailBlock title="Query params" value={log.queryParams} />
                          <DetailBlock title="Route params" value={log.routeParams} />
                        </div>
                        {(log.errorMessage || log.userAgent) && (
                          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {log.errorMessage && (
                              <div className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-sm text-on-error-container">
                                {log.errorMessage}
                              </div>
                            )}
                            {log.userAgent && (
                              <div className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs text-on-surface-variant">
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

        <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-2/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-on-surface-variant">Hiển thị {logs.length} / {totalItems} bản ghi</span>
          <div className="flex items-center gap-2">
            <span className="min-w-[78px] text-center text-xs font-medium text-on-surface-variant">
              Trang {totalPages === 0 ? 0 : pageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex(current => Math.max(1, current - 1))}
              disabled={isLoading || pageIndex <= 1}
              aria-label="Trang trước"
              title="Trang trước"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPageIndex(current => current + 1)}
              disabled={isLoading || totalPages === 0 || pageIndex >= totalPages}
              aria-label="Trang sau"
              title="Trang sau"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
