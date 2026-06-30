import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  Loader2,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { usersService } from '../../../services/api/usersService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import { ShiftDto, User, WorkScheduleDto, WorkScheduleWeekUserDto } from '../../../types';
import QuickArrangeScheduleButton from '../../work-schedules/components/QuickArrangeScheduleButton';

type DraftPanel = {
  mode: 'create' | 'edit';
  workDate: string;
  shiftId: string;
  userIds: string[];
  note: string;
  schedule?: WorkScheduleDto;
  sourceUserId?: string;
};

type CellDraft = {
  userId: string;
  workDate: string;
  originalSchedule?: WorkScheduleDto;
  shiftId: string;
};

const shiftStyles: Record<string, string> = {
  S: 'bg-[#e8f3ff] border-[#9ac7f7] text-[#0c315c]',
  C: 'bg-[#eff9e8] border-[#a9d79a] text-[#173d18]',
  T: 'bg-[#f0e7ff] border-[#b99deb] text-[#291044]',
  'S+': 'bg-[#fff4d8] border-[#f2b33d] text-[#4f3100]',
  'C+': 'bg-[#ffeaf0] border-[#ea8fa2] text-[#4b1020]',
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

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatTime(value: string) {
  return value?.slice(0, 5) || '';
}

function getShiftHours(shift: Pick<ShiftDto, 'startTime' | 'endTime'>) {
  return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
}

function getScheduleHours(schedule: WorkScheduleDto) {
  return `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
}

function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'US';
}

function getShiftClass(code: string) {
  return shiftStyles[code] || 'bg-slate-50 border-slate-300 text-slate-800';
}

function getCellKey(userId: string, workDate: string) {
  return `${userId}_${workDate}`;
}

export default function ScheduleTab() {
  const {
    shiftDefinitions,
    weekSchedule,
    weekStart,
    weekEnd,
    isLoading,
    fetchWeekSchedule,
  } = useScheduleStore();
  const { hasAnyRole } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(weekStart);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [panel, setPanel] = useState<DraftPanel | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [scheduleUsers, setScheduleUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [cellDrafts, setCellDrafts] = useState<Record<string, CellDraft>>({});

  const activeShifts = useMemo(
    () => shiftDefinitions.filter(shift => shift.isActive),
    [shiftDefinitions],
  );
  const canManageSchedule = hasAnyRole([1, 3]);

  const departments = useMemo(() => {
    const values = new Set<string>();
    scheduleUsers.forEach(user => {
      if (user.department) values.add(user.department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [scheduleUsers]);

  const scheduleRows = useMemo<WorkScheduleWeekUserDto[]>(() => {
    return scheduleUsers
      .map(user => {
        const weekUser = weekSchedule?.users.find(item => item.userId === user.id);

        return {
          userId: user.id,
          userName: user.name,
          departmentName: user.department || weekUser?.departmentName || null,
          avatarUrl: user.avatar || weekUser?.avatarUrl || null,
          totalWorkingHours: weekUser?.totalWorkingHours || 0,
          schedules: weekUser?.schedules || [],
        };
      })
      .sort((a, b) => a.userName.localeCompare(b.userName, 'vi'));
  }, [scheduleUsers, weekSchedule]);

  const filteredRows = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return scheduleRows.filter(row => {
      const departmentMatch = !departmentFilter || row.departmentName === departmentFilter;
      const keywordMatch =
        !query ||
        row.userName.toLowerCase().includes(query) ||
        row.departmentName?.toLowerCase().includes(query);
      const shiftMatch =
        !shiftFilter ||
        row.schedules.some(schedule => String(schedule.shiftId) === shiftFilter);

      return departmentMatch && keywordMatch && shiftMatch;
    });
  }, [departmentFilter, keyword, shiftFilter, scheduleRows]);

  const visibleTotalWorkingHours = useMemo(() => {
    return filteredRows.reduce((total, row) => {
      const rowTotal = (weekSchedule?.days || []).reduce((rowSum, day) => {
        const schedule = row.schedules.find(item => item.workDate === day.date);
        const draft = cellDrafts[getCellKey(row.userId, day.date)];

        if (draft) {
          const draftShift = activeShifts.find(shift => String(shift.id) === draft.shiftId);
          return rowSum + (draftShift?.paidWorkingHours || draftShift?.workingHours || 0);
        }

        return rowSum + (schedule?.paidWorkingHours || schedule?.workingHours || 0);
      }, 0);

      return total + rowTotal;
    }, 0);
  }, [activeShifts, cellDrafts, filteredRows, weekSchedule?.days]);

  const visibleUsers = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return scheduleUsers
      .filter(user => !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .filter(user => !departmentFilter || user.department === departmentFilter)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [departmentFilter, employeeSearch, scheduleUsers]);

  const currentWeekScheduleIds = useMemo(() => {
    return Array.from(new Set(
      (weekSchedule?.users || []).flatMap(user => user.schedules.map(schedule => schedule.id)),
    ));
  }, [weekSchedule?.users]);

  useEffect(() => {
    fetchWeekSchedule(selectedDate, {
      departmentId: undefined,
      shiftId: shiftFilter || undefined,
      keyword: keyword || undefined,
    }).catch((err: any) => {
      toast.error(err.message || 'Không thể tải lịch làm việc.');
    });
  }, [fetchWeekSchedule, selectedDate]);

  useEffect(() => {
    usersService.getUsers({ role: 2 })
      .then(setScheduleUsers)
      .catch((err: any) => {
        toast.error(err.message || 'Không thể tải danh sách nhân viên lịch làm việc.');
      });
  }, []);

  const reload = async () => {
    await fetchWeekSchedule(selectedDate, {
      shiftId: shiftFilter || undefined,
      keyword: keyword || undefined,
    });
  };
  const hasCellDrafts = Object.keys(cellDrafts).length > 0;

  const openCreatePanel = (workDate = weekStart, userId?: string) => {
    if (!canManageSchedule) return;

    setPanel({
      mode: 'create',
      workDate,
      shiftId: activeShifts[0] ? String(activeShifts[0].id) : '',
      userIds: userId ? [userId] : [],
      note: '',
    });
  };

  const openEditPanel = (schedule: WorkScheduleDto, user: WorkScheduleWeekUserDto) => {
    if (!canManageSchedule) return;

    setPanel({
      mode: 'edit',
      workDate: schedule.workDate,
      shiftId: String(schedule.shiftId),
      userIds: [user.userId],
      note: schedule.note || '',
      schedule,
      sourceUserId: user.userId,
    });
  };

  const moveWeek = (days: number) => {
    setSelectedDate(addDays(weekStart, days));
  };

  const goToday = () => {
    setSelectedDate(toDateInput(new Date()));
  };

  const togglePanelUser = (userId: string) => {
    setPanel(current => {
      if (!current || current.mode === 'edit') return current;
      const exists = current.userIds.includes(userId);
      return {
        ...current,
        userIds: exists
          ? current.userIds.filter(id => id !== userId)
          : [...current.userIds, userId],
      };
    });
  };

  const stageCellShift = (
    row: WorkScheduleWeekUserDto,
    workDate: string,
    schedule: WorkScheduleDto | undefined,
    nextShiftId: string,
  ) => {
    if (!canManageSchedule) return;

    const cellKey = getCellKey(row.userId, workDate);

    setCellDrafts(current => {
      const originalShiftId = schedule ? String(schedule.shiftId) : '';
      const nextDrafts = { ...current };

      if (nextShiftId === originalShiftId) {
        delete nextDrafts[cellKey];
        return nextDrafts;
      }

      nextDrafts[cellKey] = {
        userId: row.userId,
        workDate,
        originalSchedule: schedule,
        shiftId: nextShiftId,
      };
      return nextDrafts;
    });
  };

  const discardCellDrafts = () => {
    setCellDrafts({});
  };

  const submitCellDrafts = async () => {
    const drafts = Object.values(cellDrafts);
    if (drafts.length === 0) return;

    setIsSaving(true);
    try {
      await Promise.all(drafts.map(draft => {
        if (!draft.shiftId && draft.originalSchedule) {
          return scheduleService.deleteWorkSchedule(draft.originalSchedule.id);
        }

        if (draft.shiftId && draft.originalSchedule) {
          return scheduleService.updateWorkSchedule(draft.originalSchedule.id, {
            workDate: draft.workDate,
            shiftId: Number(draft.shiftId),
            userId: draft.userId,
            status: draft.originalSchedule.status,
            note: draft.originalSchedule.note || null,
          });
        }

        if (draft.shiftId) {
          return scheduleService.createWorkSchedule({
            workDate: draft.workDate,
            shiftId: Number(draft.shiftId),
            userId: draft.userId,
            note: null,
          });
        }

        return Promise.resolve();
      }));

      toast.success(`Đã lưu ${drafts.length} thay đổi lịch.`);
      setCellDrafts({});
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu thay đổi lịch.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const savePanel = async () => {
    if (!panel) return;
    if (!panel.workDate || !panel.shiftId) {
      toast.error('Vui lòng chọn ngày và ca trực.');
      return;
    }
    if (panel.userIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhân viên.');
      return;
    }

    setIsSaving(true);
    try {
      if (panel.mode === 'edit' && panel.schedule) {
        await scheduleService.updateWorkSchedule(panel.schedule.id, {
          workDate: panel.workDate,
          shiftId: Number(panel.shiftId),
          userId: panel.userIds[0],
          status: panel.schedule.status,
          note: panel.note || null,
        });
        toast.success('Đã cập nhật lịch.');
      } else {
        await scheduleService.bulkAssignWorkSchedules({
          workDate: panel.workDate,
          shiftId: Number(panel.shiftId),
          userIds: panel.userIds,
          note: panel.note || null,
        });
        toast.success('Đã thêm lịch.');
      }

      setPanel(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu lịch.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!panel?.schedule) return;

    setIsSaving(true);
    try {
      await scheduleService.deleteWorkSchedule(panel.schedule.id);
      toast.success('Đã xóa lịch.');
      setPanel(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa lịch.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAllCurrentWeekSchedules = () => {
    if (!canManageSchedule) return;

    const scheduleIds = currentWeekScheduleIds;
    if (scheduleIds.length === 0) {
      toast.info('Tuần hiện tại chưa có lịch để xóa.');
      return;
    }

    toast.warning(`Xóa toàn bộ ${scheduleIds.length} lịch trong tuần ${formatDate(weekStart)} - ${formatDate(weekEnd)}?`, {
      action: {
        label: 'Xóa tất cả',
        onClick: async () => {
          setIsSaving(true);
          try {
            await Promise.all(scheduleIds.map(id => scheduleService.deleteWorkSchedule(id)));
            toast.success(`Đã xóa ${scheduleIds.length} lịch trong tuần.`);
            setPanel(null);
            setCellDrafts({});
            await reload();
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa toàn bộ lịch.');
          } finally {
            setIsSaving(false);
          }
        },
      },
    });
  };

  const copyCurrentWeek = async () => {
    if (!canManageSchedule) return;

    try {
      const targetDate = addDays(weekStart, 7);
      const result = await scheduleService.copyWeek({
        sourceDate: weekStart,
        targetDate,
        overwriteExisting: false,
        userIds: [],
        storeId: null,
        departmentId: null,
      });
      toast.success(`Đã sao chép ${result.createdCount || 0} lịch sang tuần sau.`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể sao chép tuần.');
    }
  };

  const exportExcel = () => {
    toast.info('Chức năng xuất Excel sẽ gọi API export khi backend bàn giao endpoint.');
  };

  const sendSelectedDateToTelegram = async () => {
    if (!canManageSchedule) return;

    setIsSendingTelegram(true);
    try {
      await scheduleService.sendToTelegram(selectedDate);
      toast.success(`Đã gửi lịch ngày ${formatDate(selectedDate)} lên Telegram.`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi lịch lên Telegram.');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const renderShiftBadge = (shift: ShiftDto) => {
    return (
      <button
        key={shift.id}
        type="button"
        onClick={() => setShiftFilter(String(shift.id))}
        className={`h-14 min-w-[138px] rounded-md border px-4 text-left transition-all cursor-pointer ${getShiftClass(shift.code)} ${
          shiftFilter === String(shift.id) ? 'ring-2 ring-primary ring-offset-1' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-black">{shift.code}</span>
          <span>
            <span className="block text-xs font-bold">{shift.name}</span>
            <span className="block text-xs font-semibold">{getShiftHours(shift)}</span>
          </span>
        </div>
      </button>
    );
  };

  const renderScheduleCell = (row: WorkScheduleWeekUserDto, date: string) => {
    const schedule = row.schedules.find(item => item.workDate === date);
    const cellKey = getCellKey(row.userId, date);
    const draft = cellDrafts[cellKey];
    const effectiveShiftId = draft ? draft.shiftId : schedule ? String(schedule.shiftId) : '';
    const effectiveShift = activeShifts.find(shift => String(shift.id) === effectiveShiftId);
    const hasDraft = Boolean(draft);

    if (canManageSchedule) {
      const isDeletedDraft = Boolean(schedule && draft && !draft.shiftId);

      return (
        <div key={date} className={`min-h-[86px] w-full p-2 flex flex-col items-center justify-center gap-2 ${hasDraft ? 'bg-blue-50/70' : ''}`}>
          {effectiveShift ? (
            <span className={`relative w-full max-w-[104px] rounded-md border px-2 py-2 text-center shadow-sm ${getShiftClass(effectiveShift.code)}`}>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => stageCellShift(row, date, schedule, '')}
                className="absolute -right-1.5 -top-1.5 z-[1] h-5 w-5 rounded-full border border-red-200 bg-white text-red-600 shadow-sm flex items-center justify-center hover:bg-red-50 disabled:opacity-60"
                title="Xóa ca"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <span className="block text-sm font-black">{effectiveShift.code}</span>
              <span className="block text-[11px] font-bold mt-1">{getShiftHours(effectiveShift)}</span>
              {hasDraft && <span className="mt-1 inline-block text-[9px] font-bold text-primary">Chưa lưu</span>}
            </span>
          ) : (
            <span className={`text-xs italic font-semibold ${hasDraft ? 'text-primary' : 'text-gray-500'}`}>
              Nghỉ{hasDraft ? ' - chưa lưu' : ''}
            </span>
          )}

          {effectiveShift ? null : isDeletedDraft ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => stageCellShift(row, date, schedule, String(schedule?.shiftId || ''))}
              className="rounded border border-outline-variant bg-white px-2 py-1 text-[11px] font-bold text-primary hover:bg-blue-50 disabled:opacity-60"
            >
              Hủy xóa
            </button>
          ) : (
            <select
              value=""
              disabled={isSaving}
              onChange={event => stageCellShift(row, date, schedule, event.target.value)}
              className="w-full max-w-[118px] rounded border border-outline-variant bg-white px-1.5 py-1 text-[11px] font-semibold focus:outline-primary disabled:opacity-60"
              title="Chọn ca trực"
            >
              <option value="">Chọn ca</option>
              {activeShifts.map(shift => (
                <option key={shift.id} value={shift.id}>
                  {shift.code} - {shift.name} ({getShiftHours(shift)})
                </option>
              ))}
            </select>
          )}
        </div>
      );
    }

    if (!schedule) {
      return (
        <button
          key={date}
          type="button"
          onClick={() => openCreatePanel(date, row.userId)}
          disabled={!canManageSchedule}
          className={`h-full min-h-[86px] w-full text-center text-xs italic font-semibold text-gray-500 transition-colors ${
            canManageSchedule ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'
          }`}
        >
          Nghỉ
        </button>
      );
    }

    return (
      <button
        key={date}
        type="button"
        onClick={() => openEditPanel(schedule, row)}
        disabled={!canManageSchedule}
        className={`h-full min-h-[86px] w-full flex items-center justify-center p-2 transition-colors ${
          canManageSchedule ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className={`relative w-full max-w-[104px] rounded-md border px-2 py-2 text-center shadow-sm ${getShiftClass(schedule.shiftCode)}`}>
          {canManageSchedule && <Edit2 className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400" />}
          <span className="block text-sm font-black">{schedule.shiftCode}</span>
          <span className="block text-[11px] font-bold mt-1">{getScheduleHours(schedule)}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-112px)] min-h-[calc(100dvh-88px)] lg:min-h-[720px] -m-3 sm:-m-4 lg:-m-6 bg-white text-[#111827] animate-fadeIn">
      <div className="h-full flex flex-col">
        <div className="border-b border-outline-variant px-4 lg:px-6 py-4 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-11 max-w-full rounded-md border border-outline-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => moveWeek(-7)}
                  className="w-11 flex items-center justify-center border-r border-outline-variant hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveWeek(7)}
                  className="w-11 flex items-center justify-center border-r border-outline-variant hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="px-3 sm:px-4 flex items-center gap-3 text-sm font-bold min-w-[220px] sm:min-w-[240px]">
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                  <CalendarDays className="w-4 h-4 ml-auto" />
                </div>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="h-11 px-4 rounded-md border border-outline-variant bg-white text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hôm nay
              </button>

              <select
                value={departmentFilter}
                onChange={event => setDepartmentFilter(event.target.value)}
                className="h-11 w-full sm:w-auto sm:min-w-[190px] rounded-md border border-outline-variant bg-white px-3 text-sm cursor-pointer"
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select
                value={shiftFilter}
                onChange={event => setShiftFilter(event.target.value)}
                className="h-11 w-full sm:w-auto sm:min-w-[190px] rounded-md border border-outline-variant bg-white px-3 text-sm cursor-pointer"
              >
                <option value="">Tất cả ca trực</option>
                {activeShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>{shift.code} - {shift.name}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') reload();
                  }}
                  placeholder="Tìm nhân viên..."
                  className="h-11 w-full sm:w-[220px] rounded-md border border-outline-variant px-3 pr-9 text-sm focus:outline-primary"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreatePanel(weekStart)}
              disabled={!canManageSchedule}
              className="h-11 px-5 rounded-md bg-primary !text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm hover:bg-primary-container cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#fff' }}
            >
              <Plus className="w-4 h-4" />
              Thêm lịch
              <ChevronDown className="w-4 h-4" />
            </button>
            <QuickArrangeScheduleButton
              users={scheduleUsers}
              disabled={!canManageSchedule}
              onSuccess={reload}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCurrentWeek}
                disabled={!canManageSchedule}
                className="h-11 px-4 rounded-md border border-outline-variant bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4" />
                Sao chép tuần
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="h-11 px-4 rounded-md border border-outline-variant bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
              <button
                type="button"
                onClick={sendSelectedDateToTelegram}
                disabled={!canManageSchedule || isSendingTelegram}
                className="h-11 px-4 rounded-md border border-outline-variant bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gửi Telegram
              </button>
              <button
                type="button"
                onClick={deleteAllCurrentWeekSchedules}
                disabled={!canManageSchedule || isSaving || currentWeekScheduleIds.length === 0}
                className="h-11 px-4 rounded-md border border-red-200 bg-red-50 text-red-600 text-sm font-semibold inline-flex items-center gap-2 hover:bg-red-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Xóa tất cả lịch
              </button>
              <button
                type="button"
                className="h-11 px-4 rounded-md border border-outline-variant bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Cài đặt hiển thị
              </button>
            </div>

            <div className="inline-flex rounded-md border border-outline-variant overflow-hidden">
              <button className="h-11 px-5 text-sm font-bold text-primary bg-blue-50 border-r border-primary inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => toast.info('Chế độ tháng sẽ được bật khi API month cần dùng trong UI.')}
                className="h-11 px-5 text-sm font-semibold bg-white hover:bg-slate-50 cursor-pointer"
              >
                Theo tháng
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-6 py-4 border-b border-outline-variant">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Ca trực:</span>
            {activeShifts.map(renderShiftBadge)}
            <button
              type="button"
              onClick={() => setShiftFilter('')}
              className={`h-14 min-w-[108px] rounded-md border px-4 text-sm font-bold cursor-pointer ${
                !shiftFilter ? 'border-primary text-primary bg-blue-50' : 'border-outline-variant bg-white'
              }`}
            >
              Nghỉ/Off
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 overflow-auto">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="w-[170px] border border-outline-variant px-4 py-5 text-center text-sm font-semibold">
                    Nhân viên
                  </th>
                  {(weekSchedule?.days || []).map(day => (
                    <th key={day.date} className="w-[118px] border border-outline-variant px-3 py-4 text-center font-semibold">
                      <span className="block text-base">{day.dayName.replace('Thứ ', 'T')}</span>
                      <span className="block text-sm font-normal mt-1">{formatShortDate(day.date)}</span>
                    </th>
                  ))}
                  <th className="w-[104px] border border-outline-variant px-3 py-4 text-center font-semibold">
                    Tổng giờ
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="border border-outline-variant py-16 text-center text-gray-400 font-semibold">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                      Đang tải lịch làm việc...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-outline-variant py-16 text-center text-gray-400 font-semibold">
                      Không có lịch phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => (
                    <tr key={row.userId} className="bg-white">
                      <td className="border border-outline-variant px-4 py-4">
                        <div className="flex items-center gap-3">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt={row.userName} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-black">
                              <UserRound className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-950 truncate">{row.userName}</p>
                            <p className="text-xs text-gray-500 truncate">{row.departmentName || 'Chưa có phòng ban'}</p>
                          </div>
                        </div>
                      </td>
                      {(weekSchedule?.days || []).map(day => (
                        <td key={day.date} className="border border-outline-variant p-0 align-middle">
                          {renderScheduleCell(row, day.date)}
                        </td>
                      ))}
                      <td className="border border-outline-variant text-center text-base font-semibold">
                        {(weekSchedule?.days || []).reduce((total, day) => {
                          const schedule = row.schedules.find(item => item.workDate === day.date);
                          const draft = cellDrafts[getCellKey(row.userId, day.date)];
                          if (draft) {
                            const draftShift = activeShifts.find(shift => String(shift.id) === draft.shiftId);
                            return total + (draftShift?.paidWorkingHours || draftShift?.workingHours || 0);
                          }
                          return total + (schedule?.paidWorkingHours || schedule?.workingHours || 0);
                        }, 0).toFixed(1)}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={() => openCreatePanel(weekStart)}
                disabled={!canManageSchedule}
                className="h-10 px-4 rounded-md border border-dashed border-outline-variant text-primary text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Thêm nhân viên
              </button>
              {hasCellDrafts && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">
                    {Object.keys(cellDrafts).length} thay đổi chưa lưu
                  </span>
                  <button
                    type="button"
                    onClick={discardCellDrafts}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-md border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                  >
                    Hủy thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={submitCellDrafts}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-md bg-primary text-white text-sm font-bold hover:bg-primary-container cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
              <div className="text-left sm:text-right">
                <p className="text-base font-bold">
                  Tổng giờ của tuần:
                  <span className="ml-8">{visibleTotalWorkingHours.toFixed(1)}h</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">(Tính theo thời gian thực tế)</p>
              </div>
            </div>

            <p className="px-4 pb-5 text-sm text-gray-500">
              {canManageSchedule
                ? 'Click vào ô ca để chỉnh sửa. Click ô Nghỉ để thêm lịch cho nhân viên trong ngày đó.'
                : 'Bạn chỉ có quyền xem, tìm kiếm và lọc lịch làm việc.'}
            </p>
          </div>

          <aside className="border-t xl:border-t-0 xl:border-l border-outline-variant bg-white p-4 lg:p-5 overflow-y-auto">
            {panel ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{panel.mode === 'edit' ? 'Sửa lịch' : 'Thêm lịch'}</h3>
                  <button type="button" onClick={() => setPanel(null)} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <label className="block text-sm font-medium">
                  Ngày
                  <input
                    type="date"
                    value={panel.workDate}
                    onChange={event => setPanel(current => current ? { ...current, workDate: event.target.value } : current)}
                    className="mt-2 h-10 w-full rounded-md border border-outline-variant px-3 text-sm"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Ca trực
                  <select
                    value={panel.shiftId}
                    onChange={event => setPanel(current => current ? { ...current, shiftId: event.target.value } : current)}
                    className="mt-2 h-10 w-full rounded-md border border-outline-variant px-3 text-sm bg-white"
                  >
                    {activeShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {shift.code} - {shift.name} ({getShiftHours(shift)})
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <label className="block text-sm font-medium">Nhân viên</label>
                  {panel.mode === 'create' && (
                    <div className="relative mt-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={employeeSearch}
                        onChange={event => setEmployeeSearch(event.target.value)}
                        placeholder="Tìm nhân viên..."
                        className="h-10 w-full rounded-md border border-outline-variant px-3 pr-9 text-sm"
                      />
                    </div>
                  )}

                  <div className="mt-2 max-h-[170px] overflow-y-auto rounded-md border border-outline-variant">
                    {panel.mode === 'edit' ? (
                      <div className="px-3 py-2 text-sm font-semibold">
                        {scheduleRows.find(user => user.userId === panel.userIds[0])?.userName || 'Nhân viên'}
                      </div>
                    ) : visibleUsers.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-gray-400">Không có nhân viên</div>
                    ) : (
                      visibleUsers.map(user => {
                        const checked = panel.userIds.includes(user.id);
                        return (
                          <label key={user.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePanelUser(user.id)}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className={checked ? 'font-bold text-primary' : ''}>{user.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <label className="block text-sm font-medium">
                  Ghi chú
                  <textarea
                    value={panel.note}
                    onChange={event => setPanel(current => current ? { ...current, note: event.target.value } : current)}
                    placeholder="Nhập ghi chú (nếu có)..."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-md border border-outline-variant px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={savePanel}
                    disabled={isSaving}
                    className="h-10 rounded-md bg-primary text-white text-sm font-bold hover:bg-primary-container cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    disabled={isSaving}
                    className="h-10 rounded-md border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                  >
                    Hủy
                  </button>
                </div>

                {panel.mode === 'edit' && (
                  <button
                    type="button"
                    onClick={deleteSchedule}
                    disabled={isSaving}
                    className="w-full h-10 rounded-md border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 cursor-pointer disabled:opacity-60"
                  >
                    Xóa lịch này
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400">
                <div>
                  <CalendarDays className="w-9 h-9 mx-auto mb-3" />
                  <p className="text-sm font-semibold">Chọn một ô lịch hoặc bấm Thêm lịch.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
