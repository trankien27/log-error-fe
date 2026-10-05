import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, TimerReset, X } from 'lucide-react';
import { toast } from 'sonner';
import { overtimeService } from '../../../services/api/overtimeService';
import { usersService } from '../../../services/api/usersService';
import { OvertimeRequestDto, OvertimeStatus, User } from '../../../types';
import { EmptyState, PageHeader, SectionCard, TableSkeletonRows } from '../../../components/ui';

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

function formatTime(value: string) {
  return value?.slice(0, 5) || '';
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function getStatusLabel(status: OvertimeStatus) {
  if (status === 1) return 'Chờ duyệt';
  if (status === 2) return 'Đã duyệt';
  if (status === 3) return 'Từ chối';
  return 'Đã hủy';
}

function getStatusClass(status: OvertimeStatus) {
  if (status === 1) return 'badge-warning';
  if (status === 2) return 'badge-success';
  if (status === 3) return 'badge-error';
  return 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-surface-2 text-on-surface-variant';
}

export default function OvertimeApprovalTab() {
  const today = toDateInput(new Date());
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + '01');
  const [toDate, setToDate] = useState(today);
  const [status, setStatus] = useState<OvertimeStatus | ''>(1);
  const [userId, setUserId] = useState('');
  const [requests, setRequests] = useState<OvertimeRequestDto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rejecting, setRejecting] = useState<OvertimeRequestDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const summary = useMemo(() => {
    return {
      pending: requests.filter(item => item.status === 1).length,
      approvedHours: requests
        .filter(item => item.status === 2)
        .reduce((total, item) => total + item.totalHours, 0),
    };
  }, [requests]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const result = await overtimeService.getAll({
        fromDate,
        toDate,
        userId: userId || undefined,
        status,
      });
      setRequests(result);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách tăng ca. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    usersService.getUsers({ role: 2 })
      .then(setUsers)
      .catch((err: any) => toast.error(err.message || 'Không thể tải danh sách nhân viên.'));
  }, []);

  useEffect(() => {
    loadRequests();
  }, []);

  const approve = async (item: OvertimeRequestDto) => {
    try {
      await overtimeService.approve(item.id);
      toast.success('Đã duyệt tăng ca.');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Không thể duyệt tăng ca.');
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }

    try {
      await overtimeService.reject(rejecting.id, rejectReason.trim());
      toast.success('Đã từ chối tăng ca.');
      setRejecting(null);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Không thể từ chối tăng ca.');
    }
  };

  const fieldClass = 'mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface';
  const labelClass = 'block text-sm font-medium text-on-surface';

  return (
    <div className="text-left animate-fadeIn">
      <PageHeader
        title="Duyệt tăng ca"
        description="Chỉ giờ tăng ca đã duyệt mới được tính vào báo cáo tháng."
        icon={TimerReset}
      />

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card-surface p-4">
            <p className="text-xs font-medium text-on-surface-variant">Đang chờ duyệt</p>
            <p className="mt-1.5 text-2xl font-semibold text-warning tabular-nums">{summary.pending}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs font-medium text-on-surface-variant">Giờ tăng ca đã duyệt</p>
            <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">{formatNumber(summary.approvedHours)}h</p>
          </div>
        </div>

        <SectionCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <label className={labelClass}>
              Từ ngày
              <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Đến ngày
              <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Trạng thái
              <select value={status} onChange={event => setStatus(event.target.value ? Number(event.target.value) as OvertimeStatus : '')} className={fieldClass}>
                <option value="">Tất cả</option>
                <option value={1}>Chờ duyệt</option>
                <option value={2}>Đã duyệt</option>
                <option value={3}>Từ chối</option>
                <option value={4}>Đã hủy</option>
              </select>
            </label>
            <label className={labelClass}>
              Nhân viên
              <select value={userId} onChange={event => setUserId(event.target.value)} className={fieldClass}>
                <option value="">Tất cả</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={loadRequests} disabled={isLoading} className="btn-primary mt-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Lọc
            </button>
          </div>
        </SectionCard>

        <SectionCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant bg-surface-2/60">Nhân viên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant bg-surface-2/60">Ngày</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant bg-surface-2/60">Thời gian</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant bg-surface-2/60">Số giờ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant bg-surface-2/60">Lý do</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant bg-surface-2/60">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant bg-surface-2/60">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <TableSkeletonRows rows={5} columns={7} />
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState compact icon={TimerReset} title="Không có yêu cầu tăng ca nào" description="Thử đổi khoảng ngày hoặc trạng thái." />
                    </td>
                  </tr>
                ) : requests.map(item => (
                  <tr key={item.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-medium text-on-surface">{item.userFullName}</td>
                    <td className="px-4 py-3 text-on-surface">{formatDate(item.workDate)}</td>
                    <td className="px-4 py-3 font-mono text-on-surface">{formatTime(item.startTime)} - {formatTime(item.endTime)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">{formatNumber(item.totalHours)}h</td>
                    <td className="px-4 py-3 max-w-[260px] whitespace-pre-wrap text-on-surface-variant">{item.reason}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusClass(item.status)}>
                        {getStatusLabel(item.status)}
                      </span>
                      {item.rejectReason && <span className="block mt-1 text-[11px] text-error">{item.rejectReason}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => approve(item)}
                          disabled={item.status !== 1}
                          className="h-8 w-8 rounded-lg border border-success/30 text-success inline-flex items-center justify-center hover:bg-success-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Duyệt"
                          aria-label={`Duyệt tăng ca của ${item.userFullName}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejecting(item)}
                          disabled={item.status !== 1}
                          className="h-8 w-8 rounded-lg border border-error/30 text-error inline-flex items-center justify-center hover:bg-error-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Từ chối"
                          aria-label={`Từ chối tăng ca của ${item.userFullName}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {rejecting && (
        <div className="modal-overlay">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h3 className="text-lg font-semibold text-on-surface">Từ chối tăng ca</h3>
              <button
                type="button"
                onClick={() => setRejecting(null)}
                aria-label="Đóng"
                title="Đóng"
                className="h-9 w-9 rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-on-surface-variant">
                {rejecting.userFullName} · {formatDate(rejecting.workDate)} · {formatNumber(rejecting.totalHours)}h
              </p>
              <label className={labelClass}>
                Lý do từ chối
                <textarea
                  value={rejectReason}
                  onChange={event => setRejectReason(event.target.value)}
                  rows={4}
                  placeholder="Cho nhân viên biết vì sao yêu cầu bị từ chối"
                  className="mt-1 w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                />
              </label>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setRejecting(null)} className="btn-secondary">Hủy</button>
                <button type="button" onClick={reject} className="btn-danger">Từ chối</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
