import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
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
} from '../../../types';
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

type OvertimeDraft = {
  userId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  reason: string;
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

function getOvertimeStatusLabel(status: OvertimeStatus) {
  if (status === 1) return 'Chờ duyệt';
  if (status === 2) return 'Đã duyệt';
  if (status === 3) return 'Từ chối';
  return 'Đã hủy';
}

function getOvertimeStatusClass(status: OvertimeStatus) {
  if (status === 1) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 2) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 3) return 'border-red-200 bg-red-50 text-red-600';
  return 'border-slate-200 bg-slate-100 text-slate-600';
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
      shiftId: shiftFilter || undefined,
      keyword: keyword || undefined,
    }).catch((err: any) => {
      toast.error(err.message || 'Không thể tải lịch làm việc.');
    });
  }, [fetchWeekSchedule, selectedDate]);

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

  const reload = async () => {
    const [weeklyOvertime] = await Promise.all([
      overtimeService.getAll({
        fromDate: weekStart,
        toDate: weekEnd,
      }),
      fetchWeekSchedule(selectedDate, {
        shiftId: shiftFilter || undefined,
        keyword: keyword || undefined,
      }),
    ]);
    setOvertimeRequests(weeklyOvertime);
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
      userId,
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
    if (!overtimeDraft.userId) {
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
        userId: overtimeDraft.userId,
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

  const renderScheduleCell = (row: WorkScheduleWeekUserDto, date: string) => {
    const schedule = row.schedules.find(item => item.workDate === date);
    const cellKey = getCellKey(row.userId, date);
    const draft = cellDrafts[cellKey];
    const effectiveShiftId = draft ? draft.shiftId : schedule ? String(schedule.shiftId) : '';
    const effectiveShift = activeShifts.find(shift => String(shift.id) === effectiveShiftId);
    const hasDraft = Boolean(draft);
    const cellOvertimeRequests = overtimeByCell.get(cellKey) || [];

    if (canManageSchedule) {
      const isDeletedDraft = Boolean(schedule && draft && !draft.shiftId);

      return (
        <div key={date} className={`min-h-[112px] w-full p-2 flex flex-col items-center justify-center gap-2 ${hasDraft ? 'bg-blue-50/70' : ''}`}>
          {effectiveShift ? (
            <span className={`relative block w-full max-w-[118px] rounded border px-1.5 py-1 text-center text-[10px] font-black leading-tight ${getShiftClass(effectiveShift.code)}`}>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => stageCellShift(row, date, schedule, '')}
                className="absolute -right-1.5 -top-1.5 z-[1] h-5 w-5 rounded-full border border-red-200 bg-white text-red-600 shadow-sm flex items-center justify-center hover:bg-red-50 disabled:opacity-60"
                title="Xóa ca"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              Ca {effectiveShift.code}
              <span className="block text-[9px] font-bold">{getShiftHours(effectiveShift)}</span>
              {hasDraft && <span className="block text-[9px] font-bold text-primary">Chưa lưu</span>}
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
          {renderOvertimeBadges(cellOvertimeRequests)}
        </div>
      );
    }

    if (!schedule) {
      return (
        <div
          key={date}
          className="h-full min-h-[112px] w-full p-2 text-center text-xs italic font-semibold text-gray-500 flex flex-col items-center justify-center gap-2"
        >
          <span>Nghỉ</span>
          {renderOvertimeBadges(cellOvertimeRequests)}
        </div>
      );
    }

    return (
      <button
        key={date}
        type="button"
        onClick={() => openEditPanel(schedule, row)}
        disabled={!canManageSchedule}
        className={`h-full min-h-[112px] w-full flex flex-col items-center justify-center gap-2 p-2 transition-colors ${
          canManageSchedule ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className={`relative block w-full max-w-[118px] rounded border px-1.5 py-1 text-center text-[10px] font-black leading-tight ${getShiftClass(schedule.shiftCode)}`}>
          {canManageSchedule && <Edit2 className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400" />}
          Ca {schedule.shiftCode}
          <span className="block text-[9px] font-bold">{getScheduleHours(schedule)}</span>
        </span>
        {renderOvertimeBadges(cellOvertimeRequests)}
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
              onClick={() => setIsOvertimeExportModalOpen(true)}
              disabled={isExportingOvertime}
              className="h-11 px-5 rounded-md bg-primary !text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm hover:bg-primary-container cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#fff' }}
            >
              {isExportingOvertime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Xuất Excel
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
                onClick={deleteAllCurrentWeekSchedules}
                disabled={!canManageSchedule || isSaving || currentWeekScheduleIds.length === 0}
                className="h-11 px-4 rounded-md border border-red-200 bg-red-50 text-red-600 text-sm font-semibold inline-flex items-center gap-2 hover:bg-red-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Xóa tất cả lịch
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
            <button
              type="button"
              onClick={() => openOvertimeModal(selectedDate)}
              className="h-10 px-4 rounded-md border border-outline-variant text-primary text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
            >
              <Clock3 className="w-4 h-4" />
              Ghi OT
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

      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-lg border border-outline-variant bg-white shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Thống kê lịch làm việc</h3>
                <p className="text-xs text-gray-500 mt-1">Xem thống kê theo năm, tháng và nhân viên.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="h-8 w-8 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer"
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
                    className="mt-1 h-10 w-full rounded-md border border-outline-variant bg-white px-3 text-sm focus:outline-primary"
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
                  className="h-10 px-5 rounded-md bg-primary text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-primary-container cursor-pointer disabled:opacity-60"
                >
                  {isStatsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  Xem thống kê
                </button>
              </div>

              {monthlyStats.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-md border border-outline-variant bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-gray-500">Tổng lịch</p>
                      <p className="mt-2 text-2xl font-black text-gray-950">{formatNumber(monthlyStatsSummary.totalSchedules)}</p>
                    </div>
                    <div className="rounded-md border border-outline-variant bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-gray-500">Tổng giờ</p>
                      <p className="mt-2 text-2xl font-black text-emerald-600">{formatNumber(monthlyStatsSummary.totalPlannedHours)}h</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-outline-variant overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3 text-left">Nhân viên</th>
                          <th className="px-4 py-3 text-right">Tổng giờ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlyStatsRows.map(item => (
                          <tr key={item.userId} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className="block font-bold text-gray-950">{item.userFullName}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-base font-black text-emerald-600">{formatNumber(item.totalPlannedHours)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-outline-variant py-10 text-center text-sm font-semibold text-gray-400">
                  Chọn điều kiện và bấm Xem thống kê.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isOvertimeExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Xuất báo cáo OT</h3>
                <p className="text-xs text-gray-500 mt-1">Chọn tháng, năm và nhân viên để xuất file Excel.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOvertimeExportModalOpen(false)}
                disabled={isExportingOvertime}
                className="h-8 w-8 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer disabled:opacity-60"
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
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm"
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
                  className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={isExportingOvertime}
                  className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-container disabled:opacity-60 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-white shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Ghi OT</h3>
                <p className="text-xs text-gray-500 mt-1">OT sau khi tạo sẽ ở trạng thái chờ duyệt.</p>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeDraft(null)}
                className="h-8 w-8 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block text-sm font-semibold">
                Nhân viên
                <select
                  value={overtimeDraft.userId}
                  onChange={event => setOvertimeDraft(current => current ? { ...current, userId: event.target.value } : current)}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm focus:outline-primary"
                >
                  <option value="">Chọn nhân viên</option>
                  {scheduleUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>

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
                  className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveOvertime}
                  disabled={isSaving}
                  className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-container disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? 'Đang lưu...' : 'Ghi OT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
