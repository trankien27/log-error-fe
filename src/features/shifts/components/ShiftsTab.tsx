import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Eye, Loader2, Plus, Power, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useShiftsStore } from '../../../stores/useShiftsStore';
import { CreateShiftRequest, ShiftDto } from '../../../types';

const emptyForm: CreateShiftRequest = {
  code: '',
  name: '',
  startTime: '08:00',
  endTime: '12:00',
  endDayOffset: 0,
  paidWorkingHours: 4,
  isExtraShift: false,
  shiftType: 1,
};

function formatTime(value: string) {
  return value?.slice(0, 5) || '';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN');
}

function isTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function validateForm(form: CreateShiftRequest) {
  if (!form.code.trim()) return 'Vui lòng nhập mã ca.';
  if (!form.name.trim()) return 'Vui lòng nhập tên ca.';
  if (!isTimeValue(form.startTime)) return 'Giờ bắt đầu phải có định dạng 24h HH:mm.';
  if (!isTimeValue(form.endTime)) return 'Giờ kết thúc phải có định dạng 24h HH:mm.';
  if (form.endDayOffset !== 0 && form.endDayOffset !== 1) return 'Ngày kết thúc chỉ nhận 0 hoặc 1.';
  if (!Number.isFinite(form.paidWorkingHours) || form.paidWorkingHours <= 0 || form.paidWorkingHours > 24) {
    return 'Giờ công phải lớn hơn 0 và nhỏ hơn hoặc bằng 24.';
  }
  return null;
}

export default function ShiftsTab() {
  const {
    shifts,
    selectedShift,
    isLoading,
    isSaving,
    keyword,
    statusFilter,
    isCreateModalOpen,
    setKeyword,
    setStatusFilter,
    setIsCreateModalOpen,
    fetchShifts,
    fetchShiftDetail,
    createShift,
    updateShiftStatus,
  } = useShiftsStore();

  const [form, setForm] = useState<CreateShiftRequest>(emptyForm);

  useEffect(() => {
    fetchShifts().catch((err: any) => {
      toast.error(err.message || 'Không thể tải danh sách ca.');
    });
  }, [fetchShifts, statusFilter]);

  const totals = useMemo(() => {
    return shifts.reduce(
      (acc, shift) => {
        acc.all += 1;
        if (shift.isActive) acc.active += 1;
        if (shift.isExtraShift) acc.extra += 1;
        return acc;
      },
      { all: 0, active: 0, extra: 0 },
    );
  }, [shifts]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchShifts().catch((err: any) => {
      toast.error(err.message || 'Không thể tìm ca.');
    });
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setIsCreateModalOpen(true);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      await createShift({
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        startTime: toApiTime(form.startTime),
        endTime: toApiTime(form.endTime),
        isExtraShift: Boolean(form.isExtraShift),
        shiftType: form.shiftType || 1,
      });
      toast.success('Đã tạo ca làm việc.');
      setIsCreateModalOpen(false);
      await fetchShifts();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo ca.');
    }
  };

  const toggleStatus = async (shift: ShiftDto) => {
    try {
      await updateShiftStatus(shift.id, !shift.isActive);
      toast.success(shift.isActive ? 'Đã tắt ca.' : 'Đã bật ca.');
      if (statusFilter !== 'all') {
        await fetchShifts();
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật trạng thái ca.');
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Quản trị ca làm việc</h2>
          <p className="text-xs text-on-surface-variant mt-1">Tạo ca, tra cứu theo mã hoặc tên, và bật tắt ca dùng trong lịch làm việc.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Thêm ca
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-4">
          <p className="text-xs font-semibold text-on-surface-variant">Tổng ca theo bộ lọc</p>
          <p className="mt-2 text-2xl font-black text-on-surface tabular-nums">{totals.all}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold text-on-surface-variant">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-black text-success tabular-nums">{totals.active}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold text-on-surface-variant">Ca tăng cường</p>
          <p className="mt-2 text-2xl font-black text-primary tabular-nums">{totals.extra}</p>
        </div>
      </div>

      <div className="card-surface p-4">
        <form onSubmit={submitSearch} className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm theo mã hoặc tên ca..."
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm focus:outline-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm font-semibold"
          >
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tắt</option>
            <option value="all">Tất cả</option>
          </select>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-secondary h-10 px-5"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                  <th className="py-4 px-5">Mã ca</th>
                  <th className="py-4 px-5">Tên ca</th>
                  <th className="py-4 px-5">Thời gian</th>
                  <th className="py-4 px-5">Giờ công</th>
                  <th className="py-4 px-5">Loại ca</th>
                  <th className="py-4 px-5">Trạng thái</th>
                  <th className="py-4 px-5 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-bold text-on-surface-variant">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Đang tải danh sách ca...
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-bold text-on-surface-variant">
                      Không có ca phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-4 px-5 font-mono text-sm font-black text-primary">{shift.code}</td>
                      <td className="py-4 px-5">
                        <span className="block text-sm font-bold text-on-surface">{shift.name}</span>
                        <span className="text-[11px] text-on-surface-variant">ID: {shift.id}</span>
                      </td>
                      <td className="py-4 px-5 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="w-4 h-4 text-on-surface-variant" />
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </span>
                        {shift.endDayOffset === 1 && <span className="block mt-1 text-[11px] text-warning">Kết thúc ngày hôm sau</span>}
                      </td>
                      <td className="py-4 px-5 font-bold tabular-nums">{(shift.paidWorkingHours || shift.workingHours || 0).toFixed(1)}h</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          <span className={shift.isExtraShift ? 'badge-warning' : 'badge-info'}>
                            {shift.isExtraShift ? 'Tăng cường' : 'Tiêu chuẩn'}
                          </span>
                          {shift.shiftType === 2 && (
                            <span className="badge-info">Linh động</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={shift.isActive ? 'badge-success' : 'badge-error'}>
                          {shift.isActive ? 'Hoạt động' : 'Đã tắt'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => fetchShiftDetail(shift.id).catch((err: any) => toast.error(err.message || 'Không thể tải chi tiết ca.'))}
                            className="h-8 w-8 rounded border border-outline-variant inline-flex items-center justify-center hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => toggleStatus(shift)}
                            className={`h-8 w-8 rounded border inline-flex items-center justify-center cursor-pointer disabled:opacity-60 transition-colors ${
                              shift.isActive
                                ? 'border-error/30 text-error hover:bg-error-container'
                                : 'border-success/30 text-success hover:bg-success-container'
                            }`}
                            title={shift.isActive ? 'Tắt ca' : 'Bật ca'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card-surface p-5">
          {selectedShift ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Chi tiết ca</p>
                <h3 className="mt-1 text-lg font-black text-on-surface">{selectedShift.code}</h3>
                <p className="text-sm font-semibold text-on-surface-variant">{selectedShift.name}</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Thời gian</dt>
                  <dd className="font-bold">{formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Qua ngày</dt>
                  <dd className="font-bold">{selectedShift.endDayOffset === 1 ? 'Có' : 'Không'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Giờ công</dt>
                  <dd className="font-bold">{(selectedShift.paidWorkingHours || selectedShift.workingHours || 0).toFixed(1)}h</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Ca tăng cường</dt>
                  <dd className="font-bold">{selectedShift.isExtraShift ? 'Có' : 'Không'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Loại ca</dt>
                  <dd className="font-bold">{selectedShift.shiftType === 2 ? 'Linh động' : 'Ca thường'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Tạo lúc</dt>
                  <dd className="text-right font-bold">{formatDateTime(selectedShift.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Cập nhật</dt>
                  <dd className="text-right font-bold">{formatDateTime(selectedShift.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="empty-state min-h-[280px] border-none bg-transparent">
              <Clock3 className="w-9 h-9 text-on-surface-variant/50 mb-3" />
              <p className="text-sm font-semibold text-on-surface-variant">Chọn một ca để xem chi tiết.</p>
            </div>
          )}
        </aside>
      </div>

      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-elevated max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h3 className="text-lg font-bold text-on-surface">Thêm ca làm việc</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Mã ca *
                  <input
                    value={form.code}
                    onChange={event => setForm(current => ({ ...current, code: event.target.value }))}
                    placeholder="CA-SANG"
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Tên ca *
                  <input
                    value={form.name}
                    onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                    placeholder="Ca sáng"
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Bắt đầu *
                  <input
                    type="time"
                    step={60}
                    value={form.startTime}
                    onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-mono focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Kết thúc *
                  <input
                    type="time"
                    step={60}
                    value={form.endTime}
                    onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-mono focus:outline-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Ngày kết thúc
                  <select
                    value={form.endDayOffset}
                    onChange={event => setForm(current => ({ ...current, endDayOffset: Number(event.target.value) as 0 | 1 }))}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                  >
                    <option value={0}>Trong ngày</option>
                    <option value={1}>Sang ngày hôm sau</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  Giờ công *
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={form.paidWorkingHours}
                    onChange={event => setForm(current => ({ ...current, paidWorkingHours: Number(event.target.value) }))}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-outline-variant px-3 py-3 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(form.isExtraShift)}
                  onChange={event => setForm(current => ({ ...current, isExtraShift: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Ca tăng cường
              </label>

              <label className="block text-sm font-semibold">
                Loại ca
                <select
                  value={form.shiftType || 1}
                  onChange={event => setForm(current => ({ ...current, shiftType: Number(event.target.value) }))}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                >
                  <option value={1}>Ca thường</option>
                  <option value={2}>Ca linh động</option>
                </select>
                <span className="mt-1 block text-xs font-medium text-on-surface-variant">
                  Ca linh động không hiển thị trong API danh sách ca thường.
                </span>
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary h-10 px-4"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary h-10 px-5"
                >
                  {isSaving ? 'Đang lưu...' : 'Tạo ca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
