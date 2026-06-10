import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { CreateWorkScheduleRequest, ShiftDto, WorkScheduleDto } from '../../../types';

type ScheduleModalMode = 'create' | 'edit' | 'changeShift' | 'changeUser' | 'status';

type ScheduleForm = {
  id?: number;
  workDate: string;
  userId: string;
  shiftId: string;
  status: string;
  note: string;
};

type BulkError = {
  index: number;
  field: string;
  message: string;
};

const requiredShiftCodes = ['S', 'C', 'T'];
const extraShiftCodes = ['S+', 'C+'];

const statusOptions = [
  { value: 1, label: 'Scheduled' },
  { value: 2, label: 'Completed' },
  { value: 3, label: 'Absent' },
  { value: 4, label: 'Cancelled' },
];

const shiftBadgeClass: Record<string, string> = {
  S: 'bg-blue-50 text-blue-700 border-blue-200',
  C: 'bg-orange-50 text-orange-700 border-orange-200',
  T: 'bg-violet-50 text-violet-700 border-violet-200',
  'S+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'C+': 'bg-red-50 text-red-700 border-red-200',
};

const statusClass: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700 border-slate-200',
  2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  3: 'bg-red-50 text-red-700 border-red-200',
  4: 'bg-gray-100 text-gray-500 border-gray-200',
};

function formatDisplayDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('sv-SE');
}

function getShiftByCode(shifts: ShiftDto[], code: string) {
  return shifts.find((shift) => shift.code === code);
}

export default function ScheduleTab() {
  const {
    shiftDefinitions,
    calendarDays,
    weekStart,
    weekEnd,
    isLoading,
    scheduleSearchQuery,
    scheduleRoleFilter,
    scheduleShiftFilter,
    scheduleStatusFilter,
    setScheduleSearchQuery,
    setScheduleRoleFilter,
    setScheduleShiftFilter,
    setScheduleStatusFilter,
    fetchCalendar,
  } = useScheduleStore();
  const { users } = useUsersStore();

  const [fromDate, setFromDate] = useState(weekStart);
  const [toDate, setToDate] = useState(weekEnd);
  const [modalMode, setModalMode] = useState<ScheduleModalMode>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduleForm>({
    workDate: weekStart,
    userId: '',
    shiftId: '',
    status: '1',
    note: '',
  });
  const [bulkItems, setBulkItems] = useState<CreateWorkScheduleRequest[]>([]);
  const [bulkErrors, setBulkErrors] = useState<BulkError[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const activeShifts = useMemo(
    () => shiftDefinitions.filter((shift) => shift.isActive),
    [shiftDefinitions],
  );

  const visibleDays = useMemo(() => {
    return calendarDays.map((day) => ({
      ...day,
      schedules: day.schedules.filter((schedule) => {
        if (scheduleSearchQuery && !schedule.userName.toLowerCase().includes(scheduleSearchQuery.toLowerCase())) return false;
        if (scheduleShiftFilter && String(schedule.shiftId) !== scheduleShiftFilter) return false;
        if (scheduleStatusFilter && String(schedule.status) !== scheduleStatusFilter) return false;
        if (scheduleRoleFilter !== 'Tất cả vai trò') {
          const user = users.find((item) => item.id === schedule.userId);
          if (user && String(user.role) !== scheduleRoleFilter) return false;
        }
        return true;
      }),
    }));
  }, [calendarDays, scheduleRoleFilter, scheduleSearchQuery, scheduleShiftFilter, scheduleStatusFilter, users]);

  const totalSchedules = calendarDays.reduce((total, day) => total + day.schedules.length, 0);
  const invalidDays = calendarDays.filter((day) => !day.isValid).length;

  const reloadCalendar = async (start = fromDate, end = toDate) => {
    await fetchCalendar(start, end);
  };

  const handleRangeLoad = async () => {
    if (!fromDate || !toDate) {
      toast.error('Vui lòng chọn từ ngày và đến ngày.');
      return;
    }
    await reloadCalendar(fromDate, toDate);
  };

  const handleMoveWeek = async (offsetDays: number) => {
    const nextStart = addDays(weekStart, offsetDays);
    const nextEnd = addDays(weekEnd, offsetDays);
    setFromDate(nextStart);
    setToDate(nextEnd);
    await reloadCalendar(nextStart, nextEnd);
  };

  const openScheduleModal = (
    mode: ScheduleModalMode,
    schedule?: WorkScheduleDto,
    defaults?: Partial<ScheduleForm>,
  ) => {
    setModalMode(mode);
    setForm({
      id: schedule?.id,
      workDate: schedule?.workDate || defaults?.workDate || weekStart,
      userId: schedule?.userId || defaults?.userId || users[0]?.id || '',
      shiftId: String(schedule?.shiftId || defaults?.shiftId || activeShifts[0]?.id || ''),
      status: String(schedule?.status || defaults?.status || 1),
      note: schedule?.note || defaults?.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitSchedule = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.workDate || !form.userId || !form.shiftId) {
      toast.error('Vui lòng nhập đủ ngày làm việc, nhân viên và ca làm việc.');
      return;
    }

    const shift = activeShifts.find((item) => item.id === Number(form.shiftId));
    if (!shift) {
      toast.error('Ca làm việc không hợp lệ hoặc đã inactive.');
      return;
    }

    try {
      if (modalMode === 'edit' && form.id) {
        await scheduleService.updateWorkSchedule(form.id, {
          workDate: form.workDate,
          userId: form.userId,
          shiftId: Number(form.shiftId),
          note: form.note || null,
        });
        toast.success('Đã cập nhật phân ca.');
      } else if (modalMode === 'changeShift' && form.id) {
        await scheduleService.changeShift(form.id, {
          shiftId: Number(form.shiftId),
          note: form.note || null,
        });
        toast.success('Đã đổi ca.');
      } else if (modalMode === 'changeUser' && form.id) {
        await scheduleService.changeUser(form.id, {
          userId: form.userId,
          note: form.note || null,
        });
        toast.success('Đã đổi người làm ca.');
      } else if (modalMode === 'status' && form.id) {
        await scheduleService.updateWorkScheduleStatus(form.id, {
          status: Number(form.status),
          note: form.note || null,
        });
        toast.success('Đã cập nhật trạng thái.');
      } else {
        await scheduleService.createWorkSchedule({
          workDate: form.workDate,
          userId: form.userId,
          shiftId: Number(form.shiftId),
          note: form.note || null,
        });
        toast.success('Đã tạo phân ca.');
      }

      setIsModalOpen(false);
      await reloadCalendar();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu phân ca.');
    }
  };

  const handleDeleteSchedule = (schedule: WorkScheduleDto) => {
    toast.warning(`Xóa phân ca ${schedule.shiftCode} của ${schedule.userName}?`, {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await scheduleService.deleteWorkSchedule(schedule.id);
            toast.success('Đã xóa phân ca.');
            await reloadCalendar();
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa phân ca.');
          }
        },
      },
    });
  };

  const addBulkRow = () => {
    setBulkItems((items) => [
      ...items,
      {
        workDate: weekStart,
        userId: users[0]?.id || '',
        shiftId: activeShifts[0]?.id || 0,
        note: '',
      },
    ]);
    setIsBulkOpen(true);
  };

  const updateBulkRow = (index: number, patch: Partial<CreateWorkScheduleRequest>) => {
    setBulkItems((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    setBulkErrors((errors) => errors.filter((error) => error.index !== index));
  };

  const validateBulk = async () => {
    if (bulkItems.length === 0) {
      toast.error('Chưa có dòng phân ca hàng loạt.');
      return false;
    }

    try {
      const result = await scheduleService.validateBulk({ items: bulkItems });
      setBulkErrors(result.errors || []);
      if (!result.isValid) {
        toast.error('Dữ liệu phân ca chưa hợp lệ.');
        return false;
      }
      toast.success('Dữ liệu phân ca hợp lệ.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Không thể validate lịch.');
      return false;
    }
  };

  const saveBulk = async () => {
    const isValid = await validateBulk();
    if (!isValid) return;

    try {
      const result = await scheduleService.bulkCreateWorkSchedules({ items: bulkItems });
      toast.success(`Đã lưu ${result.createdCount} phân ca.`);
      setBulkItems([]);
      setBulkErrors([]);
      setIsBulkOpen(false);
      await reloadCalendar();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu lịch hàng loạt.');
    }
  };

  const renderScheduleCard = (schedule: WorkScheduleDto) => {
    const shiftClass = shiftBadgeClass[schedule.shiftCode] || 'bg-slate-50 text-slate-700 border-slate-200';
    const statusBadgeClass = statusClass[schedule.status] || statusClass[1];

    return (
      <div key={schedule.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-black ${shiftClass}`}>
                {schedule.shiftCode}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusBadgeClass}`}>
                {schedule.statusName}
              </span>
            </div>
            <p className="mt-1 text-xs font-extrabold text-gray-900 truncate">{schedule.userName}</p>
          </div>
          <button
            type="button"
            onClick={() => openScheduleModal('edit', schedule)}
            className="p-1 text-gray-400 hover:text-primary hover:bg-blue-50 rounded cursor-pointer"
            title="Sửa phân ca"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-gray-500 font-medium">
          {schedule.shiftName} · {schedule.startTime} - {schedule.endTime}
        </div>
        {schedule.note && <p className="text-[10px] text-gray-600 bg-slate-50 rounded p-1.5">{schedule.note}</p>}

        <div className="flex flex-wrap gap-1 pt-1">
          <button type="button" onClick={() => openScheduleModal('changeShift', schedule)} className="px-2 py-1 rounded border text-[10px] font-bold text-primary hover:bg-blue-50 cursor-pointer">
            Đổi ca
          </button>
          <button type="button" onClick={() => openScheduleModal('changeUser', schedule)} className="px-2 py-1 rounded border text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
            Đổi người
          </button>
          <button type="button" onClick={() => openScheduleModal('status', schedule)} className="px-2 py-1 rounded border text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer">
            Trạng thái
          </button>
          <button type="button" onClick={() => handleDeleteSchedule(schedule)} className="px-2 py-1 rounded border border-red-200 text-[10px] font-bold text-red-600 hover:bg-red-50 cursor-pointer">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderShiftCell = (dayDate: string, schedules: WorkScheduleDto[], code: string) => {
    const shift = getShiftByCode(activeShifts, code);
    const items = schedules.filter((schedule) => schedule.shiftCode === code);

    if (items.length > 0) {
      return <div className="space-y-2">{items.map(renderScheduleCard)}</div>;
    }

    return (
      <button
        type="button"
        onClick={() => openScheduleModal('create', undefined, { workDate: dayDate, shiftId: String(shift?.id || '') })}
        className="w-full min-h-28 rounded-lg border border-dashed border-orange-200 bg-orange-50/40 text-orange-700 hover:bg-orange-50 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
      >
        <AlertCircle className="w-4 h-4" />
        <span>Thiếu ca {code}</span>
        <span className="inline-flex items-center gap-1 text-[10px]"><Plus className="w-3 h-3" /> Thêm ca</span>
      </button>
    );
  };

  const renderExtraCell = (dayDate: string, schedules: WorkScheduleDto[]) => {
    const extraItems = schedules.filter((schedule) => extraShiftCodes.includes(schedule.shiftCode));

    if (extraItems.length > 0) {
      return <div className="space-y-2">{extraItems.map(renderScheduleCard)}</div>;
    }

    const fallbackShift = activeShifts.find((shift) => extraShiftCodes.includes(shift.code));

    return (
      <button
        type="button"
        onClick={() => openScheduleModal('create', undefined, { workDate: dayDate, shiftId: String(fallbackShift?.id || '') })}
        className="w-full min-h-28 rounded-lg border border-dashed border-red-200 bg-red-50/40 text-red-700 hover:bg-red-50 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
      >
        <AlertCircle className="w-4 h-4" />
        <span>Thiếu S+ hoặc C+</span>
        <span className="text-[10px]">+ Thêm ca tăng cường</span>
      </button>
    );
  };

  const getModalTitle = () => {
    if (modalMode === 'edit') return 'Sửa phân ca';
    if (modalMode === 'changeShift') return 'Đổi ca nhanh';
    if (modalMode === 'changeUser') return 'Đổi người làm thay';
    if (modalMode === 'status') return 'Cập nhật trạng thái';
    return 'Tạo phân ca';
  };

  return (
    <div className="space-y-5 text-[#191b23] text-left animate-fadeIn">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Quản lý phân ca</h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi S/C/T hằng ngày và ca tăng cường S+/C+ cho T6, T7, CN.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => handleMoveWeek(-7)} className="p-2 border border-outline-variant rounded-lg hover:bg-slate-50 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-2 border border-outline-variant rounded-lg bg-white text-xs font-bold font-mono">
            {formatDisplayDate(weekStart)} - {formatDisplayDate(weekEnd)}
          </div>
          <button type="button" onClick={() => handleMoveWeek(7)} className="p-2 border border-outline-variant rounded-lg hover:bg-slate-50 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={addBulkRow} className="px-3 py-2 border border-outline-variant rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Tạo lịch hàng loạt
          </button>
          <button type="button" onClick={saveBulk} disabled={bulkItems.length === 0} className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-3.5 h-3.5" /> Lưu lịch
          </button>
          <button type="button" onClick={validateBulk} disabled={bulkItems.length === 0} className="px-3 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <CheckCircle2 className="w-3.5 h-3.5" /> Validate lịch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Tổng phân ca</p>
          <p className="text-lg font-extrabold">{totalSchedules}</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Ngày đủ ca</p>
          <p className="text-lg font-extrabold text-emerald-700">{calendarDays.length - invalidDays}</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Ngày thiếu ca</p>
          <p className="text-lg font-extrabold text-red-700">{invalidDays}</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Ca active</p>
          <p className="text-lg font-extrabold">{activeShifts.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <label className="text-xs font-bold text-gray-600">
          Từ ngày
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs" />
        </label>
        <label className="text-xs font-bold text-gray-600">
          Đến ngày
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs" />
        </label>
        <label className="text-xs font-bold text-gray-600">
          User
          <input type="text" value={scheduleSearchQuery} onChange={(event) => setScheduleSearchQuery(event.target.value)} placeholder="Tìm nhân viên" className="mt-1 w-full px-3 py-2 border rounded-lg text-xs" />
        </label>
        <label className="text-xs font-bold text-gray-600">
          Ca làm việc
          <select value={scheduleShiftFilter} onChange={(event) => setScheduleShiftFilter(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs bg-white">
            <option value="">Tất cả ca</option>
            {activeShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.code} - {shift.name}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <label className="text-xs font-bold text-gray-600 flex-1">
            Trạng thái
            <select value={scheduleStatusFilter} onChange={(event) => setScheduleStatusFilter(event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs bg-white">
              <option value="">Tất cả</option>
              {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={handleRangeLoad} className="self-end px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold cursor-pointer">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isBulkOpen && (
        <div className="bg-white border border-outline-variant rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold">Tạo lịch hàng loạt</h3>
            <button type="button" onClick={addBulkRow} className="text-xs font-bold text-primary flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </button>
          </div>
          <div className="space-y-2">
            {bulkItems.map((item, index) => {
              const rowErrors = bulkErrors.filter((error) => error.index === index);
              return (
                <div key={index} className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-2 p-2 rounded-lg border ${rowErrors.length ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
                  <input type="date" value={item.workDate} onChange={(event) => updateBulkRow(index, { workDate: event.target.value })} className="px-2 py-2 border rounded text-xs" />
                  <select value={item.userId} onChange={(event) => updateBulkRow(index, { userId: event.target.value })} className="px-2 py-2 border rounded text-xs bg-white">
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  <select value={item.shiftId} onChange={(event) => updateBulkRow(index, { shiftId: Number(event.target.value) })} className="px-2 py-2 border rounded text-xs bg-white">
                    {activeShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.code} - {shift.name}</option>)}
                  </select>
                  <input value={item.note || ''} onChange={(event) => updateBulkRow(index, { note: event.target.value })} placeholder="Ghi chú" className="px-2 py-2 border rounded text-xs" />
                  <button type="button" onClick={() => setBulkItems((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-red-600 hover:bg-red-50 rounded cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                  {rowErrors.length > 0 && (
                    <div className="md:col-span-5 text-[11px] text-red-700 font-semibold">
                      {rowErrors.map((error) => `${error.field}: ${error.message}`).join(' | ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-xs text-gray-400">Đang tải lịch phân ca...</div>
        ) : visibleDays.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-gray-400">Chưa có dữ liệu lịch trong khoảng ngày này.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1280px] grid grid-cols-7 divide-x divide-slate-100">
              {visibleDays.map((day) => (
                <div key={day.date} className={`min-h-[680px] flex flex-col ${day.isWeekendRule ? 'bg-orange-50/25' : 'bg-white'}`}>
                  <div className="sticky top-0 z-10 bg-inherit border-b border-slate-100 px-3 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{formatDisplayDate(day.date)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{day.date}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        day.isValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {day.isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {day.isValid ? 'Đủ ca' : 'Thiếu'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {day.isWeekendRule && <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">Cuối tuần</span>}
                      <span className="text-[10px] text-gray-400">Đã gán: {day.assignedShifts.length ? day.assignedShifts.join(', ') : 'Chưa có'}</span>
                    </div>

                    {!day.isValid && (
                      <div className="space-y-1 rounded-lg border border-red-100 bg-red-50/60 p-2">
                        {day.missingShifts.length > 0 && <p className="text-[10px] text-red-700 font-semibold">Thiếu ca: {day.missingShifts.join(', ')}</p>}
                        {day.missingExtraShiftGroups.length > 0 && <p className="text-[10px] text-orange-700 font-semibold">Cần thêm S+ hoặc C+</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-3 space-y-3">
                    {requiredShiftCodes.map((code) => {
                      const shift = getShiftByCode(activeShifts, code);
                      return (
                        <section key={code} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-black ${shiftBadgeClass[code]}`}>
                              {code}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {shift ? `${shift.startTime} - ${shift.endTime}` : 'Chưa có ca'}
                            </span>
                          </div>
                          {renderShiftCell(day.date, day.schedules, code)}
                        </section>
                      );
                    })}

                    <section className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex px-2 py-0.5 rounded-md border text-[10px] font-black bg-slate-50 text-slate-700 border-slate-200">
                          S+ / C+
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">Ca tăng cường</span>
                      </div>
                      {day.isWeekendRule ? (
                        renderExtraCell(day.date, day.schedules)
                      ) : (
                        <div className="min-h-20 rounded-lg border border-dashed border-slate-150 bg-slate-50/50 text-slate-300 flex items-center justify-center text-[11px] font-bold">
                          Không bắt buộc
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-gray-900">{getModalTitle()}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitSchedule} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              {(modalMode === 'create' || modalMode === 'edit') && (
                <label className="text-xs font-bold text-gray-600">
                  Ngày làm việc *
                  <input type="date" value={form.workDate} onChange={(event) => setForm((current) => ({ ...current, workDate: event.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs" />
                </label>
              )}
              {(modalMode === 'create' || modalMode === 'edit' || modalMode === 'changeUser') && (
                <label className="text-xs font-bold text-gray-600">
                  Nhân viên *
                  <select value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs bg-white">
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </label>
              )}
              {(modalMode === 'create' || modalMode === 'edit' || modalMode === 'changeShift') && (
                <label className="text-xs font-bold text-gray-600">
                  Ca làm việc *
                  <select value={form.shiftId} onChange={(event) => setForm((current) => ({ ...current, shiftId: event.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs bg-white">
                    {activeShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.code} - {shift.name} ({shift.startTime}-{shift.endTime})</option>)}
                  </select>
                </label>
              )}
              {modalMode === 'status' && (
                <label className="text-xs font-bold text-gray-600">
                  Trạng thái *
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs bg-white">
                    {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </label>
              )}
              <label className="text-xs font-bold text-gray-600 sm:col-span-2">
                Ghi chú
                <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg text-xs resize-none" />
              </label>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-50 cursor-pointer">Hủy</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container cursor-pointer disabled:opacity-60">
                  {isLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
