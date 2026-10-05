import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  History,
  ListTodo,
  Loader2,
  PieChart,
  RefreshCw,
  ShieldAlert,
  TimerReset,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  DashboardActionItem,
  DashboardSummary,
  dashboardService,
} from '../../../services/api/dashboardService';
import { ErrorLog, OvertimeRequestDto, RecentActivity, WorkScheduleDto } from '../../../types';
import ServerMonitoringPanel from './ServerMonitoringPanel';
import { EmptyState, PageHeader, SectionCard, Skeleton } from '../../../components/ui';
import { useAuthStore } from '../../../stores/useAuthStore';

type RangePreset = 'today' | 'week' | 'month' | 'custom';

const actionMeta: Record<string, { label: string; className: string }> = {
  task: { label: 'Công việc', className: 'badge-info' },
  log: { label: 'Log lỗi', className: 'badge-error' },
  overtime: { label: 'Tăng ca', className: 'badge-warning' },
  schedule: { label: 'Lịch trực', className: 'badge-success' },
};

const errorGroupLabels: Record<string, string> = {
  Hardware: 'Phần cứng',
  Software: 'Phần mềm',
  Other: 'Khác',
};

const RANGE_OPTIONS: Array<[RangePreset, string]> = [
  ['today', 'Hôm nay'],
  ['week', 'Tuần này'],
  ['month', 'Tháng này'],
  ['custom', 'Tùy chọn'],
];

const GROUP_COLORS = ['var(--color-primary)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-error)', 'var(--color-secondary)'];

const dateInputClass =
  'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';

const listRowClass = 'block px-4 py-3 sm:px-5 transition-colors hover:bg-surface-2/60';

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRange(preset: RangePreset) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (preset === 'week') {
    const day = today.getDay() || 7;
    start.setDate(today.getDate() - day + 1);
  }

  if (preset === 'month') {
    start.setDate(1);
  }

  return {
    fromDate: toDateInput(start),
    toDate: toDateInput(end),
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Không có ngày';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return value.slice(0, 5);
}

function getScheduleUserName(schedule: WorkScheduleDto) {
  return schedule.userName || (schedule as any).userFullName || 'Chưa rõ nhân viên';
}

function getStatusLabel(status: ErrorLog['status']) {
  if (status === 1) return 'Đang xử lý';
  if (status === 2) return 'Đã chuyển Dev';
  return 'Theo dõi';
}

function getSeverityLabel(severity: ErrorLog['severity']) {
  if (severity === 3) return 'Cao';
  if (severity === 2) return 'Trung bình';
  return 'Thấp';
}

function getOtStatusLabel(status: OvertimeRequestDto['status']) {
  if (status === 1) return 'Chờ duyệt';
  if (status === 2) return 'Đã duyệt';
  if (status === 3) return 'Từ chối';
  return 'Đã hủy';
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone: 'primary' | 'error' | 'warning' | 'success';
  to: string;
}) {
  const toneClass = {
    primary: 'bg-primary-subtle text-primary',
    error: 'bg-error-container text-on-error-container',
    warning: 'bg-warning-container text-on-warning-container',
    success: 'bg-success-container text-on-success-container',
  }[tone];

  return (
    <Link
      to={to}
      className="card-surface group p-4 sm:p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <span className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-on-surface-variant opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
      <div>
        <p className="text-3xl font-semibold text-on-surface tabular-nums leading-none">{value}</p>
        <p className="mt-2 text-sm font-medium text-on-surface">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-on-surface-variant">{hint}</p>}
      </div>
    </Link>
  );
}

function DonutChart({ items }: { items: Array<{ label: string; count: number }> }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Biểu đồ nhóm lỗi">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
          {items.map((item, index) => {
            const length = total ? (item.count / total) * circumference : 0;
            const segment = (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={GROUP_COLORS[index % GROUP_COLORS.length]}
                strokeWidth="12"
                strokeDasharray={`${Math.max(length - 1.5, 0)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-on-surface tabular-nums">{total}</span>
          <span className="text-xs text-on-surface-variant">log lỗi</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }} />
            <span className="flex-1 text-on-surface-variant truncate">{item.label}</span>
            <span className="font-medium text-on-surface tabular-nums">{item.count}</span>
            <span className="w-10 text-right text-xs text-on-surface-variant tabular-nums">
              {total ? Math.round((item.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankingBars({
  items,
  color,
}: {
  items: Array<{ key: string; label: string; count: number }>;
  color: string;
}) {
  const max = Math.max(...items.map(item => item.count), 1);
  return (
    <ol className="space-y-3.5">
      {items.map((item, index) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${index < 3 ? 'bg-primary-subtle text-primary' : 'bg-surface-2 text-on-surface-variant'}`}>
                {index + 1}
              </span>
              <span className="truncate text-on-surface">{item.label}</span>
            </span>
            <span className="font-medium text-on-surface tabular-nums">{item.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max((item.count / max) * 100, 6)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActionItemRow({ item }: { item: DashboardActionItem }) {
  const meta = actionMeta[item.type] || { label: item.type, className: 'badge-info' };
  const isHigh = item.priority === 'high';
  const content = (
    <article className="group flex gap-3 px-4 py-3.5 sm:px-5 transition-colors hover:bg-surface-2/60">
      <span className={`mt-0.5 h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center ${isHigh ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
        {isHigh ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={meta.className}>{meta.label}</span>
          {isHigh && <span className="badge-error">Ưu tiên cao</span>}
        </div>
        <h3 className="mt-1.5 text-sm font-medium text-on-surface">{item.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-on-surface-variant">{item.description}</p>
      </div>
      <time className="hidden shrink-0 text-xs text-on-surface-variant sm:block">{formatDate(item.occurredAt)}</time>
    </article>
  );

  return item.targetUrl ? <Link to={item.targetUrl}>{content}</Link> : content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="card-surface p-5 space-y-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="card-surface p-5 space-y-4 xl:col-span-7">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
        </div>
        <div className="card-surface p-5 space-y-4 xl:col-span-5">
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const userName = useAuthStore(state => state.currentUser?.name);
  const initialRange = useMemo(() => getRange('month'), []);
  const [rangePreset, setRangePreset] = useState<RangePreset>('month');
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardService.getSummary({ fromDate, toDate });
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu tổng quan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSummary();
  }, [fromDate, toDate]);

  const changePreset = (preset: RangePreset) => {
    setRangePreset(preset);

    if (preset !== 'custom') {
      const nextRange = getRange(preset);
      setFromDate(nextRange.fromDate);
      setToDate(nextRange.toDate);
    }
  };

  const highPriorityCount = summary?.actionItems.filter(item => item.priority === 'high').length ?? 0;
  const firstName = userName?.trim().split(/\s+/).pop();
  const rangeLabel = `${formatDate(fromDate)} – ${formatDate(toDate)}`;

  return (
    <div className="space-y-5 text-left">
      <PageHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''} 👋`}
        description="Đây là tình hình vận hành trong khoảng thời gian bạn chọn."
        actions={
          <button type="button" onClick={() => void fetchSummary()} disabled={isLoading} className="btn-secondary">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        }
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="inline-flex w-full md:w-auto rounded-lg bg-surface-2 p-1">
            {RANGE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changePreset(value)}
                className={`flex-1 md:flex-none h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  rangePreset === value ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Từ ngày"
              value={fromDate}
              onChange={event => {
                setRangePreset('custom');
                setFromDate(event.target.value);
              }}
              className={`${dateInputClass} min-w-0 flex-1 md:w-40 md:flex-none`}
            />
            <span className="text-on-surface-variant">–</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              onChange={event => {
                setRangePreset('custom');
                setToDate(event.target.value);
              }}
              className={`${dateInputClass} min-w-0 flex-1 md:w-40 md:flex-none`}
            />
          </div>
        </div>
      </PageHeader>

      {error && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => void fetchSummary()} className="self-start sm:self-auto font-medium underline underline-offset-2 cursor-pointer">
            Thử lại
          </button>
        </div>
      )}

      {isLoading && !summary ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Việc cần xử lý"
              value={summary?.actionItems.length ?? 0}
              hint={highPriorityCount ? `${highPriorityCount} việc ưu tiên cao` : 'Không có việc khẩn'}
              icon={ShieldAlert}
              tone={highPriorityCount ? 'error' : 'primary'}
              to="/tasks"
            />
            <StatCard
              label="Log lỗi cần chú ý"
              value={summary?.attentionLogs.length ?? 0}
              hint={rangeLabel}
              icon={AlertTriangle}
              tone="warning"
              to="/error-logs"
            />
            <StatCard
              label="Công việc đến hạn"
              value={summary?.dueTasks.length ?? 0}
              hint="Hạn chót đến hôm nay"
              icon={ListTodo}
              tone="primary"
              to="/tasks"
            />
            <StatCard
              label="Tăng ca chờ duyệt"
              value={summary?.pendingOvertimeRequests.length ?? 0}
              hint={`${summary?.todaySchedules.length ?? 0} người trực hôm nay`}
              icon={TimerReset}
              tone="success"
              to="/overtime-approval"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-7">
              <SectionCard
                title="Việc cần xử lý ngay"
                description="Công việc quá hạn, log mức cao, tăng ca chờ duyệt và ca còn thiếu người."
                icon={ShieldAlert}
                bodyClassName="p-0"
              >
                <div className="divide-y divide-outline-variant/60">
                  {summary?.actionItems.length ? (
                    summary.actionItems.map((item, index) => <ActionItemRow key={`${item.type}-${index}`} item={item} />)
                  ) : (
                    <EmptyState compact icon={CheckCircle2} title="Mọi thứ đều ổn" description="Chưa có việc khẩn cần xử lý." />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Công việc đến hạn" description="Chưa hoàn tất và có hạn chót đến hôm nay." icon={ListTodo} bodyClassName="p-0">
                <div className="divide-y divide-outline-variant/60">
                  {summary?.dueTasks.length ? (
                    summary.dueTasks.map(task => (
                      <Link key={task.id} to="/tasks" className={listRowClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-on-surface-variant">{task.code}</p>
                            <h3 className="mt-0.5 line-clamp-1 text-sm font-medium text-on-surface">{task.title}</h3>
                            <p className="mt-0.5 text-xs text-on-surface-variant">{task.assigneeName || 'Chưa có người phụ trách'}</p>
                          </div>
                          <span className="badge-info shrink-0">{formatDate(task.deadline)}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState compact icon={ListTodo} title="Không có việc đến hạn" description="Hôm nay không có công việc nào tới hạn." />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Log lỗi cần chú ý" description="Lỗi chưa ổn định hoặc mức độ cao trong khoảng đã chọn." icon={AlertTriangle} bodyClassName="p-0">
                <div className="divide-y divide-outline-variant/60">
                  {summary?.attentionLogs.length ? (
                    summary.attentionLogs.map(log => (
                      <Link key={log.id} to="/error-logs" className={listRowClass}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-on-surface-variant">{log.errorCode}</span>
                              <span className="badge-error">{getSeverityLabel(log.severity)}</span>
                            </div>
                            <h3 className="mt-1 line-clamp-1 text-sm font-medium text-on-surface">{log.store}</h3>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-on-surface-variant">{log.description}</p>
                          </div>
                          <span className="badge-warning shrink-0 self-start">{getStatusLabel(log.status)}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState compact icon={CheckCircle2} title="Không có lỗi cần chú ý" description="Hệ thống đang ổn định trong khoảng đã chọn." />
                  )}
                </div>
              </SectionCard>

              <ServerMonitoringPanel />
            </div>

            <div className="space-y-5 xl:col-span-5">
              <SectionCard
                title="Lịch trực hôm nay"
                description={summary?.today ? formatDate(summary.today) : undefined}
                icon={CalendarClock}
                bodyClassName="p-0"
              >
                <div className="divide-y divide-outline-variant/60">
                  {summary?.todaySchedules.length ? (
                    summary.todaySchedules.map(schedule => {
                      const name = getScheduleUserName(schedule);
                      return (
                        <Link key={schedule.id} to="/schedule" className={listRowClass}>
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 shrink-0 rounded-full bg-primary-subtle text-primary inline-flex items-center justify-center text-sm font-semibold">
                              {name.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-1 text-sm font-medium text-on-surface">{name}</h3>
                              <p className="text-xs text-on-surface-variant">{schedule.shiftCode} · {schedule.shiftName}</p>
                            </div>
                            <span className="badge-success shrink-0 tabular-nums">
                              {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState compact icon={CalendarClock} title="Chưa có lịch trực" description="Hôm nay chưa có ai được xếp ca." />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Tăng ca chờ duyệt" icon={TimerReset} bodyClassName="p-0">
                <div className="divide-y divide-outline-variant/60">
                  {summary?.pendingOvertimeRequests.length ? (
                    summary.pendingOvertimeRequests.map(item => (
                      <Link key={item.id} to="/overtime-approval" className={listRowClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="line-clamp-1 text-sm font-medium text-on-surface">{item.userFullName}</h3>
                            <p className="mt-0.5 text-xs text-on-surface-variant">
                              {formatDate(item.workDate)} · {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            </p>
                          </div>
                          <span className="badge-warning shrink-0">
                            {item.totalHours}h · {getOtStatusLabel(item.status)}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState compact icon={TimerReset} title="Không có yêu cầu nào" description="Chưa có yêu cầu tăng ca đang chờ duyệt." />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Nhóm lỗi" description={rangeLabel} icon={PieChart}>
                {summary?.errorGroups.length ? (
                  <DonutChart items={summary.errorGroups.map(item => ({ label: errorGroupLabels[item.name] || item.name, count: item.count }))} />
                ) : (
                  <EmptyState compact icon={PieChart} title="Chưa có dữ liệu" />
                )}
              </SectionCard>

              <SectionCard title="Cửa hàng nhiều lỗi nhất" description={rangeLabel} icon={Building2}>
                {summary?.storeRanking.length ? (
                  <RankingBars
                    color="var(--color-warning)"
                    items={summary.storeRanking.map((item, index) => ({ key: `${item.store}-${index}`, label: item.store, count: item.errorCount }))}
                  />
                ) : (
                  <EmptyState compact icon={Building2} title="Chưa có dữ liệu" />
                )}
              </SectionCard>

              <SectionCard title="Log lỗi theo người phụ trách" description={rangeLabel} icon={UserRound}>
                {summary?.userErrorRanking.length ? (
                  <RankingBars
                    color="var(--color-primary)"
                    items={summary.userErrorRanking.map((item, index) => ({ key: `${item.userId || item.userName}-${index}`, label: item.userName, count: item.errorCount }))}
                  />
                ) : (
                  <EmptyState compact icon={UserRound} title="Chưa có dữ liệu" />
                )}
              </SectionCard>

              <SectionCard title="Hoạt động gần đây" icon={History} bodyClassName="p-0">
                {summary?.recentActivities.length ? (
                  <ol className="px-4 py-3 sm:px-5">
                    {summary.recentActivities.map((activity: RecentActivity, index) => (
                      <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-1">
                        {index < summary.recentActivities.length - 1 && (
                          <span className="absolute left-[5px] top-4 bottom-0 w-px bg-outline-variant" aria-hidden="true" />
                        )}
                        <span className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-primary bg-surface" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-on-surface">{activity.activityTypeLabel}</span>
                            <time className="text-xs text-on-surface-variant shrink-0">{formatDateTime(activity.occurredAt)}</time>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-on-surface-variant">{activity.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState compact icon={History} title="Chưa có hoạt động" />
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
