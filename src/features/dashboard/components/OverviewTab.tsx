import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  ListTodo,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';
import {
  DashboardActionItem,
  DashboardSummary,
  dashboardService,
} from '../../../services/api/dashboardService';
import { ErrorLog, OvertimeRequestDto, RecentActivity, WorkScheduleDto } from '../../../types';

type RangePreset = 'today' | 'week' | 'month' | 'custom';

const actionMeta: Record<string, { label: string; className: string }> = {
  task: { label: 'Task', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  log: { label: 'Log lỗi', className: 'bg-red-50 text-red-700 border-red-100' },
  overtime: { label: 'OT', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  schedule: { label: 'Lịch trực', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const errorGroupLabels: Record<string, string> = {
  Hardware: 'Phần cứng',
  Software: 'Phần mềm',
  Other: 'Khác',
};

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
  if (status === 2) return 'Gửi Dev';
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

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-outline-variant bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-gray-950">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center px-4 py-8 text-center text-xs font-semibold text-gray-400">
      {text}
    </div>
  );
}

function ActionItemRow({ item }: { item: DashboardActionItem }) {
  const meta = actionMeta[item.type] || { label: item.type, className: 'bg-slate-50 text-slate-600 border-slate-100' };
  const content = (
    <article className="group flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
      <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg border ${item.priority === 'high' ? 'border-red-100 bg-red-50 text-red-600' : 'border-blue-100 bg-blue-50 text-blue-600'} flex items-center justify-center`}>
        {item.priority === 'high' ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
          {item.priority === 'high' && <span className="rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Ưu tiên cao</span>}
        </div>
        <h3 className="mt-1.5 text-sm font-bold text-gray-950">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{item.description}</p>
      </div>
      <time className="hidden shrink-0 text-[11px] font-semibold text-gray-400 sm:block">{formatDate(item.occurredAt)}</time>
    </article>
  );

  return item.targetUrl ? <Link to={item.targetUrl}>{content}</Link> : content;
}

export default function OverviewTab() {
  const initialRange = useMemo(() => getRange('month'), []);
  const [rangePreset, setRangePreset] = useState<RangePreset>('month');
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxGroupCount = Math.max(...(summary?.errorGroups.map(item => item.count) || [0]), 1);
  const maxStoreCount = Math.max(...(summary?.storeRanking.map(item => item.errorCount) || [0]), 1);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardService.getSummary({ fromDate, toDate });
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dashboard.');
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

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <div className="rounded-lg border border-outline-variant bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-950">Tổng quan vận hành</h1>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Gom các việc cần xử lý, lịch trực, OT, task và log lỗi vào một màn hình.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex rounded-lg border border-outline-variant bg-slate-50 p-1">
              {[
                ['today', 'Hôm nay'],
                ['week', 'Tuần này'],
                ['month', 'Tháng này'],
                ['custom', 'Tùy chọn'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changePreset(value as RangePreset)}
                  className={`h-9 rounded-md px-3 text-xs font-bold transition-colors cursor-pointer ${
                    rangePreset === value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-gray-600">
              Từ ngày
              <input
                type="date"
                value={fromDate}
                onChange={event => {
                  setRangePreset('custom');
                  setFromDate(event.target.value);
                }}
                className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-xs font-semibold focus:outline-primary lg:w-40"
              />
            </label>

            <label className="block text-xs font-bold text-gray-600">
              Đến ngày
              <input
                type="date"
                value={toDate}
                onChange={event => {
                  setRangePreset('custom');
                  setToDate(event.target.value);
                }}
                className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-xs font-semibold focus:outline-primary lg:w-40"
              />
            </label>

            <button
              type="button"
              onClick={() => void fetchSummary()}
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-container disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {isLoading && !summary ? (
        <div className="flex h-[420px] items-center justify-center rounded-lg border border-outline-variant bg-white text-sm font-bold text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải dashboard...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-7">
            <Panel
              title="Việc cần xử lý ngay"
              subtitle="Ưu tiên task quá hạn, log mức cao, OT chờ duyệt và thiếu lịch trực."
              action={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            >
              <div className="divide-y divide-slate-100">
                {summary?.actionItems.length ? (
                  summary.actionItems.map((item, index) => <ActionItemRow key={`${item.type}-${index}`} item={item} />)
                ) : (
                  <EmptyState text="Chưa có việc khẩn cần xử lý." />
                )}
              </div>
            </Panel>

            <Panel title="Task đến hạn" subtitle="Task chưa hoàn tất có deadline đến hôm nay." action={<ListTodo className="h-5 w-5 text-blue-600" />}>
              <div className="divide-y divide-slate-100">
                {summary?.dueTasks.length ? (
                  summary.dueTasks.map(task => (
                    <Link key={task.id} to="/tasks" className="block px-4 py-3 transition-colors hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] font-bold text-gray-400">{task.code}</p>
                          <h3 className="mt-1 line-clamp-1 text-sm font-bold text-gray-950">{task.title}</h3>
                          <p className="mt-1 text-xs text-gray-500">{task.assigneeName || 'Chưa có người phụ trách'}</p>
                        </div>
                        <span className="shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                          {formatDate(task.deadline)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState text="Không có task đến hạn trong hôm nay." />
                )}
              </div>
            </Panel>

            <Panel title="Log lỗi cần chú ý" subtitle="Log chưa ổn định hoặc có mức độ cao trong khoảng lọc." action={<ShieldAlert className="h-5 w-5 text-red-600" />}>
              <div className="divide-y divide-slate-100">
                {summary?.attentionLogs.length ? (
                  summary.attentionLogs.map(log => (
                    <Link key={log.id} to="/error-logs" className="block px-4 py-3 transition-colors hover:bg-slate-50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-400">{log.errorCode}</span>
                            <span className="rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                              {getSeverityLabel(log.severity)}
                            </span>
                          </div>
                          <h3 className="mt-1 line-clamp-1 text-sm font-bold text-gray-950">{log.store}</h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{log.description}</p>
                        </div>
                        <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                          {getStatusLabel(log.status)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState text="Không có log lỗi cần chú ý trong khoảng lọc." />
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-5 xl:col-span-5">
            <Panel title="Lịch trực hôm nay" subtitle={summary?.today ? formatDate(summary.today) : undefined} action={<CalendarClock className="h-5 w-5 text-emerald-600" />}>
              <div className="divide-y divide-slate-100">
                {summary?.todaySchedules.length ? (
                  summary.todaySchedules.map(schedule => (
                    <Link key={schedule.id} to="/schedule" className="block px-4 py-3 transition-colors hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-sm font-bold text-gray-950">{getScheduleUserName(schedule)}</h3>
                          <p className="mt-1 text-xs font-semibold text-gray-500">{schedule.shiftCode} - {schedule.shiftName}</p>
                        </div>
                        <span className="shrink-0 rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState text="Hôm nay chưa có lịch trực." />
                )}
              </div>
            </Panel>

            <Panel title="OT chờ duyệt" subtitle="Các yêu cầu OT đang ở trạng thái chờ." action={<TimerReset className="h-5 w-5 text-amber-600" />}>
              <div className="divide-y divide-slate-100">
                {summary?.pendingOvertimeRequests.length ? (
                  summary.pendingOvertimeRequests.map(item => (
                    <Link key={item.id} to="/overtime-approval" className="block px-4 py-3 transition-colors hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-sm font-bold text-gray-950">{item.userFullName}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(item.workDate)} · {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                          {item.totalHours}h · {getOtStatusLabel(item.status)}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState text="Không có OT đang chờ duyệt." />
                )}
              </div>
            </Panel>

            <Panel title="Nhóm lỗi nhiều nhất" subtitle={`Từ ${formatDate(fromDate)} đến ${formatDate(toDate)}`} action={<Search className="h-5 w-5 text-slate-500" />}>
              <div className="space-y-3 p-4">
                {summary?.errorGroups.length ? (
                  summary.errorGroups.map(item => (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-gray-700">{errorGroupLabels[item.name] || item.name}</span>
                        <span className="font-black text-gray-950">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.count / maxGroupCount) * 100, 8)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Chưa có dữ liệu nhóm lỗi." />
                )}
              </div>
            </Panel>

            <Panel title="Ranking cửa hàng lỗi nhiều" subtitle="Sắp xếp theo khoảng thời gian đang lọc." action={<Clock3 className="h-5 w-5 text-slate-500" />}>
              <div className="space-y-3 p-4">
                {summary?.storeRanking.length ? (
                  summary.storeRanking.map((item, index) => (
                    <div key={`${item.store}-${index}`}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate font-bold text-gray-700">
                          #{index + 1} {item.store}
                        </span>
                        <span className="font-black text-gray-950">{item.errorCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max((item.errorCount / maxStoreCount) * 100, 8)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Chưa có dữ liệu ranking cửa hàng." />
                )}
              </div>
            </Panel>

            <Panel title="Hoạt động gần đây" subtitle="Các thay đổi mới nhất trong hệ thống." action={<History className="h-5 w-5 text-slate-500" />}>
              <div className="divide-y divide-slate-100">
                {summary?.recentActivities.length ? (
                  summary.recentActivities.map((activity: RecentActivity) => (
                    <article key={activity.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {activity.activityTypeLabel}
                        </span>
                        <time className="text-[10px] font-semibold text-gray-400">{formatDateTime(activity.occurredAt)}</time>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-gray-700">{activity.description}</p>
                    </article>
                  ))
                ) : (
                  <EmptyState text="Chưa có hoạt động gần đây." />
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
