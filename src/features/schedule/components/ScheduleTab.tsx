import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { CreateWorkScheduleRequest, ShiftDto, User, WorkScheduleDto } from '../../../types';

type ShiftCode = 'S' | 'C' | 'S+' | 'C+' | 'OFF' | '';

type ScheduleCellState = {
  date: string;
  userId: string;
  userName: string;
  scheduleId?: number;
  shiftCode: ShiftCode;
  shiftId?: number;
  note?: string | null;
};

type ScheduleRow = {
  userId: string;
  userName: string;
  phone?: string;
  cells: ScheduleCellState[];
};

type CellError = {
  key: string;
  message: string;
};

const editableShiftCodes: ShiftCode[] = ['S', 'C', 'S+', 'C+', 'OFF'];
const weekDayLabels = ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CN'];

const shiftCellClass: Record<string, string> = {
  S: 'bg-primary/10 text-primary',
  C: 'bg-amber-100 text-amber-800',
  'S+': 'bg-emerald-100 text-emerald-800',
  'C+': 'bg-orange-100 text-orange-800',
  OFF: 'bg-red-600 text-white',
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function formatDateHeader(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatWeekLabel(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
  });
}

function getCellKey(userId: string, date: string) {
  return `${userId}__${date}`;
}

function getShiftByCode(shifts: ShiftDto[], code: ShiftCode) {
  if (!code || code === 'OFF') return undefined;
  return shifts.find((shift) => shift.code === code);
}

function buildWeekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function buildScheduleRows(users: User[], schedules: WorkScheduleDto[], weekDates: string[]): ScheduleRow[] {
  const usersById = new Map<string, User>();
  users.forEach((user) => usersById.set(user.id, user));
  schedules.forEach((schedule) => {
    if (!usersById.has(schedule.userId)) {
      usersById.set(schedule.userId, {
        id: schedule.userId,
        name: schedule.userName,
        email: '',
        role: 'User',
        status: 'Hoạt động',
      });
    }
  });

  return Array.from(usersById.values()).map((user) => ({
    userId: user.id,
    userName: user.name,
    phone: user.phone,
    cells: weekDates.map((date) => {
      const schedule = schedules.find((item) => item.userId === user.id && item.workDate === date);
      return {
        date,
        userId: user.id,
        userName: user.name,
        scheduleId: schedule?.id,
        shiftCode: (schedule?.shiftCode as ShiftCode) || '',
        shiftId: schedule?.shiftId,
        note: schedule?.note,
      };
    }),
  }));
}

export default function ScheduleTab() {
  const {
    shiftDefinitions,
    calendarDays,
    weekStart,
    weekEnd,
    isLoading,
    fetchCalendar,
  } = useScheduleStore();
  const { users } = useUsersStore();

  const [fromDate, setFromDate] = useState(weekStart);
  const [toDate, setToDate] = useState(weekEnd);
  const [changes, setChanges] = useState<Record<string, ScheduleCellState>>({});
  const [cellErrors, setCellErrors] = useState<CellError[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const activeShifts = useMemo(
    () => shiftDefinitions.filter((shift) => shift.isActive && editableShiftCodes.includes(shift.code as ShiftCode)),
    [shiftDefinitions],
  );

  const weekDates = useMemo(() => buildWeekDates(weekStart), [weekStart]);
  const schedules = useMemo(() => calendarDays.flatMap((day) => day.schedules), [calendarDays]);
  const rows = useMemo(() => buildScheduleRows(users, schedules, weekDates), [schedules, users, weekDates]);

  const hasUnsavedChanges = Object.keys(changes).length > 0;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const reloadCalendar = async (start = fromDate, end = toDate) => {
    if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Reload sẽ mất các thay đổi này. Tiếp tục?')) {
      return;
    }

    setChanges({});
    setCellErrors([]);
    await fetchCalendar(start, end);
  };

  const moveWeek = async (offset: number) => {
    if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Chuyển tuần sẽ mất các thay đổi này. Tiếp tục?')) {
      return;
    }

    const nextStart = addDays(weekStart, offset);
    const nextEnd = addDays(weekEnd, offset);
    setFromDate(nextStart);
    setToDate(nextEnd);
    setChanges({});
    setCellErrors([]);
    await fetchCalendar(nextStart, nextEnd);
  };

  const getEffectiveCell = (cell: ScheduleCellState) => {
    return changes[getCellKey(cell.userId, cell.date)] || cell;
  };

  const getCellError = (cell: ScheduleCellState) => {
    return cellErrors.find((error) => error.key === getCellKey(cell.userId, cell.date));
  };

  const changeCellShift = (cell: ScheduleCellState, nextShiftCode: ShiftCode) => {
    const shift = getShiftByCode(activeShifts, nextShiftCode);
    const nextCell: ScheduleCellState = {
      ...cell,
      shiftCode: nextShiftCode,
      shiftId: shift?.id,
      note: nextShiftCode === 'OFF' ? 'OFF' : shift?.name || cell.note || null,
    };

    setChanges((current) => ({
      ...current,
      [getCellKey(cell.userId, cell.date)]: nextCell,
    }));
    setCellErrors((errors) => errors.filter((error) => error.key !== getCellKey(cell.userId, cell.date)));
  };

  const buildBulkItems = () => {
    const items: CreateWorkScheduleRequest[] = [];
    const itemKeys: string[] = [];

    Object.values(changes).forEach((cell) => {
      if (!cell.shiftCode || cell.shiftCode === 'OFF' || !cell.shiftId) return;

      items.push({
        workDate: cell.date,
        userId: cell.userId,
        shiftId: cell.shiftId,
        note: cell.note || null,
      });
      itemKeys.push(getCellKey(cell.userId, cell.date));
    });

    return { items, itemKeys };
  };

  const validateChanges = async () => {
    const { items, itemKeys } = buildBulkItems();
    setCellErrors([]);

    if (items.length === 0) {
      toast.info('Không có ca làm mới để validate. Các ô OFF sẽ được xử lý khi lưu.');
      return true;
    }

    try {
      const result = await scheduleService.validateBulk({ items });
      if (!result.isValid) {
        setCellErrors(result.errors.map((error) => ({
          key: itemKeys[error.index],
          message: error.message,
        })));
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

  const saveChanges = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const valid = await validateChanges();
      if (!valid) return;

      const changedCells = Object.values(changes);
      const existingToOff = changedCells.filter((cell) => cell.scheduleId && cell.shiftCode === 'OFF');
      const existingToUpdate = changedCells.filter((cell) => cell.scheduleId && cell.shiftCode !== 'OFF' && cell.shiftId);
      const createItems = changedCells
        .filter((cell) => !cell.scheduleId && cell.shiftCode !== 'OFF' && cell.shiftId)
        .map((cell) => ({
          workDate: cell.date,
          userId: cell.userId,
          shiftId: cell.shiftId!,
          note: cell.note || null,
        }));

      await Promise.all([
        ...existingToOff.map((cell) => scheduleService.deleteWorkSchedule(cell.scheduleId!)),
        ...existingToUpdate.map((cell) => scheduleService.updateWorkSchedule(cell.scheduleId!, {
          workDate: cell.date,
          userId: cell.userId,
          shiftId: cell.shiftId!,
          note: cell.note || null,
        })),
      ]);

      if (createItems.length > 0) {
        await scheduleService.bulkCreateWorkSchedules({ items: createItems });
      }

      toast.success('Đã lưu lịch làm việc.');
      setChanges({});
      setCellErrors([]);
      await fetchCalendar(weekStart, weekEnd);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu lịch.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderShiftSelect = (cell: ScheduleCellState) => {
    const effectiveCell = getEffectiveCell(cell);
    const error = getCellError(cell);
    const isChanged = Boolean(changes[getCellKey(cell.userId, cell.date)]);
    const cellClass = effectiveCell.shiftCode
      ? shiftCellClass[effectiveCell.shiftCode] || 'bg-primary/10 text-primary'
      : 'bg-white text-gray-400';

    return (
      <td
        key={cell.date}
        title={error?.message || undefined}
        className={`h-11 border border-outline-variant p-0 text-center align-middle ${error ? 'ring-2 ring-red-500 ring-inset' : ''}`}
      >
        <select
          value={effectiveCell.shiftCode}
          onChange={(event) => changeCellShift(cell, event.target.value as ShiftCode)}
          className={`h-full w-full cursor-pointer border-0 text-center text-xs font-extrabold outline-none ${cellClass} ${isChanged ? 'ring-2 ring-primary ring-inset' : ''}`}
        >
          <option value="">-</option>
          {activeShifts.map((shift) => (
            <option key={shift.id} value={shift.code}>{shift.code}</option>
          ))}
          <option value="OFF">OFF</option>
        </select>
      </td>
    );
  };

  return (
    <div className="space-y-4 text-[#191b23] text-left animate-fadeIn">
      <div className="h-14 border border-outline-variant bg-primary text-white flex items-center justify-center">
        <h2 className="text-lg font-extrabold tracking-wide">LỊCH LÀM VIỆC</h2>
      </div>

      <div className="border border-outline-variant bg-primary/10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => moveWeek(-7)}
            disabled={isLoading || isSaving}
            className="justify-self-start px-3 py-1.5 border border-outline-variant bg-white rounded text-xs font-bold flex items-center gap-1 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Tuần trước
          </button>

          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <span>Tuần:</span>
            <span className="font-mono">{formatWeekLabel(weekStart)}</span>
          </div>

          <button
            type="button"
            onClick={() => moveWeek(7)}
            disabled={isLoading || isSaving}
            className="justify-self-end px-3 py-1.5 border border-outline-variant bg-white rounded text-xs font-bold flex items-center gap-1 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
          >
            Tuần sau <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border border-outline-variant bg-white p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label className="text-xs font-bold text-gray-600">
          Từ ngày
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full px-3 py-2 border border-outline-variant rounded text-xs" />
        </label>
        <label className="text-xs font-bold text-gray-600">
          Đến ngày
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full px-3 py-2 border border-outline-variant rounded text-xs" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={validateChanges}
            disabled={!hasUnsavedChanges || isLoading || isSaving}
            className="px-3 py-2 border border-outline-variant rounded text-xs font-bold flex items-center gap-1.5 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" /> Validate lịch
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={!hasUnsavedChanges || isLoading || isSaving}
            className="px-3 py-2 bg-primary text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Lưu lịch'}
          </button>
          <button
            type="button"
            onClick={() => reloadCalendar(fromDate, toDate)}
            disabled={isLoading || isSaving}
            className="px-3 py-2 border border-outline-variant rounded text-xs font-bold flex items-center gap-1.5 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" /> Reload
          </button>
        </div>
      </div>

      <div className="border border-outline-variant bg-white overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary/10">
                <th rowSpan={2} className="w-48 border border-outline-variant px-3 py-2 text-left font-extrabold align-middle">
                  Nhân sự
                </th>
                {weekDates.map((date) => (
                  <th key={date} className="border border-outline-variant px-3 py-2 text-center font-extrabold">
                    {formatDateHeader(date)}
                  </th>
                ))}
              </tr>
              <tr className="bg-primary/5">
                {weekDates.map((date, index) => (
                  <th key={date} className="border border-outline-variant px-3 py-2 text-center text-xs font-extrabold">
                    {weekDayLabels[index]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="border border-outline-variant px-3 py-10 text-center text-xs text-gray-400">
                    Đang tải lịch làm việc...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-outline-variant px-3 py-10 text-center text-xs text-gray-400">
                    Chưa có nhân sự để phân ca.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-primary/5">
                    <td className="h-11 border border-outline-variant px-3 py-2 text-left font-extrabold bg-white sticky left-0 z-[1]">
                      {row.userName}
                    </td>
                    {row.cells.map(renderShiftSelect)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cellErrors.length > 0 && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>{cellErrors.length} ô đang có lỗi validate. Di chuột lên ô viền đỏ để xem chi tiết.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-outline-variant bg-white p-4 min-h-36">
          <h3 className="text-sm font-extrabold text-primary mb-3">GHI CHÚ</h3>
          <div className="space-y-1 text-xs text-gray-700">
            <p className="font-bold">Số điện thoại/zalo liên hệ:</p>
            {rows.slice(0, 6).map((row) => (
              <p key={row.userId}>{row.userName}: {row.phone || 'Chưa cập nhật'}</p>
            ))}
          </div>
        </div>

        <div className="border border-outline-variant bg-white p-4 min-h-36">
          <h3 className="text-sm font-extrabold text-primary mb-3">Option 1</h3>
          <div className="space-y-1 text-xs text-gray-700">
            {activeShifts.map((shift) => (
              <p key={shift.id}>
                <span className="font-extrabold">{shift.code}</span> = {shift.name} {shift.startTime} - {shift.endTime}
              </p>
            ))}
            <p><span className="font-extrabold">OFF</span> = Ngày nghỉ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
