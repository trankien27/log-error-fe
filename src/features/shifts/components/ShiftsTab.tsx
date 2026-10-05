import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Eye, Plus, Power, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useShiftsStore } from '../../../stores/useShiftsStore';
import { CreateShiftRequest, ShiftDto } from '../../../types';
import { EmptyState, FilterBar, PageHeader, SectionCard, TableSkeletonRows } from '../../../components/ui';

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
  if (!isTimeValue(form.startTime)) return 'Giờ bắt đầu cần theo dạng 24h (HH:mm).';
  if (!isTimeValue(form.endTime)) return 'Giờ kết thúc cần theo dạng 24h (HH:mm).';
  if (form.endDayOffset !== 0 && form.endDayOffset !== 1) return 'Ngày kết thúc chỉ nhận 0 hoặc 1.';
  if (!Number.isFinite(form.paidWorkingHours) || form.paidWorkingHours <= 0 || form.paidWorkingHours > 24) {
    return 'Giờ công phải từ trên 0 đến 24.';
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

  const inputClass = 'mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-primary';
  const labelClass = 'block text-sm font-medium text-on-surface';

  return (
    <div className="text-left animate-fadeIn">
      <PageHeader
        title="Ca làm việc"
        description="Tạo ca và bật tắt các ca dùng khi xếp lịch."
        icon={Clock3}
        actions={(
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Thêm ca
          </button>
        )}
      />

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card-surface p-4">
            <p className="text-xs font-medium text-on-surface-variant">Tổng số ca</p>
            <p className="mt-1.5 text-2xl font-semibold text-on-surface tabular-nums">{totals.all}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs font-medium text-on-surface-variant">Đang hoạt động</p>
            <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">{totals.active}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs font-medium text-on-surface-variant">Ca tăng cường</p>
            <p className="mt-1.5 text-2xl font-semibold text-primary tabular-nums">{totals.extra}</p>
          </div>
        </div>

        <form onSubmit={submitSearch}>
          <FilterBar
            className="!mb-0"
            actions={(
              <button
                type="submit"
                disabled={isLoading}
                className="btn-secondary"
              >
                <Search className="w-4 h-4" />
                Tìm kiếm
              </button>
            )}
          >
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input
                type="text"
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="Tìm theo mã hoặc tên ca..."
                aria-label="Tìm ca"
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              aria-label="Lọc theo trạng thái"
              className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface"
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã tắt</option>
              <option value="all">Tất cả</option>
            </select>
          </FilterBar>
        </form>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <SectionCard bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Mã ca</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Tên ca</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Thời gian</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Giờ công</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Loại ca</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <TableSkeletonRows rows={5} columns={7} />
                  ) : shifts.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState compact icon={Clock3} title="Không có ca phù hợp" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
                      </td>
                    </tr>
                  ) : (
                    shifts.map(shift => (
                      <tr key={shift.id} className={`transition-colors hover:bg-surface-2/50 ${selectedShift?.id === shift.id ? 'bg-primary-subtle/40' : ''}`}>
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">{shift.code}</td>
                        <td className="px-4 py-3">
                          <span className="block text-sm font-medium text-on-surface">{shift.name}</span>
                          <span className="text-[11px] text-on-surface-variant">ID: {shift.id}</span>
                        </td>
                        <td className="px-4 py-3 text-on-surface">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-on-surface-variant" />
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </span>
                          {shift.endDayOffset === 1 && <span className="block mt-1 text-[11px] text-warning">Kết thúc vào hôm sau</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-on-surface tabular-nums">{(shift.paidWorkingHours || shift.workingHours || 0).toFixed(1)}h</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className={shift.isExtraShift ? 'badge-warning' : 'badge-info'}>
                              {shift.isExtraShift ? 'Tăng cường' : 'Tiêu chuẩn'}
                            </span>
                            {shift.shiftType === 2 && (
                              <span className="badge-info">Linh động</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={shift.isActive ? 'badge-success' : 'badge-error'}>
                            {shift.isActive ? 'Hoạt động' : 'Đã tắt'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => fetchShiftDetail(shift.id).catch((err: any) => toast.error(err.message || 'Không thể tải chi tiết ca.'))}
                              className="h-8 w-8 rounded-lg border border-outline-variant text-on-surface-variant inline-flex items-center justify-center hover:bg-primary-subtle hover:text-primary cursor-pointer transition-colors"
                              title="Xem chi tiết"
                              aria-label={`Xem chi tiết ca ${shift.code}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => toggleStatus(shift)}
                              className={`h-8 w-8 rounded-lg border inline-flex items-center justify-center cursor-pointer disabled:opacity-60 transition-colors ${
                                shift.isActive
                                  ? 'border-error/30 text-error hover:bg-error-container'
                                  : 'border-success/30 text-success hover:bg-success-container'
                              }`}
                              title={shift.isActive ? 'Tắt ca' : 'Bật ca'}
                              aria-label={shift.isActive ? `Tắt ca ${shift.code}` : `Bật ca ${shift.code}`}
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
          </SectionCard>

          <SectionCard className="self-start">
            {selectedShift ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">Chi tiết ca</p>
                  <h3 className="mt-1 text-lg font-semibold text-on-surface">{selectedShift.code}</h3>
                  <p className="text-sm text-on-surface-variant">{selectedShift.name}</p>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Thời gian</dt>
                    <dd className="font-medium text-on-surface">{formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Qua ngày</dt>
                    <dd className="font-medium text-on-surface">{selectedShift.endDayOffset === 1 ? 'Có' : 'Không'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Giờ công</dt>
                    <dd className="font-medium text-on-surface">{(selectedShift.paidWorkingHours || selectedShift.workingHours || 0).toFixed(1)}h</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Ca tăng cường</dt>
                    <dd className="font-medium text-on-surface">{selectedShift.isExtraShift ? 'Có' : 'Không'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Loại ca</dt>
                    <dd className="font-medium text-on-surface">{selectedShift.shiftType === 2 ? 'Linh động' : 'Ca thường'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Tạo lúc</dt>
                    <dd className="text-right font-medium text-on-surface">{formatDateTime(selectedShift.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Cập nhật</dt>
                    <dd className="text-right font-medium text-on-surface">{formatDateTime(selectedShift.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <EmptyState compact icon={Eye} title="Chưa chọn ca" description="Bấm biểu tượng con mắt để xem chi tiết một ca." />
            )}
          </SectionCard>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-elevated max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h3 className="text-lg font-semibold text-on-surface">Thêm ca làm việc</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Đóng"
                title="Đóng"
                className="h-9 w-9 rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={labelClass}>
                  Mã ca <span className="text-error">*</span>
                  <input
                    value={form.code}
                    onChange={event => setForm(current => ({ ...current, code: event.target.value }))}
                    placeholder="CA-SANG"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Tên ca <span className="text-error">*</span>
                  <input
                    value={form.name}
                    onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                    placeholder="Ca sáng"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={labelClass}>
                  Bắt đầu <span className="text-error">*</span>
                  <input
                    type="time"
                    step={60}
                    value={form.startTime}
                    onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))}
                    className={`${inputClass} font-mono`}
                  />
                </label>
                <label className={labelClass}>
                  Kết thúc <span className="text-error">*</span>
                  <input
                    type="time"
                    step={60}
                    value={form.endTime}
                    onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))}
                    className={`${inputClass} font-mono`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={labelClass}>
                  Ngày kết thúc
                  <select
                    value={form.endDayOffset}
                    onChange={event => setForm(current => ({ ...current, endDayOffset: Number(event.target.value) as 0 | 1 }))}
                    className={inputClass}
                  >
                    <option value={0}>Trong ngày</option>
                    <option value={1}>Sang hôm sau</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Giờ công <span className="text-error">*</span>
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={form.paidWorkingHours}
                    onChange={event => setForm(current => ({ ...current, paidWorkingHours: Number(event.target.value) }))}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-outline-variant px-3 py-3 text-sm font-medium text-on-surface cursor-pointer hover:bg-surface-2/50">
                <input
                  type="checkbox"
                  checked={Boolean(form.isExtraShift)}
                  onChange={event => setForm(current => ({ ...current, isExtraShift: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Ca tăng cường
              </label>

              <label className={labelClass}>
                Loại ca
                <select
                  value={form.shiftType || 1}
                  onChange={event => setForm(current => ({ ...current, shiftType: Number(event.target.value) }))}
                  className={inputClass}
                >
                  <option value={1}>Ca thường</option>
                  <option value={2}>Ca linh động</option>
                </select>
                <span className="mt-1 block text-xs font-normal text-on-surface-variant">
                  Ca linh động sẽ không xuất hiện trong danh sách ca thường.
                </span>
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
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
