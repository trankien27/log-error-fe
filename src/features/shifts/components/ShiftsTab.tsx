import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Eye, Loader2, Plus, Power, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useShiftsStore } from '../../../stores/useShiftsStore';
import { CreateShiftRequest, ShiftDto } from '../../../types';

const emptyForm: CreateShiftRequest = {
  code: '',
  name: '',
  startTime: '08:00:00',
  endTime: '12:00:00',
  endDayOffset: 0,
  paidWorkingHours: 4,
  isExtraShift: false,
};

function formatTime(value: string) {
  return value?.slice(0, 5) || '';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN');
}

function isTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);
}

function validateForm(form: CreateShiftRequest) {
  if (!form.code.trim()) return 'Vui lòng nhập mã ca.';
  if (!form.name.trim()) return 'Vui lòng nhập tên ca.';
  if (!isTimeValue(form.startTime)) return 'Giờ bắt đầu phải có định dạng HH:mm:ss.';
  if (!isTimeValue(form.endTime)) return 'Giờ kết thúc phải có định dạng HH:mm:ss.';
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
        isExtraShift: Boolean(form.isExtraShift),
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
          <h2 className="text-xl font-bold text-gray-900 font-sans">Quản trị ca làm việc</h2>
          <p className="text-xs text-gray-500 mt-1">Tạo ca, tra cứu theo mã hoặc tên, và bật tắt ca dùng trong lịch làm việc.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 rounded-lg bg-primary text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Thêm ca
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Tổng ca theo bộ lọc</p>
          <p className="mt-2 text-2xl font-black text-gray-950">{totals.all}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{totals.active}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Ca tăng cường</p>
          <p className="mt-2 text-2xl font-black text-primary">{totals.extra}</p>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-white p-4 shadow-sm">
        <form onSubmit={submitSearch} className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm theo mã hoặc tên ca..."
              className="h-10 w-full rounded-lg border border-outline-variant bg-[#f8fafc] pl-9 pr-3 text-sm focus:outline-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold"
          >
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tắt</option>
            <option value="all">Tất cả</option>
          </select>
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 px-5 rounded-lg border border-outline-variant bg-white text-sm font-bold hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="py-4 px-5">Mã ca</th>
                  <th className="py-4 px-5">Tên ca</th>
                  <th className="py-4 px-5">Thời gian</th>
                  <th className="py-4 px-5">Giờ công</th>
                  <th className="py-4 px-5">Loại ca</th>
                  <th className="py-4 px-5">Trạng thái</th>
                  <th className="py-4 px-5 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-bold text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Đang tải danh sách ca...
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-bold text-gray-400">
                      Không có ca phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-[#fafcff] transition-colors">
                      <td className="py-4 px-5 font-mono text-sm font-black text-primary">{shift.code}</td>
                      <td className="py-4 px-5">
                        <span className="block text-sm font-bold text-gray-950">{shift.name}</span>
                        <span className="text-[11px] text-gray-400">ID: {shift.id}</span>
                      </td>
                      <td className="py-4 px-5 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="w-4 h-4 text-gray-400" />
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </span>
                        {shift.endDayOffset === 1 && <span className="block mt-1 text-[11px] text-amber-600">Kết thúc ngày hôm sau</span>}
                      </td>
                      <td className="py-4 px-5 font-bold">{(shift.paidWorkingHours || shift.workingHours || 0).toFixed(1)}h</td>
                      <td className="py-4 px-5">
                        <span className={`rounded px-2 py-1 text-[11px] font-bold ${shift.isExtraShift ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {shift.isExtraShift ? 'Tăng cường' : 'Tiêu chuẩn'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`rounded px-2 py-1 text-[11px] font-bold ${shift.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {shift.isActive ? 'Hoạt động' : 'Đã tắt'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => fetchShiftDetail(shift.id).catch((err: any) => toast.error(err.message || 'Không thể tải chi tiết ca.'))}
                            className="h-8 w-8 rounded border border-outline-variant inline-flex items-center justify-center hover:bg-blue-50 hover:text-primary cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => toggleStatus(shift)}
                            className={`h-8 w-8 rounded border inline-flex items-center justify-center cursor-pointer disabled:opacity-60 ${
                              shift.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
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

        <aside className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm">
          {selectedShift ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Chi tiết ca</p>
                <h3 className="mt-1 text-lg font-black text-gray-950">{selectedShift.code}</h3>
                <p className="text-sm font-semibold text-gray-600">{selectedShift.name}</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Thời gian</dt>
                  <dd className="font-bold">{formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Qua ngày</dt>
                  <dd className="font-bold">{selectedShift.endDayOffset === 1 ? 'Có' : 'Không'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Giờ công</dt>
                  <dd className="font-bold">{(selectedShift.paidWorkingHours || selectedShift.workingHours || 0).toFixed(1)}h</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Ca tăng cường</dt>
                  <dd className="font-bold">{selectedShift.isExtraShift ? 'Có' : 'Không'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Tạo lúc</dt>
                  <dd className="text-right font-bold">{formatDateTime(selectedShift.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Cập nhật</dt>
                  <dd className="text-right font-bold">{formatDateTime(selectedShift.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="min-h-[280px] flex items-center justify-center text-center text-gray-400">
              <div>
                <Clock3 className="w-9 h-9 mx-auto mb-3" />
                <p className="text-sm font-semibold">Chọn một ca để xem chi tiết.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-white shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h3 className="text-lg font-bold text-gray-950">Thêm ca làm việc</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="h-8 w-8 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer">
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
                    value={form.startTime}
                    onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))}
                    placeholder="08:00:00"
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-mono focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Kết thúc *
                  <input
                    value={form.endTime}
                    onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))}
                    placeholder="12:00:00"
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
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm focus:outline-primary"
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-container disabled:opacity-60 cursor-pointer"
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
