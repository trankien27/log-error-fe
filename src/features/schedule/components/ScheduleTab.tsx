import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Edit2,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { overtimeService } from '../../../services/api/overtimeService';
import { usersService } from '../../../services/api/usersService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import {
  MonthlyWorkScheduleStats,
  OvertimeRequestDto,
  OvertimeStatus,
  ShiftDto,
  User,
  WorkScheduleDto,
  WorkScheduleWeekUserDto,
  WorkScheduleWeekResponse,
} from '../../../types';
import WeeklyCoverageSuggestionModal from '../../work-schedules/components/WeeklyCoverageSuggestionModal';

type DraftPanel = {
  mode: 'create' | 'edit';
  workDate: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  endDayOffset: 0 | 1;
  paidWorkingHours: number;
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

type DraggedSchedule = {
  sourceUserId: string;
  sourceWorkDate: string;
  sourceSchedule?: WorkScheduleDto;
  shiftId: string;
};

type OvertimeDraft = {
  userId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

type ScheduleNotePreview = {
  title: string;
  note: string;
};

type ScheduleViewPreview = {
  title: string;
  userName: string;
  date: string;
  schedules: WorkScheduleDto[];
};

type ScheduleContextMenuState = {
  x: number;
  y: number;
  schedule?: WorkScheduleDto;
  schedules: WorkScheduleDto[];
  user: WorkScheduleWeekUserDto;
  workDate: string;
};

const shiftStyles: Record<string, string> = {
  S: 'bg-[#e8f3ff] border-[#5b9be8] text-[#0c315c]',
  C: 'bg-[#eff9e8] border-[#6bbf5a] text-[#173d18]',
  T: 'bg-[#f0e7ff] border-[#9b6fe0] text-[#291044]',
  'S+': 'bg-[#fff4d8] border-[#f2b33d] text-[#4f3100]',
  'C+': 'bg-[#ffeaf0] border-[#e06985] text-[#4b1020]',
};

// Ky hieu ca de phan biet khong chi bang mau (ho tro nguoi mu mau)
const shiftGlyphs: Record<string, string> = {
  S: '☀',
  C: '🌙',
  T: '🌘',
  'S+': '☀+',
  'C+': '🌙+',
};

function getShiftGlyph(code: string) {
  return shiftGlyphs[code] || '';
}

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

function getShiftTitle(shift: Pick<ShiftDto, 'code' | 'name'>) {
  return `${shift.code} - ${shift.name}`;
}

function getShiftOptionDisplay(shift: Pick<ShiftDto, 'code' | 'name' | 'startTime' | 'endTime'>) {
  return `${getShiftTitle(shift)} | ${getShiftHours(shift)}`;
}

function getScheduleTitle(schedule: WorkScheduleDto) {
  return `${schedule.shiftCode} - ${schedule.shiftName}`;
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
  return shiftStyles[code] || 'bg-surface-2 border-outline-variant text-on-surface';
}

function getCellKey(userId: string, workDate: string) {
  return `${userId}_${workDate}`;
}

function getSchedulesForDate(row: WorkScheduleWeekUserDto, workDate: string) {
  return row.schedules
    .filter(item => item.workDate === workDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function getSchedulesTotalHours(schedules: WorkScheduleDto[]) {
  return schedules.reduce((total, schedule) => (
    total + (schedule.paidWorkingHours || schedule.workingHours || 0)
  ), 0);
}

function getOvertimeStatusLabel(status: OvertimeStatus) {
  if (status === 1) return 'Chờ duyệt';
  if (status === 2) return 'Đã duyệt';
  if (status === 3) return 'Từ chối';
  return 'Đã hủy';
}

function getOvertimeStatusClass(status: OvertimeStatus) {
  if (status === 1) return 'border-warning/30 bg-warning-container text-warning';
  if (status === 2) return 'border-success/30 bg-success-container text-success';
  if (status === 3) return 'border-error/30 bg-error-container text-error';
  return 'border-outline-variant bg-surface-2 text-on-surface-variant';
}

function getYearMonth(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function formatNumber(value: unknown) {
  return typeof value === 'number' ? value.toLocaleString('vi-VN') : '0';
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toInputTime(value?: string | null) {
  return value?.slice(0, 5) || '';
}

function base64ToBlob(base64Content: string, mimeType: string) {
  const normalizedBase64 = (base64Content.includes(',') ? base64Content.split(',')[1] : base64Content).replace(/\s/g, '');
  const binary = atob(normalizedBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(blob: Blob, fileName: string) {
  saveAs(blob, fileName);
}

export default function ScheduleTab() {
  const {
    shiftDefinitions,
    weekSchedule,
    weekStart,
    weekEnd,
    isLoading,
    fetchWeekSchedule,
    setWeekSchedule,
  } = useScheduleStore();
  const { hasAnyRole, currentUser, getCurrentRoleNumber } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(weekStart);
  const [scheduleViewMode, setScheduleViewMode] = useState<'week' | 'month'>('week');
  const [monthlySchedules, setMonthlySchedules] = useState<WorkScheduleDto[]>([]);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [panel, setPanel] = useState<DraftPanel | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [scheduleUsers, setScheduleUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsYear, setStatsYear] = useState(() => getYearMonth(weekStart).year);
  const [statsMonth, setStatsMonth] = useState(() => getYearMonth(weekStart).month);
  const [statsUserId, setStatsUserId] = useState('');
  const [monthlyStats, setMonthlyStats] = useState<MonthlyWorkScheduleStats[]>([]);
  const [cellDrafts, setCellDrafts] = useState<Record<string, CellDraft>>({});
  const [overtimeDraft, setOvertimeDraft] = useState<OvertimeDraft | null>(null);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequestDto[]>([]);
  const [reportYear, setReportYear] = useState(() => getYearMonth(weekStart).year);
  const [reportMonth, setReportMonth] = useState(() => getYearMonth(weekStart).month);
  const [reportUserId, setReportUserId] = useState('');
  const [isOvertimeExportModalOpen, setIsOvertimeExportModalOpen] = useState(false);
  const [isExportingOvertime, setIsExportingOvertime] = useState(false);
  const [isWeeklySuggestionOpen, setIsWeeklySuggestionOpen] = useState(false);
  const [openShiftSelectKey, setOpenShiftSelectKey] = useState<string | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<DraggedSchedule | null>(null);
  const [dragOverScheduleCell, setDragOverScheduleCell] = useState<string | null>(null);
  const [scheduleNotePreview, setScheduleNotePreview] = useState<ScheduleNotePreview | null>(null);
  const [scheduleViewPreview, setScheduleViewPreview] = useState<ScheduleViewPreview | null>(null);
  const [scheduleContextMenu, setScheduleContextMenu] = useState<ScheduleContextMenuState | null>(null);

  const activeShifts = useMemo(
    () => shiftDefinitions.filter(shift => shift.isActive),
    [shiftDefinitions],
  );
  const canManageSchedule = hasAnyRole([1, 3]);
  const isEmployee = getCurrentRoleNumber() === 2;
  const currentUserId = currentUser?.id || '';
  const firstActiveShift = activeShifts[0];
  const today = toDateInput(new Date());

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

      return departmentMatch && keywordMatch;
    });
  }, [departmentFilter, keyword, scheduleRows]);

  const monthView = useMemo(() => {
    const anchor = new Date(`${selectedDate}T00:00:00`);
    const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const leadingBlankCount = (firstDay.getDay() + 6) % 7;
    const userById = new Map(scheduleUsers.map(user => [user.id, user]));
    const allowedUserIds = new Set(
      scheduleUsers
        .filter(user => !departmentFilter || user.department === departmentFilter)
        .filter(user => {
          const query = keyword.trim().toLowerCase();
          return !query || user.name.toLowerCase().includes(query) || user.department?.toLowerCase().includes(query);
        })
        .map(user => user.id),
    );
    const shiftOrder = new Map(activeShifts.map((shift, index) => [shift.id, index]));
    const schedulesByDate = new Map<string, Array<{
      shiftId?: number | null;
      shiftCode: string;
      shiftName: string;
      schedules: WorkScheduleDto[];
    }>>();

    monthlySchedules
      .filter(schedule => allowedUserIds.has(schedule.userId))
      .forEach(schedule => {
        const workDate = schedule.workDate.slice(0, 10);
        const dateGroups = schedulesByDate.get(workDate) || [];
        const group = dateGroups.find(item =>
          schedule.shiftId != null
            ? item.shiftId === schedule.shiftId
            : item.shiftCode === schedule.shiftCode,
        );

        if (group) {
          group.schedules.push(schedule);
        } else {
          dateGroups.push({
            shiftId: schedule.shiftId,
            shiftCode: schedule.shiftCode,
            shiftName: schedule.shiftName,
            schedules: [schedule],
          });
        }
        schedulesByDate.set(workDate, dateGroups);
      });

    schedulesByDate.forEach(groups => {
      groups.sort((first, second) => {
        const firstOrder = first.shiftId == null ? Number.MAX_SAFE_INTEGER : shiftOrder.get(first.shiftId) ?? Number.MAX_SAFE_INTEGER;
        const secondOrder = second.shiftId == null ? Number.MAX_SAFE_INTEGER : shiftOrder.get(second.shiftId) ?? Number.MAX_SAFE_INTEGER;
        return firstOrder - secondOrder || first.shiftName.localeCompare(second.shiftName, 'vi');
      });
      groups.forEach(group => {
        group.schedules.sort((first, second) => {
          const firstName = first.userName || userById.get(first.userId)?.name || '';
          const secondName = second.userName || userById.get(second.userId)?.name || '';
          return firstName.localeCompare(secondName, 'vi');
        });
      });
    });

    return {
      firstDate: toDateInput(firstDay),
      lastDate: toDateInput(lastDay),
      leadingBlankCount,
      rowCount: Math.ceil((leadingBlankCount + lastDay.getDate()) / 7),
      days: Array.from({ length: lastDay.getDate() }, (_, index) => {
        const date = new Date(firstDay);
        date.setDate(index + 1);
        const dateKey = toDateInput(date);
        return { date, dateKey, shiftGroups: schedulesByDate.get(dateKey) || [] };
      }),
    };
  }, [activeShifts, departmentFilter, keyword, monthlySchedules, scheduleUsers, selectedDate]);

  const loadMonthSchedules = async () => {
    setIsMonthLoading(true);
    try {
      const schedules = await scheduleService.getWorkSchedules({
        fromDate: monthView.firstDate,
        toDate: monthView.lastDate,
      });
      setMonthlySchedules(schedules);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải lịch làm việc theo tháng.');
    } finally {
      setIsMonthLoading(false);
    }
  };

  const visibleTotalWorkingHours = useMemo(() => {
    return filteredRows.reduce((total, row) => {
      const rowTotal = (weekSchedule?.days || []).reduce((rowSum, day) => {
        const schedules = getSchedulesForDate(row, day.date);
        const draft = cellDrafts[getCellKey(row.userId, day.date)];

        if (draft) {
          const draftShift = activeShifts.find(shift => String(shift.id) === draft.shiftId);
          return rowSum + (draftShift?.paidWorkingHours || draftShift?.workingHours || 0);
        }

        return rowSum + getSchedulesTotalHours(schedules);
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

  const cloneWeekSchedule = (schedule: WorkScheduleWeekResponse | null) => (
    schedule
      ? {
        ...schedule,
        days: schedule.days.map(day => ({ ...day })),
        users: schedule.users.map(user => ({
          ...user,
          schedules: user.schedules.map(item => ({ ...item })),
        })),
      }
      : null
  );

  const upsertScheduleInWeek = (base: WorkScheduleWeekResponse | null, nextSchedule: WorkScheduleDto) => {
    const next = cloneWeekSchedule(base);
    if (!next) return next;

    next.users = next.users.map(user => ({
      ...user,
      schedules: user.schedules.filter(item => item.id !== nextSchedule.id),
    }));

    const userIndex = next.users.findIndex(user => user.userId === nextSchedule.userId);
    if (userIndex < 0) return next;

    const user = next.users[userIndex];
    next.users[userIndex] = {
      ...user,
      schedules: [...user.schedules, nextSchedule].sort((first, second) => (
        first.workDate.localeCompare(second.workDate) || first.startTime.localeCompare(second.startTime)
      )),
    };

    return next;
  };

  const replaceTemporaryScheduleInWeek = (
    base: WorkScheduleWeekResponse | null,
    temporaryId: number,
    savedSchedule: WorkScheduleDto,
  ) => {
    const next = cloneWeekSchedule(base);
    if (!next) return next;

    next.users = next.users.map(user => ({
      ...user,
      schedules: user.schedules
        .map(item => (item.id === temporaryId ? savedSchedule : item))
        .sort((first, second) => (
          first.workDate.localeCompare(second.workDate) || first.startTime.localeCompare(second.startTime)
        )),
    }));

    return next;
  };

  const buildOptimisticSchedule = (
    userId: string,
    payload: {
      workDate: string;
      shiftId: number;
      note: string | null;
    },
    id: number,
    previous?: WorkScheduleDto,
  ): WorkScheduleDto => {
    const selectedShift = activeShifts.find(shift => shift.id === payload.shiftId);

    return {
      ...(previous || {}),
      id,
      workDate: payload.workDate,
      userId,
      userName: scheduleRows.find(user => user.userId === userId)?.userName || previous?.userName,
      shiftId: payload.shiftId,
      shiftCode: selectedShift?.code || previous?.shiftCode || panel?.shiftCode || '',
      shiftName: selectedShift?.name || previous?.shiftName || panel?.shiftName || '',
      startTime: selectedShift?.startTime || previous?.startTime || toApiTime(panel?.startTime || ''),
      endTime: selectedShift?.endTime || previous?.endTime || toApiTime(panel?.endTime || ''),
      endDayOffset: selectedShift?.endDayOffset || previous?.endDayOffset || panel?.endDayOffset || 0,
      paidWorkingHours: selectedShift?.paidWorkingHours || previous?.paidWorkingHours || panel?.paidWorkingHours || 0,
      workingHours: selectedShift?.paidWorkingHours || selectedShift?.workingHours || previous?.workingHours || previous?.paidWorkingHours || panel?.paidWorkingHours || 0,
      status: previous?.status || 1,
      statusName: previous?.statusName || 'Scheduled',
      note: payload.note,
    };
  };

  const overtimeByCell = useMemo(() => {
    const result = new Map<string, OvertimeRequestDto[]>();

    overtimeRequests.forEach(item => {
      const key = getCellKey(item.userId, item.workDate);
      const current = result.get(key) || [];
      current.push(item);
      result.set(key, current);
    });

    return result;
  }, [overtimeRequests]);

  const monthlyStatsSummary = useMemo(() => {
    return monthlyStats.reduce(
      (summary, item) => ({
        totalSchedules: summary.totalSchedules + item.totalSchedules,
        completedSchedules: summary.completedSchedules + item.completedSchedules,
        absentSchedules: summary.absentSchedules + item.absentSchedules,
        cancelledSchedules: summary.cancelledSchedules + item.cancelledSchedules,
        totalPlannedHours: summary.totalPlannedHours + item.totalPlannedHours,
        totalWorkedHours: summary.totalWorkedHours + item.totalWorkedHours,
        totalAbsentHours: summary.totalAbsentHours + item.totalAbsentHours,
      }),
      {
        totalSchedules: 0,
        completedSchedules: 0,
        absentSchedules: 0,
        cancelledSchedules: 0,
        totalPlannedHours: 0,
        totalWorkedHours: 0,
        totalAbsentHours: 0,
      },
    );
  }, [monthlyStats]);

  const monthlyStatsRows = useMemo(() => {
    const statsByUser = new Map<string, MonthlyWorkScheduleStats>();

    monthlyStats.forEach(item => {
      const current = statsByUser.get(item.userId);

      if (!current) {
        statsByUser.set(item.userId, {
          ...item,
          shiftBreakdowns: [...item.shiftBreakdowns],
        });
        return;
      }

      statsByUser.set(item.userId, {
        ...current,
        totalSchedules: current.totalSchedules + item.totalSchedules,
        completedSchedules: current.completedSchedules + item.completedSchedules,
        absentSchedules: current.absentSchedules + item.absentSchedules,
        cancelledSchedules: current.cancelledSchedules + item.cancelledSchedules,
        totalPlannedHours: current.totalPlannedHours + item.totalPlannedHours,
        totalWorkedHours: current.totalWorkedHours + item.totalWorkedHours,
        totalAbsentHours: current.totalAbsentHours + item.totalAbsentHours,
        shiftBreakdowns: [...current.shiftBreakdowns, ...item.shiftBreakdowns],
      });
    });

    return Array.from(statsByUser.values()).sort((a, b) => a.userFullName.localeCompare(b.userFullName, 'vi'));
  }, [monthlyStats]);

  useEffect(() => {
    fetchWeekSchedule(selectedDate, {
      departmentId: undefined,
      keyword: keyword || undefined,
    }).catch((err: any) => {
      toast.error(err.message || 'Không thể tải lịch làm việc.');
    });
  }, [fetchWeekSchedule, selectedDate]);

  useEffect(() => {
    if (scheduleViewMode !== 'month') return;
    loadMonthSchedules();
  }, [scheduleViewMode, monthView.firstDate, monthView.lastDate]);

  useEffect(() => {
    overtimeService.getAll({
      fromDate: weekStart,
      toDate: weekEnd,
    })
      .then(setOvertimeRequests)
      .catch((err: any) => {
        toast.error(err.message || 'Không thể tải OT trong tuần.');
      });
  }, [weekEnd, weekStart]);

  useEffect(() => {
    usersService.getUsers({ role: 2 })
      .then(setScheduleUsers)
      .catch((err: any) => {
        toast.error(err.message || 'Không thể tải danh sách nhân viên lịch làm việc.');
      });
  }, []);

  useEffect(() => {
    if (!scheduleContextMenu) return;

    const closeMenu = () => setScheduleContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [scheduleContextMenu]);

  const reload = async () => {
    if (scheduleViewMode === 'month') {
      await loadMonthSchedules();
      return;
    }

    const [weeklyOvertime] = await Promise.all([
      overtimeService.getAll({
        fromDate: weekStart,
        toDate: weekEnd,
      }),
      fetchWeekSchedule(selectedDate, {
        keyword: keyword || undefined,
      }),
    ]);
    setOvertimeRequests(weeklyOvertime);
  };
  const hasCellDrafts = Object.keys(cellDrafts).length > 0;

  const applyShiftToPanel = (shift: ShiftDto) => {
    setPanel(current => current ? ({
      ...current,
      shiftId: String(shift.id),
      shiftCode: shift.code,
      shiftName: shift.name,
      startTime: toInputTime(shift.startTime),
      endTime: toInputTime(shift.endTime),
      endDayOffset: shift.endDayOffset ? 1 : 0,
      paidWorkingHours: shift.paidWorkingHours || shift.workingHours || 0,
    }) : current);
  };

  const openCreatePanel = (workDate = weekStart, userId?: string) => {
    if (!canManageSchedule) return;

    const defaultShift = firstActiveShift;
    const startTime = defaultShift ? toInputTime(defaultShift.startTime) : '';
    const endTime = defaultShift ? toInputTime(defaultShift.endTime) : '';
    const endDayOffset = (defaultShift?.endDayOffset ? 1 : 0) as 0 | 1;

    setPanel({
      mode: 'create',
      workDate,
      shiftId: defaultShift ? String(defaultShift.id) : '',
      shiftCode: defaultShift?.code || 'LĐ',
      shiftName: defaultShift?.name || 'Ca linh động',
      startTime,
      endTime,
      endDayOffset,
      paidWorkingHours: defaultShift?.paidWorkingHours || defaultShift?.workingHours || 0,
      userIds: userId ? [userId] : [],
      note: '',
    });
  };

  const openEditPanel = (schedule: WorkScheduleDto, user: WorkScheduleWeekUserDto) => {
    if (!canManageSchedule) return;

    setPanel({
      mode: 'edit',
      workDate: schedule.workDate,
      shiftId: schedule.shiftId ? String(schedule.shiftId) : '',
      shiftCode: schedule.shiftCode || 'LĐ',
      shiftName: schedule.shiftName || 'Ca linh động',
      startTime: toInputTime(schedule.startTime),
      endTime: toInputTime(schedule.endTime),
      endDayOffset: schedule.endDayOffset ? 1 : 0,
      paidWorkingHours: schedule.paidWorkingHours || schedule.workingHours || 0,
      userIds: [user.userId],
      note: schedule.note || '',
      schedule,
      sourceUserId: user.userId,
    });
  };

  const moveWeek = (days: number) => {
    if (scheduleViewMode === 'month') {
      const current = new Date(`${selectedDate}T00:00:00`);
      current.setDate(1);
      current.setMonth(current.getMonth() + (days < 0 ? -1 : 1));
      setSelectedDate(toDateInput(current));
      return;
    }
    setSelectedDate(addDays(weekStart, days));
  };

  const goToday = () => {
    setSelectedDate(toDateInput(new Date()));
  };

  const openStatsModal = () => {
    const { year, month } = getYearMonth(selectedDate);
    setStatsYear(year);
    setStatsMonth(month);
    setStatsUserId('');
    setMonthlyStats([]);
    setIsStatsModalOpen(true);
  };

  const openOvertimeModal = (workDate = selectedDate, userId = '') => {
    setOvertimeDraft({
      userId: isEmployee ? currentUserId : userId,
      workDate,
      startTime: '18:00',
      endTime: '20:00',
      reason: '',
    });
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
      const originalShiftId = schedule ? String(schedule.shiftId ?? `schedule-${schedule.id}`) : '';
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

  const handleDropSchedule = async (
    targetRow: WorkScheduleWeekUserDto,
    targetDate: string,
  ) => {
    if (!canManageSchedule || !draggedSchedule || !draggedSchedule.shiftId) return;

    setOpenShiftSelectKey(null);

    const sourceSchedule = draggedSchedule.sourceSchedule;
    if (!sourceSchedule) {
      setDraggedSchedule(null);
      setDragOverScheduleCell(null);
      return;
    }

    if (sourceSchedule.userId === targetRow.userId && sourceSchedule.workDate === targetDate) {
      setDraggedSchedule(null);
      setDragOverScheduleCell(null);
      return;
    }

    const previousWeekSchedule = cloneWeekSchedule(weekSchedule);
    const optimisticSchedule = {
      ...sourceSchedule,
      userId: targetRow.userId,
      userName: targetRow.userName,
      workDate: targetDate,
    };

    setWeekSchedule(upsertScheduleInWeek(weekSchedule, optimisticSchedule));
    setIsSaving(true);

    try {
      const savedSchedule = await scheduleService.updateWorkSchedule(sourceSchedule.id, {
        workDate: targetDate,
        shiftId: sourceSchedule.shiftId ?? null,
        shiftCode: sourceSchedule.shiftCode,
        shiftName: sourceSchedule.shiftName,
        startTime: sourceSchedule.startTime,
        endTime: sourceSchedule.endTime,
        endDayOffset: sourceSchedule.endDayOffset || 0,
        paidWorkingHours: sourceSchedule.paidWorkingHours || sourceSchedule.workingHours || 0,
        userId: targetRow.userId,
        status: sourceSchedule.status,
        note: sourceSchedule.note || null,
      });

      setWeekSchedule(upsertScheduleInWeek(useScheduleStore.getState().weekSchedule, savedSchedule));
      toast.success('Đã chuyển ca.');
      await reload();
    } catch (err: any) {
      setWeekSchedule(previousWeekSchedule);
      toast.error(err.message || 'Không thể chuyển ca.');
    } finally {
      setIsSaving(false);
      setDraggedSchedule(null);
      setDragOverScheduleCell(null);
    }
  };

  const discardCellDrafts = () => {
    setCellDrafts({});
    setOpenShiftSelectKey(null);
    setDraggedSchedule(null);
    setDragOverScheduleCell(null);
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
      setOpenShiftSelectKey(null);
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
    if (!panel.workDate) {
      toast.error('Vui lòng chọn ngày.');
      return;
    }
    if (panel.userIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhân viên.');
      return;
    }

    if (!panel.shiftId) {
      toast.error('Vui lòng chọn ca làm việc.');
      return;
    }

    const selectedShift = activeShifts.find(shift => String(shift.id) === panel.shiftId);
    const workingHours = selectedShift?.paidWorkingHours || selectedShift?.workingHours || panel.paidWorkingHours;
    if (workingHours <= 0) {
      toast.error('Số giờ tính công phải lớn hơn 0.');
      return;
    }

    const schedulePayload = {
      workDate: panel.workDate,
      shiftId: Number(panel.shiftId),
      note: panel.note || null,
    };

    const previousWeekSchedule = cloneWeekSchedule(weekSchedule);
    const previousMonthlySchedules = monthlySchedules.map(item => ({ ...item }));
    const previousPanel = panel;

    setIsSaving(true);

    try {
      if (panel.mode === 'edit' && panel.schedule) {
        const optimisticSchedule = buildOptimisticSchedule(
          panel.userIds[0],
          schedulePayload,
          panel.schedule.id,
          panel.schedule,
        );

        setWeekSchedule(upsertScheduleInWeek(weekSchedule, optimisticSchedule));
        setMonthlySchedules(current => current.map(item => (
          item.id === optimisticSchedule.id ? optimisticSchedule : item
        )));
        setPanel(null);

        const savedSchedule = await scheduleService.updateWorkSchedule(panel.schedule.id, {
          ...schedulePayload,
          userId: panel.userIds[0],
          status: panel.schedule.status,
        });
        setWeekSchedule(upsertScheduleInWeek(useScheduleStore.getState().weekSchedule, savedSchedule));
        setMonthlySchedules(current => current.map(item => (
          item.id === savedSchedule.id ? savedSchedule : item
        )));
        toast.success('Đã cập nhật lịch.');
      } else {
        const temporaryBaseId = -Date.now();
        const optimisticSchedules = panel.userIds.map((userId, index) => (
          buildOptimisticSchedule(userId, schedulePayload, temporaryBaseId - index)
        ));

        let nextWeekSchedule = weekSchedule;
        optimisticSchedules.forEach(schedule => {
          nextWeekSchedule = upsertScheduleInWeek(nextWeekSchedule, schedule);
        });
        setWeekSchedule(nextWeekSchedule);
        setMonthlySchedules(current => [...current, ...optimisticSchedules]);
        setPanel(null);

        const result = await scheduleService.batchCreateWorkSchedules({
          items: panel.userIds.map(userId => ({
            ...schedulePayload,
            userId,
          })),
        });

        let savedWeekSchedule = useScheduleStore.getState().weekSchedule;
        result.items.forEach((savedSchedule, index) => {
          savedWeekSchedule = replaceTemporaryScheduleInWeek(savedWeekSchedule, optimisticSchedules[index].id, savedSchedule);
        });
        setWeekSchedule(savedWeekSchedule);
        setMonthlySchedules(current => {
          const temporaryIds = new Set(optimisticSchedules.map(item => item.id));
          return [
            ...current.filter(item => !temporaryIds.has(item.id)),
            ...result.items,
          ];
        });
        toast.success('Đã thêm lịch.');
      }

      await reload();
    } catch (err: any) {
      setWeekSchedule(previousWeekSchedule);
      setMonthlySchedules(previousMonthlySchedules);
      setPanel(previousPanel);
      toast.error(err.message || 'Không thể lưu lịch.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!panel?.schedule) return;

    const previousWeekSchedule = cloneWeekSchedule(weekSchedule);
    const previousMonthlySchedules = monthlySchedules.map(item => ({ ...item }));
    const previousPanel = panel;
    const deletingScheduleId = panel.schedule.id;

    setIsSaving(true);

    try {
      const optimisticWeekSchedule = cloneWeekSchedule(weekSchedule);
      if (optimisticWeekSchedule) {
        optimisticWeekSchedule.users = optimisticWeekSchedule.users.map(user => ({
          ...user,
          schedules: user.schedules.filter(schedule => schedule.id !== deletingScheduleId),
        }));
      }
      setWeekSchedule(optimisticWeekSchedule);
      setMonthlySchedules(current => current.filter(schedule => schedule.id !== deletingScheduleId));
      setPanel(null);

      await scheduleService.deleteWorkSchedule(panel.schedule.id);
      toast.success('Đã xóa lịch.');
      await reload();
    } catch (err: any) {
      setWeekSchedule(previousWeekSchedule);
      setMonthlySchedules(previousMonthlySchedules);
      setPanel(previousPanel);
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

  const exportExcel = async () => {
    if (!reportYear || reportMonth < 1 || reportMonth > 12) {
      toast.error('Vui lòng chọn năm và tháng hợp lệ.');
      return;
    }

    setIsExportingOvertime(true);
    try {
      const result = await overtimeService.exportMonthlyReport({
        year: reportYear,
        month: reportMonth,
        userId: reportUserId || undefined,
      });

      const blob = base64ToBlob(
        result.data,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      const fallbackFileName = `bao_cao_tang_ca_${String(reportMonth).padStart(2, '0')}_${reportYear}.xlsx`;
      const fileName = result.fileName || fallbackFileName;

      downloadBlob(blob, fileName);
      setIsOvertimeExportModalOpen(false);
      toast.success(`Đã xuất báo cáo tháng ${reportMonth}/${reportYear}.`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể xuất báo cáo OT.');
    } finally {
      setIsExportingOvertime(false);
    }
  };

  const loadMonthlyStats = async () => {
    if (!statsYear || statsMonth < 1 || statsMonth > 12) {
      toast.error('Vui lòng chọn năm và tháng hợp lệ.');
      return;
    }

    setIsStatsLoading(true);
    try {
      const result = await scheduleService.getMonthlyStats({
        year: statsYear,
        month: statsMonth,
        userId: statsUserId || undefined,
      });
      setMonthlyStats(result);
      toast.success('Đã tải thống kê lịch.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải thống kê lịch.');
    } finally {
      setIsStatsLoading(false);
    }
  };

  const saveOvertime = async () => {
    if (!overtimeDraft) return;
    const overtimeUserId = isEmployee ? currentUserId : overtimeDraft.userId;
    if (!overtimeUserId) {
      toast.error('Vui lòng chọn nhân viên OT.');
      return;
    }
    if (!overtimeDraft.workDate || !overtimeDraft.startTime || !overtimeDraft.endTime) {
      toast.error('Vui lòng nhập đủ ngày và giờ OT.');
      return;
    }
    if (overtimeDraft.startTime >= overtimeDraft.endTime) {
      toast.error('Giờ kết thúc OT phải lớn hơn giờ bắt đầu.');
      return;
    }
    if (!overtimeDraft.reason.trim()) {
      toast.error('Vui lòng nhập lý do OT chi tiết.');
      return;
    }

    setIsSaving(true);
    try {
      await overtimeService.create({
        userId: overtimeUserId,
        workDate: overtimeDraft.workDate,
        startTime: toApiTime(overtimeDraft.startTime),
        endTime: toApiTime(overtimeDraft.endTime),
        reason: overtimeDraft.reason.trim(),
      });
      toast.success('Đã ghi nhận OT, đang chờ duyệt.');
      setOvertimeDraft(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Không thể ghi nhận OT.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderOvertimeBadges = (items: OvertimeRequestDto[]) => {
    if (items.length === 0) return null;

    return (
      <div className="w-full max-w-[118px] space-y-1">
        {items.map(item => (
          <span
            key={item.id}
            title={`${formatTime(item.startTime)} - ${formatTime(item.endTime)} | ${getOvertimeStatusLabel(item.status)} | ${item.reason}`}
            className={`block rounded border px-1.5 py-1 text-center text-[10px] font-black leading-tight ${getOvertimeStatusClass(item.status)}`}
          >
            OT {formatNumber(item.totalHours)}h
            <span className="block text-[9px] font-bold">{getOvertimeStatusLabel(item.status)}</span>
          </span>
        ))}
      </div>
    );
  };

  const renderShiftBadgeText = (code: string, title: string, hours: string, className = '') => {
    const glyph = getShiftGlyph(code);
    return (
      <span className={`block leading-tight ${className}`}>
        <span className="block truncate">{glyph ? `${glyph} ` : ''}{title}</span>
        <span className="mt-0.5 block truncate text-[9px] font-bold">{hours}</span>
      </span>
    );
  };

  const openScheduleNotePreview = (schedule: WorkScheduleDto) => {
    const note = schedule.note?.trim();
    if (!note) return;

    setScheduleNotePreview({
      title: `${getScheduleTitle(schedule)} · ${formatDate(schedule.workDate)}`,
      note,
    });
  };

  const getScheduleUserName = (schedule: WorkScheduleDto) => {
    return schedule.userName || scheduleUsers.find(user => user.id === schedule.userId)?.name || 'Chưa rõ';
  };

  const getScheduleRowForSchedule = (schedule: WorkScheduleDto): WorkScheduleWeekUserDto => {
    const existingRow = scheduleRows.find(row => row.userId === schedule.userId);

    if (existingRow) return existingRow;

    return {
      userId: schedule.userId,
      userName: getScheduleUserName(schedule),
      departmentName: null,
      avatarUrl: null,
      totalWorkingHours: 0,
      schedules: [schedule],
    };
  };

  const openScheduleContextMenu = (
    event: React.MouseEvent,
    schedule: WorkScheduleDto | undefined,
    user: WorkScheduleWeekUserDto,
    workDate = schedule?.workDate || weekStart,
    schedules = schedule ? [schedule] : getSchedulesForDate(user, workDate),
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const viewportPadding = 12;
    const menuWidth = 188;
    const menuItemCount = (schedules.length > 0 ? 1 : 0)
      + (canManageSchedule && schedule ? 1 : 0)
      + (canManageSchedule ? 1 : 0);
    const menuHeight = Math.max(menuItemCount, 1) * 40 + 8;
    const nextX = Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding);
    const nextY = Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding);

    setOpenShiftSelectKey(null);
    setScheduleContextMenu({
      x: Math.max(viewportPadding, nextX),
      y: Math.max(viewportPadding, nextY),
      schedule,
      schedules,
      user,
      workDate,
    });
  };

  const viewScheduleFromContextMenu = () => {
    if (!scheduleContextMenu) return;
    setScheduleViewPreview({
      title: `${scheduleContextMenu.schedules.length} ca trực`,
      userName: scheduleContextMenu.user.userName || (
        scheduleContextMenu.schedule ? getScheduleUserName(scheduleContextMenu.schedule) : 'Chưa rõ'
      ),
      date: formatDate(scheduleContextMenu.workDate),
      schedules: scheduleContextMenu.schedules,
    });
    setScheduleContextMenu(null);
  };

  const editScheduleFromContextMenu = () => {
    if (!scheduleContextMenu?.schedule) return;
    openEditPanel(scheduleContextMenu.schedule, scheduleContextMenu.user);
    setScheduleContextMenu(null);
  };

  const createScheduleFromContextMenu = () => {
    if (!scheduleContextMenu) return;
    openCreatePanel(scheduleContextMenu.workDate, scheduleContextMenu.user.userId);
    setScheduleContextMenu(null);
  };

  const renderScheduleNote = (schedule?: WorkScheduleDto, className = '') => {
    const note = schedule?.note?.trim();
    if (!schedule || !note) return null;

    return (
      <span
        role="button"
        tabIndex={0}
        title={note}
        onClick={event => {
          event.stopPropagation();
          openScheduleNotePreview(schedule);
        }}
        onKeyDown={event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          openScheduleNotePreview(schedule);
        }}
        className={`mt-1 block w-full max-w-full truncate rounded border border-warning/30 bg-warning-container px-1.5 py-0.5 text-left text-[9px] font-bold leading-tight text-on-warning-container shadow-sm cursor-pointer ${className}`}
      >
        Ghi chú: {note}
      </span>
    );
  };

  const getRowTotalHours = (row: WorkScheduleWeekUserDto) => {
    return (weekSchedule?.days || []).reduce((total, day) => {
      const schedules = getSchedulesForDate(row, day.date);
      const draft = cellDrafts[getCellKey(row.userId, day.date)];

      if (draft) {
        const draftShift = activeShifts.find(shift => String(shift.id) === draft.shiftId);
        return total + (draftShift?.paidWorkingHours || draftShift?.workingHours || 0);
      }

      return total + getSchedulesTotalHours(schedules);
    }, 0);
  };

  const renderShiftModeSelect = (
    row: WorkScheduleWeekUserDto,
    date: string,
    schedule: WorkScheduleDto | undefined,
    effectiveShiftId: string,
    _isCompact = false,
  ) => {
    const selectedShift = activeShifts.find(shift => String(shift.id) === effectiveShiftId);
    const cellKey = getCellKey(row.userId, date);
    const hasDraft = Boolean(cellDrafts[cellKey]);
    const isOpen = openShiftSelectKey === cellKey;
    const buttonClass = hasDraft
      ? 'border-primary bg-primary/10 text-primary'
      : selectedShift
        ? getShiftClass(selectedShift.code)
        : 'border-outline-variant bg-surface text-on-surface-variant';

    return (
      <div className="relative w-full">
        <button
          type="button"
          disabled={isSaving}
          draggable={canManageSchedule && Boolean(selectedShift) && !isSaving}
          title={selectedShift ? getShiftOptionDisplay(selectedShift) : 'Nghỉ'}
          onContextMenu={event => openScheduleContextMenu(event, schedule, row)}
          onClick={() => setOpenShiftSelectKey(current => current === cellKey ? null : cellKey)}
          onDragStart={event => {
            if (!selectedShift || isSaving) return;
            setDraggedSchedule({
              sourceUserId: row.userId,
              sourceWorkDate: date,
              sourceSchedule: schedule,
              shiftId: String(selectedShift.id),
            });
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', `${row.userId}_${date}_${selectedShift.id}`);
          }}
          onDragEnd={() => {
            setDraggedSchedule(null);
            setDragOverScheduleCell(null);
          }}
          className={`min-h-[56px] w-full rounded border px-2 py-1 text-center text-[11px] font-black outline-none disabled:opacity-60 ${
            selectedShift && canManageSchedule ? 'cursor-grab active:cursor-grabbing' : ''
          } ${buttonClass}`}
        >
          {selectedShift ? (
            <>
              {renderShiftBadgeText(selectedShift.code, getShiftTitle(selectedShift), getShiftHours(selectedShift))}
              {renderScheduleNote(schedule)}
            </>
          ) : (
            <span>Nghỉ</span>
          )}
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto rounded-md border border-outline-variant bg-surface shadow-lg">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                stageCellShift(row, date, schedule, '');
                setOpenShiftSelectKey(null);
              }}
              className="w-full px-2 py-2 text-center text-xs font-bold text-on-surface-variant hover:bg-surface-2 disabled:opacity-60"
            >
              Nghỉ
            </button>
            {activeShifts.map(shift => (
              <button
                key={shift.id}
                type="button"
                disabled={isSaving}
                title={getShiftOptionDisplay(shift)}
                onClick={() => {
                  stageCellShift(row, date, schedule, String(shift.id));
                  setOpenShiftSelectKey(null);
                }}
                className={`w-full border-t px-2 py-2 text-center text-[11px] font-black hover:brightness-95 disabled:opacity-60 ${getShiftClass(shift.code)}`}
              >
                {renderShiftBadgeText(shift.code, getShiftTitle(shift), getShiftHours(shift))}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderManagedScheduleCard = (
    row: WorkScheduleWeekUserDto,
    date: string,
    schedule: WorkScheduleDto,
    compact = false,
  ) => {
    const isDragging = draggedSchedule?.sourceSchedule?.id === schedule.id;

    return (
      <button
        key={schedule.id}
        type="button"
        disabled={isSaving}
        draggable={canManageSchedule && !isSaving}
        title={`${getScheduleTitle(schedule)} | ${getScheduleHours(schedule)}`}
        onClick={() => openEditPanel(schedule, row)}
        onContextMenu={event => openScheduleContextMenu(event, schedule, row)}
        onDragStart={event => {
          if (isSaving) return;
          setDraggedSchedule({
            sourceUserId: row.userId,
            sourceWorkDate: date,
            sourceSchedule: schedule,
            shiftId: String(schedule.shiftId ?? `schedule-${schedule.id}`),
          });
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', `${row.userId}_${date}_${schedule.id}`);
        }}
        onDragEnd={() => {
          setDraggedSchedule(null);
          setDragOverScheduleCell(null);
        }}
        className={`relative block w-full rounded border text-left font-black leading-tight outline-none transition ${
          compact ? 'px-2 py-1.5 text-[11px]' : 'px-2 py-1 text-[10px]'
        } ${getShiftClass(schedule.shiftCode)} ${
          isDragging ? 'opacity-40 ring-2 ring-primary/40' : ''
        } ${canManageSchedule ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        <Edit2 className="absolute right-1.5 top-1.5 h-3 w-3 text-on-surface-variant" />
        {renderShiftBadgeText(schedule.shiftCode, getScheduleTitle(schedule), getScheduleHours(schedule), 'pr-5')}
        {renderScheduleNote(schedule, 'pr-5')}
      </button>
    );
  };

  const renderDesktopScheduleCard = (
    row: WorkScheduleWeekUserDto,
    date: string,
    schedule: WorkScheduleDto,
  ) => {
    const isDragging = draggedSchedule?.sourceSchedule?.id === schedule.id;

    return (
      <div
        key={schedule.id}
        draggable={canManageSchedule && !isSaving}
        title={`${getScheduleTitle(schedule)} | ${getScheduleHours(schedule)}`}
        onContextMenu={event => openScheduleContextMenu(event, schedule, row)}
        onDragStart={event => {
          if (isSaving) return;
          setDraggedSchedule({
            sourceUserId: row.userId,
            sourceWorkDate: date,
            sourceSchedule: schedule,
            shiftId: String(schedule.shiftId ?? `schedule-${schedule.id}`),
          });
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', `${row.userId}_${date}_${schedule.id}`);
        }}
        onDragEnd={() => {
          setDraggedSchedule(null);
          setDragOverScheduleCell(null);
        }}
        className={`block w-full rounded border px-2 py-1 text-left text-[10px] font-black leading-tight outline-none transition ${getShiftClass(schedule.shiftCode)} ${
          isDragging ? 'opacity-40 ring-2 ring-primary/40' : ''
        } ${canManageSchedule ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        <span className="block truncate">{schedule.shiftName || schedule.shiftCode}</span>
        <span className="mt-0.5 block truncate text-[9px] font-bold">{getScheduleHours(schedule)}</span>
        {renderScheduleNote(schedule)}
      </div>
    );
  };

  const renderMobileScheduleCell = (row: WorkScheduleWeekUserDto, date: string) => {
    const schedules = getSchedulesForDate(row, date);
    const schedule = schedules[0];
    const cellKey = getCellKey(row.userId, date);
    const draft = cellDrafts[cellKey];
    const effectiveShiftId = draft ? draft.shiftId : schedule?.shiftId ? String(schedule.shiftId) : '';
    const effectiveShift = activeShifts.find(shift => String(shift.id) === effectiveShiftId);
    const hasDraft = Boolean(draft);
    const cellOvertimeRequests = overtimeByCell.get(cellKey) || [];
    const isDragOver = dragOverScheduleCell === cellKey;

    return (
      <div
        className={`flex min-w-0 flex-1 flex-col items-end gap-2 rounded-lg border border-dashed p-1 text-right transition-colors ${
          hasDraft ? 'text-primary' : ''
        } ${isDragOver ? 'border-primary bg-primary/10' : 'border-transparent'}`}
        onDragOver={event => {
          if (!canManageSchedule || !draggedSchedule) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOverScheduleCell(cellKey);
        }}
        onDragLeave={() => setDragOverScheduleCell(current => (current === cellKey ? null : current))}
        onDrop={event => {
          event.preventDefault();
          void handleDropSchedule(row, date);
        }}
      >
        {canManageSchedule ? (
          <div className="w-full space-y-2">
            {schedules.length > 0 ? (
              schedules.map(item => renderManagedScheduleCard(row, date, item, true))
            ) : (
              <span className="block text-sm italic font-semibold text-on-surface-variant">Nghỉ</span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => openCreatePanel(date, row.userId)}
              className="w-full rounded border border-dashed border-outline-variant px-2 py-1.5 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-60"
            >
              + Thêm ca
            </button>
          </div>
        ) : !draft && schedules.length > 0 ? (
          <div className="w-full space-y-2">
            {schedules.map(item => (
              <button
                key={item.id}
                type="button"
                disabled={isSaving}
                onClick={() => canManageSchedule ? openEditPanel(item, row) : undefined}
                onContextMenu={event => openScheduleContextMenu(event, item, row)}
                className={`relative w-full rounded border px-3 py-2 text-left text-xs font-black leading-tight ${getShiftClass(item.shiftCode)} ${
                  canManageSchedule ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {renderShiftBadgeText(item.shiftCode, getScheduleTitle(item), getScheduleHours(item), 'pr-7')}
                {renderScheduleNote(item, 'pr-7')}
                {canManageSchedule && <Edit2 className="absolute right-2 top-2 h-3.5 w-3.5 text-on-surface-variant" />}
              </button>
            ))}
          </div>
        ) : effectiveShift ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => canManageSchedule && schedule ? openEditPanel(schedule, row) : undefined}
            onContextMenu={event => openScheduleContextMenu(event, schedule, row)}
            className={`relative w-full rounded border px-3 py-2 text-left text-xs font-black leading-tight ${getShiftClass(effectiveShift.code)} ${
              canManageSchedule ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {renderShiftBadgeText(effectiveShift.code, getShiftTitle(effectiveShift), getShiftHours(effectiveShift), 'pr-7')}
            {renderScheduleNote(schedule, 'pr-7')}
            {hasDraft && <span className="mt-0.5 block text-[10px] font-black text-primary">Chưa lưu</span>}
            {canManageSchedule && schedule && <Edit2 className="absolute right-2 top-2 h-3.5 w-3.5 text-on-surface-variant" />}
          </button>
        ) : (
          <div className="w-full text-right">
            <span className={`text-sm italic font-semibold ${hasDraft ? 'text-primary' : 'text-on-surface-variant'}`}>
              Nghỉ{hasDraft ? ' - chưa lưu' : ''}
            </span>
          </div>
        )}

        {renderOvertimeBadges(cellOvertimeRequests)}
      </div>
    );
  };

  const renderScheduleCell = (row: WorkScheduleWeekUserDto, date: string) => {
    const schedules = getSchedulesForDate(row, date);
    const cellKey = getCellKey(row.userId, date);
    const draft = cellDrafts[cellKey];
    const hasDraft = Boolean(draft);
    const cellOvertimeRequests = overtimeByCell.get(cellKey) || [];
    const isDragOver = dragOverScheduleCell === cellKey;

    if (canManageSchedule) {
      const visibleSchedules = schedules.slice(0, 2);
      const extraCount = schedules.length - visibleSchedules.length;

      return (
        <div
          key={date}
          className={`min-h-[112px] w-full border border-dashed p-2 flex flex-col items-center justify-center gap-1.5 transition-colors ${
            hasDraft ? 'bg-primary/10' : ''
          } ${isDragOver ? 'border-primary bg-primary/10' : 'border-transparent'}`}
          onDragOver={event => {
            if (!draggedSchedule) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverScheduleCell(cellKey);
          }}
          onDragLeave={() => setDragOverScheduleCell(current => (current === cellKey ? null : current))}
          onDrop={event => {
            event.preventDefault();
            void handleDropSchedule(row, date);
          }}
          onContextMenu={event => openScheduleContextMenu(event, undefined, row, date, schedules)}
        >
          <div className="w-full max-w-[128px] space-y-1.5">
            {visibleSchedules.length > 0 ? (
              visibleSchedules.map(item => renderDesktopScheduleCard(row, date, item))
            ) : (
              <div className="rounded border border-dashed border-outline-variant px-2 py-4 text-center text-xs italic font-semibold text-on-surface-variant">
                Nghỉ
              </div>
            )}
            {extraCount > 0 && (
              <button
                type="button"
                onClick={() => setScheduleViewPreview({
                  title: `${schedules.length} ca trực`,
                  userName: row.userName,
                  date: formatDate(date),
                  schedules,
                })}
                className="w-full rounded border border-dashed border-outline-variant px-2 py-1 text-center text-[9px] font-bold text-on-surface-variant hover:border-primary hover:text-primary"
              >
                +{extraCount} ca khác
              </button>
            )}
          </div>
          {hasDraft && <span className="text-[9px] font-bold text-primary">Chưa lưu</span>}
          {schedules.length === 0 && draggedSchedule && (
            <span className="text-[9px] font-bold text-on-surface-variant">Thả ca vào đây</span>
          )}
          {renderOvertimeBadges(cellOvertimeRequests)}
        </div>
      );
    }

    if (schedules.length === 0) {
      return (
        <div
          key={date}
          className="h-full min-h-[112px] w-full p-2 text-center text-xs italic font-semibold text-on-surface-variant flex flex-col items-center justify-center gap-2"
        >
          <span>Nghỉ</span>
          {renderOvertimeBadges(cellOvertimeRequests)}
        </div>
      );
    }

    const visibleSchedules = schedules.slice(0, 2);
    const extraCount = schedules.length - visibleSchedules.length;

    return (
      <div
        key={date}
        className="h-full min-h-[112px] w-full flex flex-col items-center justify-center gap-1.5 p-2"
        onContextMenu={event => openScheduleContextMenu(event, undefined, row, date, schedules)}
      >
        <div className="w-full max-w-[118px] space-y-1.5">
          {visibleSchedules.map(item => (
            <div
              key={item.id}
              onContextMenu={event => openScheduleContextMenu(event, item, row)}
              className={`block w-full rounded border px-1.5 py-1 text-left text-[10px] font-black leading-tight ${getShiftClass(item.shiftCode)}`}
            >
              <span className="block truncate">{item.shiftName || item.shiftCode}</span>
              <span className="mt-0.5 block truncate text-[9px] font-bold">{getScheduleHours(item)}</span>
              {renderScheduleNote(item)}
            </div>
          ))}
          {extraCount > 0 && (
            <button
              type="button"
              onClick={() => setScheduleViewPreview({
                title: `${schedules.length} ca trực`,
                userName: row.userName,
                date: formatDate(date),
                schedules,
              })}
              className="w-full rounded border border-dashed border-outline-variant px-2 py-1 text-center text-[9px] font-bold text-on-surface-variant hover:border-primary hover:text-primary"
            >
              +{extraCount} ca khác
            </button>
          )}
        </div>
        {renderOvertimeBadges(cellOvertimeRequests)}
      </div>
    );
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-112px)] min-h-[calc(100dvh-88px)] lg:min-h-[720px] -m-3 sm:-m-4 lg:-m-6 bg-surface text-on-surface animate-fadeIn">
      <div className="h-full flex flex-col">
        <div className="border-b border-outline-variant px-4 lg:px-6 py-4 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-11 max-w-full rounded-md border border-outline-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => moveWeek(-7)}
                  className="w-11 flex items-center justify-center border-r border-outline-variant hover:bg-surface-2 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveWeek(7)}
                  className="w-11 flex items-center justify-center border-r border-outline-variant hover:bg-surface-2 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="px-3 sm:px-4 flex items-center gap-3 text-sm font-bold min-w-[220px] sm:min-w-[240px]">
                  {scheduleViewMode === 'month'
                    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
                    : `${formatDate(weekStart)} - ${formatDate(weekEnd)}`}
                  <CalendarDays className="w-4 h-4 ml-auto" />
                </div>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="h-11 px-4 rounded-md border border-outline-variant bg-surface text-sm font-semibold hover:bg-surface-2 cursor-pointer"
              >
                Hôm nay
              </button>

              <select
                value={departmentFilter}
                onChange={event => setDepartmentFilter(event.target.value)}
                className="h-11 w-full sm:w-auto sm:min-w-[190px] rounded-md border border-outline-variant bg-surface px-3 text-sm cursor-pointer"
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
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
              onClick={() => setIsOvertimeExportModalOpen(true)}
              disabled={isExportingOvertime}
              className="btn-primary h-11"
            >
              {isExportingOvertime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Xuất Excel
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {scheduleViewMode === 'week' && <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCurrentWeek}
                disabled={!canManageSchedule}
                className="h-11 px-4 rounded-md border border-outline-variant bg-surface text-sm font-semibold inline-flex items-center gap-2 hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4" />
                Sao chép tuần
              </button>
              <button
                type="button"
                onClick={deleteAllCurrentWeekSchedules}
                disabled={!canManageSchedule || isSaving || currentWeekScheduleIds.length === 0}
                className="h-11 px-4 rounded-md border border-error/30 bg-error-container text-error text-sm font-semibold inline-flex items-center gap-2 hover:brightness-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Xóa tất cả lịch
              </button>
              <button
                type="button"
                onClick={() => setIsWeeklySuggestionOpen(true)}
                disabled={!canManageSchedule}
                className="h-11 px-4 rounded-md border border-outline-variant bg-surface text-sm font-semibold inline-flex items-center gap-2 hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Đề xuất lịch tuần
              </button>
            </div>}

            <div className="ml-auto inline-flex shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface">
              <button
                type="button"
                onClick={() => setScheduleViewMode('week')}
                className={`h-11 px-5 text-sm inline-flex items-center gap-2 border-r transition-colors ${
                  scheduleViewMode === 'week'
                    ? 'font-bold border-primary bg-primary text-on-primary shadow-sm'
                    : 'font-semibold border-outline-variant bg-surface text-on-surface hover:bg-surface-2'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => setScheduleViewMode('month')}
                className={`h-11 px-5 text-sm inline-flex items-center gap-2 cursor-pointer transition-colors ${
                  scheduleViewMode === 'month'
                    ? 'font-bold bg-primary text-on-primary shadow-sm'
                    : 'font-semibold bg-surface text-on-surface hover:bg-surface-2'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Theo tháng
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 min-h-0 grid grid-cols-1 ${panel ? 'xl:grid-cols-[1fr_320px]' : ''}`}>
          <div className="min-w-0 overflow-auto">
            {scheduleViewMode === 'month' ? (
              <div className="h-full min-h-[460px] w-full p-2 lg:p-3">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface">
                  <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-2">
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(dayName => (
                      <div key={dayName} className="border-r border-outline-variant px-1.5 py-2 text-center text-[11px] font-black uppercase tracking-wide text-on-surface-variant last:border-r-0">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {isMonthLoading ? (
                    <div className="py-20 text-center text-on-surface-variant font-semibold">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                      Đang tải lịch làm việc theo tháng...
                    </div>
                  ) : (
                    <div
                      className="grid flex-1 grid-cols-7"
                      style={{ gridTemplateRows: `repeat(${monthView.rowCount}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: monthView.leadingBlankCount }, (_, index) => (
                        <div key={`blank-${index}`} className="border-r border-b border-outline-variant bg-surface-2/60" />
                      ))}
                      {monthView.days.map(day => (
                        <div
                          key={day.dateKey}
                          className={`min-h-0 overflow-y-auto border-r border-b border-outline-variant p-1.5 ${
                            day.dateKey === today ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'bg-surface'
                          }`}
                        >
                          <div className="mb-1 flex h-6 items-center justify-between gap-1">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                              day.dateKey === today ? 'bg-primary text-on-primary' : 'text-on-surface'
                            }`}>
                              {day.date.getDate()}
                            </span>
                            {canManageSchedule && (
                              <button
                                type="button"
                                onClick={() => openCreatePanel(day.dateKey)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                                aria-label={`Thêm lịch ngày ${formatDate(day.dateKey)}`}
                              >
                                +
                              </button>
                            )}
                          </div>

                          {day.shiftGroups.length > 0 && (
                            <div className="space-y-1">
                              {day.shiftGroups.map(group => (
                                <div
                                  key={`${day.dateKey}-${group.shiftId ?? group.shiftCode}`}
                                  className={`rounded border px-1.5 py-1 text-[10px] leading-3 ${getShiftClass(group.shiftCode)}`}
                                  title={`${group.shiftName || group.shiftCode}: ${group.schedules.map(schedule =>
                                    schedule.userName || scheduleUsers.find(user => user.id === schedule.userId)?.name || 'Chưa rõ',
                                  ).join(', ')}`}
                                >
                                  <p className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                                    <span className="font-black">{group.shiftName || group.shiftCode}:</span>
                                    {group.schedules.map(schedule => (
                                      <button
                                        key={schedule.id}
                                        type="button"
                                        onContextMenu={event => openScheduleContextMenu(event, schedule, getScheduleRowForSchedule(schedule))}
                                        onClick={() => canManageSchedule ? openEditPanel(schedule, getScheduleRowForSchedule(schedule)) : undefined}
                                        className="min-w-0 max-w-full truncate rounded px-0.5 text-left font-semibold hover:bg-surface/50"
                                        title={getScheduleUserName(schedule)}
                                      >
                                        {getScheduleUserName(schedule)}
                                      </button>
                                    ))}
                                  </p>
                                  {group.schedules.some(schedule => schedule.note?.trim()) && (
                                    <div className="mt-1 space-y-0.5">
                                      {group.schedules
                                        .filter(schedule => schedule.note?.trim())
                                        .map(schedule => {
                                          const userName = schedule.userName || scheduleUsers.find(user => user.id === schedule.userId)?.name || 'Chưa rõ';

                                          return (
                                            <button
                                              key={`${schedule.id}-note`}
                                              type="button"
                                              onClick={() => openScheduleNotePreview(schedule)}
                                              title={schedule.note || ''}
                                              className="block w-full truncate rounded border border-warning/30 bg-warning-container px-1 py-0.5 text-left text-[9px] font-bold text-on-warning-container hover:brightness-95"
                                            >
                                              {userName}: {schedule.note}
                                            </button>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <>
            <div className="lg:hidden divide-y divide-outline-variant/40">
              {isLoading ? (
                <div className="py-14 text-center text-on-surface-variant font-semibold">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                  Đang tải lịch làm việc...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-14 text-center text-on-surface-variant font-semibold">
                  Không có lịch phù hợp bộ lọc.
                </div>
              ) : (
                filteredRows.map(row => (
                  <article key={row.userId} className="bg-surface px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt={row.userName} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-surface-2 text-on-surface-variant flex items-center justify-center">
                            <UserRound className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-on-surface">{row.userName}</p>
                          <p className="truncate text-xs font-semibold text-on-surface-variant">{row.departmentName || 'Chưa có phòng ban'}</p>
                        </div>
                      </div>
                      {(() => {
                        const rowHours = getRowTotalHours(row);
                        const overLimit = rowHours > 48;
                        return (
                          <div className={`shrink-0 rounded-md px-3 py-2 text-right ${overLimit ? 'bg-error-container' : 'bg-primary/10'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${overLimit ? 'text-error' : 'text-primary'}`}>Tổng</p>
                            <p className={`text-sm font-black ${overLimit ? 'text-error' : 'text-primary'}`}>{rowHours.toFixed(1)}h</p>
                            {overLimit && <p className="text-[9px] font-bold text-error">⚠ vượt 48h</p>}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="overflow-hidden rounded-lg border border-outline-variant">
                      {(weekSchedule?.days || []).map(day => (
                        <div key={day.date} className="flex gap-3 border-b border-outline-variant px-3 py-3 last:border-b-0">
                          <button
                            type="button"
                            onClick={() => openCreatePanel(day.date, row.userId)}
                            disabled={!canManageSchedule}
                            className={`w-[74px] shrink-0 rounded-md px-2 py-2 text-left disabled:cursor-default ${
                              day.date === today ? 'bg-secondary-container ring-1 ring-primary' : 'bg-surface-2'
                            }`}
                          >
                            <span className="block text-xs font-black text-on-surface">
                              {day.dayName.replace('Thứ ', 'T')}
                              {day.date === today && <span className="ml-1 text-[9px] font-bold text-primary">• Hôm nay</span>}
                            </span>
                            <span className="block text-[11px] font-semibold text-on-surface-variant">{formatShortDate(day.date)}</span>
                          </button>
                          {renderMobileScheduleCell(row, day.date)}
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>

            <table className="hidden lg:table w-max min-w-[1340px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <th className="w-[190px] border border-outline-variant px-4 py-5 text-center text-sm font-semibold">
                    Nhân viên
                  </th>
                  {(weekSchedule?.days || []).map(day => (
                    <th
                      key={day.date}
                      className={`w-[150px] border border-outline-variant px-2 py-4 text-center font-semibold ${
                        day.date === today ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <span className="block text-base">
                        {day.dayName.replace('Thứ ', 'T')}
                        {day.date === today && <span className="ml-1 align-middle text-[10px] font-bold">• Hôm nay</span>}
                      </span>
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
                    <td colSpan={9} className="border border-outline-variant py-16 text-center text-on-surface-variant font-semibold">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                      Đang tải lịch làm việc...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-outline-variant py-16 text-center text-on-surface-variant font-semibold">
                      Không có lịch phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => (
                    <tr key={row.userId} className="bg-surface">
                      <td className="border border-outline-variant px-4 py-4">
                        <div className="flex items-center gap-3">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt={row.userName} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-surface-2 text-on-surface-variant flex items-center justify-center text-xs font-black">
                              <UserRound className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface truncate">{row.userName}</p>
                            <p className="text-xs text-on-surface-variant truncate">{row.departmentName || 'Chưa có phòng ban'}</p>
                          </div>
                        </div>
                      </td>
                      {(weekSchedule?.days || []).map(day => (
                        <td
                          key={day.date}
                          className={`border border-outline-variant p-0 align-middle ${
                            day.date === today ? 'bg-primary/10' : ''
                          }`}
                        >
                          {renderScheduleCell(row, day.date)}
                        </td>
                      ))}
                      {(() => {
                        const rowHours = getRowTotalHours(row);
                        const overLimit = rowHours > 48;
                        return (
                          <td
                            className={`border border-outline-variant text-center text-base font-semibold ${
                              overLimit ? 'text-error' : ''
                            }`}
                            title={overLimit ? 'Vượt 48h/tuần (giới hạn giờ làm việc)' : undefined}
                          >
                            {rowHours.toFixed(1)}h
                            {overLimit && <span className="block text-[10px] font-bold">⚠ vượt mức</span>}
                          </td>
                        );
                      })()}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:flex lg:flex-wrap">
                <button
                  type="button"
                  onClick={() => openOvertimeModal(selectedDate)}
                  className="btn-secondary h-10 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <Clock3 className="w-4 h-4" />
                  Ghi OT
                </button>
              </div>

              {hasCellDrafts && (
                <div className="flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold text-primary">
                    {Object.keys(cellDrafts).length} thay đổi chưa lưu
                  </span>
                  <button
                    type="button"
                    onClick={discardCellDrafts}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-md border border-outline-variant text-sm font-semibold hover:bg-surface-2 cursor-pointer disabled:opacity-60"
                  >
                    Hủy thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={submitCellDrafts}
                    disabled={isSaving}
                    className="btn-primary h-10"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}

              <div className="rounded-md bg-surface-2 px-3 py-2 text-left lg:text-right">
                <p className="text-base font-bold">
                  Tổng giờ của tuần:
                  <span className="ml-3">{visibleTotalWorkingHours.toFixed(1)}h</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-1">(Tính theo giờ làm việc của shift)</p>
              </div>
            </div>

            <p className="px-4 pb-5 text-sm text-on-surface-variant">
              {canManageSchedule
                ? 'Click vào ca để chỉnh sửa, hoặc kéo-thả từng ca sang ô khác để đổi nhanh. Một nhân viên có thể có nhiều ca trong ngày nếu không vượt giới hạn giờ.'
                : 'Bạn chỉ có quyền xem, tìm kiếm và lọc lịch làm việc.'}
            </p>
            </>
            )}
          </div>

          {panel && (
            <aside className="border-t xl:border-t-0 xl:border-l border-outline-variant bg-surface p-4 lg:p-5 overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{panel.mode === 'edit' ? 'Sửa lịch' : 'Thêm lịch'}</h3>
                  <button type="button" onClick={() => setPanel(null)} className="p-1 rounded hover:bg-surface-2 cursor-pointer">
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
                  Ca làm việc
                  <select
                    value={panel.shiftId}
                    title={panel.shiftId ? `${getShiftTitle({ code: panel.shiftCode, name: panel.shiftName })} | ${getShiftHours({ startTime: panel.startTime, endTime: panel.endTime })}` : 'Chọn ca'}
                    onChange={event => {
                      const nextShift = activeShifts.find(shift => String(shift.id) === event.target.value);
                      if (nextShift) applyShiftToPanel(nextShift);
                    }}
                    className="mt-2 h-10 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm"
                  >
                    <option value="">Chọn ca</option>
                    {activeShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {getShiftOptionDisplay(shift)} - {formatNumber(shift.paidWorkingHours || shift.workingHours || 0)}h
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <label className="block text-sm font-medium">Nhân viên</label>
                  {panel.mode === 'create' && (
                    <div className="relative mt-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
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
                      <div className="px-3 py-6 text-center text-sm text-on-surface-variant">Không có nhân viên</div>
                    ) : (
                      visibleUsers.map(user => {
                        const checked = panel.userIds.includes(user.id);
                        return (
                          <label key={user.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-2">
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
                  Ghi chú ca trực
                  <textarea
                    value={panel.note}
                    onChange={event => setPanel(current => current ? { ...current, note: event.target.value } : current)}
                    placeholder="Nhập ghi chú riêng cho ca trực này..."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-md border border-outline-variant px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={savePanel}
                    disabled={isSaving}
                    className="btn-primary h-10"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    disabled={isSaving}
                    className="h-10 rounded-md border border-outline-variant text-sm font-semibold hover:bg-surface-2 cursor-pointer disabled:opacity-60"
                  >
                    Hủy
                  </button>
                </div>

                {panel.mode === 'edit' && (
                  <button
                    type="button"
                    onClick={deleteSchedule}
                    disabled={isSaving}
                    className="w-full h-10 rounded-md border border-error/30 bg-error-container text-error text-sm font-bold hover:brightness-95 cursor-pointer disabled:opacity-60"
                  >
                    Xóa lịch này
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {isStatsModalOpen && (
        <div className="modal-overlay">
          <div className="w-full max-w-5xl rounded-lg border border-outline-variant bg-surface shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Thống kê lịch làm việc</h3>
                <p className="text-xs text-on-surface-variant mt-1">Xem thống kê theo năm, tháng và nhân viên.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="block text-sm font-semibold">
                  Năm
                  <input
                    type="number"
                    value={statsYear}
                    min={2020}
                    max={2100}
                    onChange={event => setStatsYear(Number(event.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Tháng
                  <input
                    type="number"
                    value={statsMonth}
                    min={1}
                    max={12}
                    onChange={event => setStatsMonth(Number(event.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold sm:col-span-2">
                  Nhân viên
                  <select
                    value={statsUserId}
                    onChange={event => setStatsUserId(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {scheduleUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={loadMonthlyStats}
                  disabled={isStatsLoading}
                  className="btn-primary h-10"
                >
                  {isStatsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  Xem thống kê
                </button>
              </div>

              {monthlyStats.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-md border border-outline-variant bg-surface-2 p-4">
                      <p className="text-xs font-semibold text-on-surface-variant">Tổng lịch</p>
                      <p className="mt-2 text-2xl font-black text-on-surface">{formatNumber(monthlyStatsSummary.totalSchedules)}</p>
                    </div>
                    <div className="rounded-md border border-outline-variant bg-surface-2 p-4">
                      <p className="text-xs font-semibold text-on-surface-variant">Tổng giờ</p>
                      <p className="mt-2 text-2xl font-black text-success">{formatNumber(monthlyStatsSummary.totalPlannedHours)}h</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-outline-variant overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="bg-surface-2 text-xs uppercase tracking-wider text-on-surface-variant">
                          <th className="px-4 py-3 text-left">Nhân viên</th>
                          <th className="px-4 py-3 text-right">Tổng giờ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {monthlyStatsRows.map(item => (
                          <tr key={item.userId} className="hover:bg-surface-2">
                            <td className="px-4 py-3">
                              <span className="block font-bold text-on-surface">{item.userFullName}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-base font-black text-success">{formatNumber(item.totalPlannedHours)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-outline-variant py-10 text-center text-sm font-semibold text-on-surface-variant">
                  Chọn điều kiện và bấm Xem thống kê.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isOvertimeExportModalOpen && (
        <div className="modal-overlay">
          <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Xuất báo cáo tháng</h3>
                <p className="text-xs text-on-surface-variant mt-1">Chọn tháng, năm và nhân viên để xuất file Excel.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOvertimeExportModalOpen(false)}
                disabled={isExportingOvertime}
                className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer disabled:opacity-60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block text-sm font-semibold">
                Năm
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={reportYear}
                  onChange={event => setReportYear(Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm"
                />
              </label>
              <label className="block text-sm font-semibold">
                Tháng
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={reportMonth}
                  onChange={event => setReportMonth(Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm"
                />
              </label>
              <label className="block text-sm font-semibold">
                Nhân viên
                <select
                  value={reportUserId}
                  onChange={event => setReportUserId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
                >
                  <option value="">Tất cả</option>
                  {scheduleUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOvertimeExportModalOpen(false)}
                  disabled={isExportingOvertime}
                  className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface-2 cursor-pointer disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={isExportingOvertime}
                  className="btn-primary h-10"
                >
                  {isExportingOvertime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Xuất báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {overtimeDraft && (
        <div className="modal-overlay">
          <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Ghi OT</h3>
                <p className="text-xs text-on-surface-variant mt-1">OT sau khi tạo sẽ ở trạng thái chờ duyệt.</p>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeDraft(null)}
                className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!isEmployee && <label className="block text-sm font-semibold">
                Nhân viên
                <select
                  value={overtimeDraft.userId}
                  onChange={event => setOvertimeDraft(current => current ? { ...current, userId: event.target.value } : current)}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                >
                  <option value="">Chọn nhân viên</option>
                  {scheduleUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>}

              <label className="block text-sm font-semibold">
                Ngày OT
                <input
                  type="date"
                  value={overtimeDraft.workDate}
                  onChange={event => setOvertimeDraft(current => current ? { ...current, workDate: event.target.value } : current)}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Giờ bắt đầu
                  <input
                    type="time"
                    value={overtimeDraft.startTime}
                    onChange={event => setOvertimeDraft(current => current ? { ...current, startTime: event.target.value } : current)}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Giờ kết thúc
                  <input
                    type="time"
                    value={overtimeDraft.endTime}
                    onChange={event => setOvertimeDraft(current => current ? { ...current, endTime: event.target.value } : current)}
                    className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold">
                Lý do chi tiết
                <textarea
                  value={overtimeDraft.reason}
                  onChange={event => setOvertimeDraft(current => current ? { ...current, reason: event.target.value } : current)}
                  rows={4}
                  placeholder="Nhập lý do OT..."
                  className="mt-1 w-full resize-none rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-primary"
                />
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOvertimeDraft(null)}
                  className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface-2 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveOvertime}
                  disabled={isSaving}
                  className="btn-primary h-10"
                >
                  {isSaving ? 'Đang lưu...' : 'Ghi OT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleContextMenu && (
        <div
          className="fixed z-[60] w-44 overflow-hidden rounded-lg border border-outline-variant bg-surface py-1 text-sm shadow-xl"
          style={{ left: scheduleContextMenu.x, top: scheduleContextMenu.y }}
          onClick={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
        >
          {scheduleContextMenu.schedules.length > 0 && (
            <button
              type="button"
              onClick={viewScheduleFromContextMenu}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-on-surface-variant hover:bg-surface-2"
            >
              <Clock3 className="h-4 w-4 text-on-surface-variant" />
              Xem tất cả lịch
            </button>
          )}
          {canManageSchedule && scheduleContextMenu.schedule && (
            <button
              type="button"
              onClick={editScheduleFromContextMenu}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-on-surface-variant hover:bg-surface-2"
            >
              <Edit2 className="h-4 w-4 text-on-surface-variant" />
              Chỉnh sửa
            </button>
          )}
          {canManageSchedule && (
            <button
              type="button"
              onClick={createScheduleFromContextMenu}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-on-surface-variant hover:bg-surface-2"
            >
              <Plus className="h-4 w-4 text-on-surface-variant" />
              Thêm ca
            </button>
          )}
        </div>
      )}

      {scheduleViewPreview && (
        <div className="modal-overlay">
          <div className="w-full max-w-md rounded-lg border border-outline-variant bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-on-surface">Thông tin ca trực</h3>
                <p className="mt-1 truncate text-xs text-on-surface-variant">{scheduleViewPreview.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleViewPreview(null)}
                className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Nhân viên</p>
                <p className="mt-1 font-bold text-on-surface">{scheduleViewPreview.userName}</p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Ngày</p>
                <p className="mt-1 font-bold text-on-surface">{scheduleViewPreview.date}</p>
              </div>
              <div className="space-y-2">
                {scheduleViewPreview.schedules.map(item => (
                  <div key={item.id} className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-3">
                    <p className="font-bold text-on-surface">{item.shiftName || item.shiftCode}</p>
                    <p className="mt-1 text-xs font-bold text-on-surface-variant">{getScheduleHours(item)}</p>
                    {item.note?.trim() && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-on-surface-variant">
                        Ghi chú: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setScheduleViewPreview(null)}
                  className="btn-primary h-10"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleNotePreview && (
        <div className="modal-overlay">
          <div className="w-full max-w-md rounded-lg border border-outline-variant bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-on-surface">Ghi chú ca trực</h3>
                <p className="mt-1 truncate text-xs text-on-surface-variant">{scheduleNotePreview.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleNotePreview(null)}
                className="h-8 w-8 rounded hover:bg-surface-2 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-outline-variant bg-surface-2 px-3 py-3 text-sm leading-6 text-on-surface-variant">
                {scheduleNotePreview.note}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setScheduleNotePreview(null)}
                  className="btn-primary h-10"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <WeeklyCoverageSuggestionModal
        open={isWeeklySuggestionOpen}
        users={scheduleUsers}
        onClose={() => setIsWeeklySuggestionOpen(false)}
        onSuccess={reload}
      />
    </div>
  );
}
