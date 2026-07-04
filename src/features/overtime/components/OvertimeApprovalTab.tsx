import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { overtimeService } from '../../../services/api/overtimeService';
import { usersService } from '../../../services/api/usersService';
import { OvertimeRequestDto, OvertimeStatus, User } from '../../../types';

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
  if (status === 1) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 2) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 3) return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
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
      toast.error(err.message || 'Không thể tải danh sách OT.');
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
      toast.success('Đã duyệt OT.');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Không thể duyệt OT.');
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
      toast.success('Đã từ chối OT.');
      setRejecting(null);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Không thể từ chối OT.');
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Duyệt OT</h2>
          <p className="text-xs text-gray-500 mt-1">Chỉ OT đã duyệt mới được ghi nhận vào báo cáo tháng.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Đang chờ duyệt</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{summary.pending}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Giờ OT đã duyệt trong bộ lọc</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{formatNumber(summary.approvedHours)}h</p>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="block text-sm font-semibold">
            Từ ngày
            <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm" />
          </label>
          <label className="block text-sm font-semibold">
            Đến ngày
            <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm" />
          </label>
          <label className="block text-sm font-semibold">
            Trạng thái
            <select value={status} onChange={event => setStatus(event.target.value ? Number(event.target.value) as OvertimeStatus : '')} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm">
              <option value="">Tất cả</option>
              <option value={1}>Chờ duyệt</option>
              <option value={2}>Đã duyệt</option>
              <option value={3}>Từ chối</option>
              <option value={4}>Đã hủy</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Nhân viên
            <select value={userId} onChange={event => setUserId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm">
              <option value="">Tất cả</option>
              {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={loadRequests} disabled={isLoading} className="mt-auto h-10 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-container disabled:opacity-60 cursor-pointer">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lọc
          </button>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="py-4 px-5 text-left">Nhân viên</th>
                <th className="py-4 px-5 text-left">Ngày OT</th>
                <th className="py-4 px-5 text-left">Thời gian</th>
                <th className="py-4 px-5 text-right">Số giờ OT</th>
                <th className="py-4 px-5 text-left">Lý do</th>
                <th className="py-4 px-5 text-left">Trạng thái</th>
                <th className="py-4 px-5 text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center font-bold text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Đang tải OT...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center font-bold text-gray-400">Không có yêu cầu OT phù hợp.</td></tr>
              ) : requests.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-4 px-5 font-bold text-gray-950">{item.userFullName}</td>
                  <td className="py-4 px-5 font-semibold">{formatDate(item.workDate)}</td>
                  <td className="py-4 px-5 font-mono">{formatTime(item.startTime)} - {formatTime(item.endTime)}</td>
                  <td className="py-4 px-5 text-right font-black text-primary">{formatNumber(item.totalHours)}h</td>
                  <td className="py-4 px-5 max-w-[260px] whitespace-pre-wrap text-gray-600">{item.reason}</td>
                  <td className="py-4 px-5">
                    <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-bold ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                    {item.rejectReason && <span className="block mt-1 text-[11px] text-red-500">{item.rejectReason}</span>}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => approve(item)} disabled={item.status !== 1} className="h-8 w-8 rounded border border-emerald-200 text-emerald-600 inline-flex items-center justify-center hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" title="Duyệt OT">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setRejecting(item)} disabled={item.status !== 1} className="h-8 w-8 rounded border border-red-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" title="Từ chối OT">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-outline-variant bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h3 className="text-lg font-bold text-gray-950">Từ chối OT</h3>
              <button type="button" onClick={() => setRejecting(null)} className="h-8 w-8 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                {rejecting.userFullName} - {formatDate(rejecting.workDate)} - {formatNumber(rejecting.totalHours)}h
              </p>
              <label className="block text-sm font-semibold">
                Lý do từ chối
                <textarea value={rejectReason} onChange={event => setRejectReason(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-lg border border-outline-variant px-3 py-2 text-sm" />
              </label>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setRejecting(null)} className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer">Hủy</button>
                <button type="button" onClick={reject} className="h-10 px-5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 cursor-pointer">Từ chối</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
