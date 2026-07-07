import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import {
  MonthlyEmployeeRuleRequest,
  MonthlySuggestionPreviewResponse,
  MonthlySuggestionUser,
  ShiftDto,
  User,
} from '../../../types';

const weekdayOptions = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
];

const DEFAULT_MONTHLY_OFF_DAYS = 6;

type Props = {
  open: boolean;
  users: User[];
  shifts: ShiftDto[];
  initialDate: string;
  onClose: () => void;
  onSuccess: () => void;
};

type RuleState = {
  ruleText: string;
};

function toMonthValue(dateValue?: string) {
  return (dateValue || new Date().toISOString().slice(0, 10)).slice(0, 7);
}

function getMonthNumber(monthValue?: string) {
  return Number((monthValue || '').split('-')[1] || 1);
}

function getYearNumber(monthValue?: string) {
  return Number((monthValue || '').split('-')[0] || new Date().getFullYear());
}

function buildMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function createRuleState(): RuleState {
  return {
    ruleText: '',
  };
}

function normalizeRuleState(rule?: RuleState): RuleState {
  return {
    ruleText: rule?.ruleText || '',
  };
}

function parseWeekdayToken(token: string) {
  const normalized = token.trim().toUpperCase();
  const match = weekdayOptions.find(option => option.label === normalized);
  return match?.value;
}

function parseEmployeeRuleText(text: string | undefined, shifts: ShiftDto[]) {
  const shiftByCode = new Map(shifts.map(shift => [shift.code.toUpperCase(), shift]));
  const unavailableWeekdays = new Set<number>();
  const unavailableDates = new Set<string>();
  const unwantedShiftRules = new Map<number, { weekdays: Set<number>; dates: Set<string> }>();

  const ensureShiftRule = (shiftId: number) => {
    const current = unwantedShiftRules.get(shiftId) || { weekdays: new Set<number>(), dates: new Set<string>() };
    unwantedShiftRules.set(shiftId, current);
    return current;
  };

  (text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const [dateOrWeekday, shiftCode] = line.split(/\s+/);
      const weekday = parseWeekdayToken(dateOrWeekday);
      const shift = shiftCode ? shiftByCode.get(shiftCode.toUpperCase()) : undefined;
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(dateOrWeekday);

      if (!isDate && weekday === undefined) return;

      if (!shift) {
        if (isDate) unavailableDates.add(dateOrWeekday);
        else unavailableWeekdays.add(weekday!);
        return;
      }

      const shiftRule = ensureShiftRule(shift.id);
      if (isDate) shiftRule.dates.add(dateOrWeekday);
      else shiftRule.weekdays.add(weekday!);
    });

  return {
    unavailableWeekdays: Array.from(unavailableWeekdays),
    unavailableDates: Array.from(unavailableDates),
    unwantedShiftRules: Array.from(unwantedShiftRules, ([shiftId, rule]) => ({
      shiftId,
      weekdays: Array.from(rule.weekdays),
      dates: Array.from(rule.dates),
    })),
  };
}

function getShiftClass(code?: string | null) {
  const styles: Record<string, string> = {
    S: 'bg-[#e8f3ff] border-[#9ac7f7] text-[#0c315c]',
    C: 'bg-[#eff9e8] border-[#a9d79a] text-[#173d18]',
    T: 'bg-[#f0e7ff] border-[#b99deb] text-[#291044]',
    'S+': 'bg-[#fff4d8] border-[#f2b33d] text-[#4f3100]',
    'C+': 'bg-[#ffeaf0] border-[#ea8fa2] text-[#4b1020]',
  };

  return styles[code || ''] || 'bg-slate-50 border-slate-200 text-slate-700';
}

function getVietnameseWeekday(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day];
}

function formatShiftTime(time?: string) {
  return (time || '').slice(0, 5).replace(':', 'h');
}

function toDateInputFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateValue(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputFromDate(date);
}

function formatShortDate(dateValue: string) {
  return `${dateValue.slice(8, 10)}/${dateValue.slice(5, 7)}`;
}

function getMondayOfWeek(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay(); // 0=CN, 1=T2, ..., 6=T7
  const diff = day === 0 ? -6 : 1 - day; // số ngày lùi về T2
  date.setDate(date.getDate() + diff);
  return toDateInputFromDate(date);
}

export default function MonthlySuggestionModal({ open, users, shifts, initialDate, onClose, onSuccess }: Props) {
  const [monthValue, setMonthValue] = useState(() => toMonthValue(initialDate));
  const [monthlyOffDays, setMonthlyOffDays] = useState(DEFAULT_MONTHLY_OFF_DAYS);
  const [monthlyTargetHours, setMonthlyTargetHours] = useState(0);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => users.map(user => user.id));
  const [rules, setRules] = useState<Record<string, RuleState>>(() => (
    Object.fromEntries(users.map(user => [user.id, createRuleState()]))
  ));
  const [preview, setPreview] = useState<MonthlySuggestionPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewWeekStart, setPreviewWeekStart] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedUserIds(current => {
      const availableIds = new Set(users.map(user => user.id));
      const next = current.filter(id => availableIds.has(id));
      return next.length > 0 ? next : users.map(user => user.id);
    });

    setRules(current => {
      const next: Record<string, RuleState> = {};
      users.forEach(user => {
        const existing = current[user.id];
        next[user.id] = normalizeRuleState(existing);
      });
      return next;
    });
  }, [open, users]);

  const selectedUsers = useMemo(
    () => users.filter(user => selectedUserIds.includes(user.id)),
    [selectedUserIds, users],
  );

  const previewMonthDates = useMemo(
    () => preview?.users[0]?.days.map(day => day.date) || [],
    [preview],
  );

  const previewWeekDates = useMemo(() => {
    if (!preview || !previewWeekStart) return [];

    return Array.from({ length: 7 }, (_, index) => addDaysToDateValue(previewWeekStart, index));
  }, [preview, previewWeekStart]);

  const canGoPreviousPreviewWeek = previewWeekDates.length > 0
    && previewMonthDates.length > 0
    && previewWeekStart > getMondayOfWeek(previewMonthDates[0]);
  const canGoNextPreviewWeek = previewWeekDates.length > 0
    && previewMonthDates.length > 0
    && previewWeekDates[previewWeekDates.length - 1] < previewMonthDates[previewMonthDates.length - 1];

  if (!open) return null;

  const updateRule = (userId: string, updater: (rule: RuleState) => RuleState) => {
    setRules(current => ({
      ...current,
      [userId]: updater(normalizeRuleState(current[userId])),
    }));
  };

  const buildEmployeeRules = (): MonthlyEmployeeRuleRequest[] => selectedUsers.map(user => {
    const rule = normalizeRuleState(rules[user.id]);
    const parsedRule = parseEmployeeRuleText(rule.ruleText, shifts);

    return {
      userId: user.id,
      unavailableWeekdays: parsedRule.unavailableWeekdays,
      unavailableDates: parsedRule.unavailableDates,
      unwantedShiftRules: parsedRule.unwantedShiftRules,
    };
  });

  const handlePreview = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn nhân viên.');
      return;
    }

    const year = getYearNumber(monthValue);
    const month = getMonthNumber(monthValue);
    setIsPreviewing(true);
    setPreviewError('');
    try {
      const result = await scheduleService.previewMonthlySuggestion({
        year,
        month,
        userIds: selectedUserIds,
        shiftIds: [],
        monthlyOffDays,
        monthlyTargetHours: monthlyTargetHours > 0 ? monthlyTargetHours : null,
        overwriteExisting,
        allowFlexibleShifts: true,
        employeeRules: buildEmployeeRules(),
      });
      setPreview(result);
      setPreviewWeekStart(getMondayOfWeek(result.users[0]?.days[0]?.date || buildMonthValue(year, month) + '-01'));
      toast.success('Đã tạo preview lịch tháng.');
    } catch (err: any) {
      const message = err.message || 'Không thể tạo preview lịch tháng.';
      setPreview(null);
      setPreviewError(message);
      toast.error(message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const updatePreviewCell = (userId: string, date: string, nextShiftId: string) => {
    setPreview(current => {
      if (!current) return current;

      return {
        ...current,
        users: current.users.map(user => {
          if (user.userId !== userId) return user;

          const nextDays = user.days.map(day => {
            if (day.date !== date) return day;

            if (!nextShiftId) {
              return {
                ...day,
                shiftId: null,
                shiftCode: null,
                shiftName: null,
                totalHours: 0,
                isOff: true,
                isGenerated: true,
                isExisting: false,
                isTemporaryShift: false,
              };
            }

            if (nextShiftId === 'temporary-flex') {
              return day;
            }

            return day;
          });

          const offDays = nextDays.filter(day => day.isOff).length;
          const warningCount = nextDays.reduce((sum, day) => sum + day.warnings.length, 0);

          return {
            ...user,
            days: nextDays,
            summary: {
              offDays,
              workingDays: nextDays.length - offDays,
              totalHours: nextDays.reduce((sum, day) => sum + day.totalHours, 0),
              warningCount,
            },
          };
        }),
      };
    });
  };

  const handleApply = async () => {
    if (!preview) return;

    const invalidUsers = preview.users.filter(user => user.summary.offDays !== preview.monthlyOffDays);
    if (invalidUsers.length > 0) {
      toast.error(`Có ${invalidUsers.length} nhân viên chưa nghỉ đúng ${preview.monthlyOffDays} ngày.`);
      return;
    }
    if (preview.monthlyTargetHours && preview.monthlyTargetHours > 0) {
      const invalidHourUsers = preview.users.filter(user => user.summary.totalHours !== preview.monthlyTargetHours);
      if (invalidHourUsers.length > 0) {
        toast.error(`Có ${invalidHourUsers.length} nhân viên chưa đúng ${preview.monthlyTargetHours} giờ/tháng.`);
        return;
      }
    }
    setIsApplying(true);
    try {
      const result = await scheduleService.applyMonthlySuggestion({
        year: preview.year,
        month: preview.month,
        monthlyOffDays: preview.monthlyOffDays,
        monthlyTargetHours: preview.monthlyTargetHours && preview.monthlyTargetHours > 0 ? preview.monthlyTargetHours : null,
        overwriteExisting,
        items: preview.users.flatMap(user => user.days.map(day => ({
          userId: user.userId,
          workDate: day.date,
          shiftId: day.isOff ? null : day.shiftId,
          shiftCode: day.shiftCode,
          shiftName: day.shiftName,
          startTime: day.startTime,
          endTime: day.endTime,
          endDayOffset: day.startTime && day.endTime && day.endTime <= day.startTime ? 1 : 0,
          totalHours: day.totalHours,
          isTemporaryShift: day.isTemporaryShift,
        }))),
      });
      toast.success(`Đã áp dụng ${result.created} lịch tháng.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Không thể áp dụng lịch tháng.');
    } finally {
      setIsApplying(false);
    }
  };

  const renderWeeklyPreviewRow = (user: MonthlySuggestionUser) => {
    const daysByDate = new Map(user.days.map(day => [day.date, day]));

    return (
      <tr key={user.userId} className="border-b border-slate-100">
        <td className="sticky left-0 z-10 w-[170px] bg-white px-3 py-3 align-top shadow-[1px_0_0_#e5e7eb]">
          <p className="w-36 truncate text-xs font-black text-slate-900">{user.userName}</p>
          <p className="mt-1 text-[11px] text-slate-500">{user.summary.workingDays} ngày làm trong tháng</p>
        </td>
        {previewWeekDates.map(date => {
          const day = daysByDate.get(date);
          return (
            <td key={date} className="w-[112px] min-w-[112px] border-r border-slate-100 px-2 py-3 align-top">
              {day ? (
                <>
                  <select
                    value={day.isOff ? '' : 'temporary-flex'}
                    onChange={event => updatePreviewCell(user.userId, date, event.target.value)}
                    className={`h-10 w-full rounded border px-2 text-xs font-black ${day.isOff ? 'border-slate-200 bg-slate-100 text-slate-500' : day.isTemporaryShift ? 'border-blue-200 bg-blue-50 text-blue-700' : getShiftClass(day.shiftCode)}`}
                    title={day.warnings.join('\n')}
                  >
                    <option value="">OFF</option>
                    {!day.isOff && <option value="temporary-flex">{day.shiftCode || 'LĐ'}</option>}
                  </select>
                  {!day.isOff && (
                    <p className="mt-1 truncate text-[10px] font-bold text-slate-500" title={`${formatShiftTime(day.startTime || '')}-${formatShiftTime(day.endTime || '')} · ${day.totalHours}h`}>
                      {formatShiftTime(day.startTime || '')}-{formatShiftTime(day.endTime || '')}
                    </p>
                  )}
                  {day.warnings.length > 0 && <p className="mt-1 text-[10px] font-bold text-amber-600">Có cảnh báo</p>}
                </>
              ) : (
                <span className="text-[11px] font-semibold text-slate-300">Ngoài tháng</span>
              )}
            </td>
          );
        })}
        <td className="sticky right-[82px] z-10 w-[82px] min-w-[82px] border-l border-slate-200 bg-white px-2 py-3 text-center shadow-[-1px_0_0_#e5e7eb]">
          <p className={`text-sm font-black ${preview?.monthlyTargetHours && preview.monthlyTargetHours > 0 && user.summary.totalHours !== preview.monthlyTargetHours ? 'text-red-600' : 'text-slate-900'}`}>
            {preview?.monthlyTargetHours && preview.monthlyTargetHours > 0 ? `${user.summary.totalHours}/${preview.monthlyTargetHours}` : user.summary.totalHours}
          </p>
          <p className="text-[10px] font-bold text-slate-500">giờ</p>
        </td>
        <td className="sticky right-0 z-10 w-[82px] min-w-[82px] border-l border-slate-200 bg-white px-2 py-3 text-center shadow-[-1px_0_0_#e5e7eb]">
          <p className={`text-sm font-black ${user.summary.offDays === preview?.monthlyOffDays ? 'text-emerald-600' : 'text-red-600'}`}>
            {user.summary.offDays}/{preview?.monthlyOffDays}
          </p>
          <p className="text-[10px] font-bold text-slate-500">nghỉ</p>
        </td>
      </tr>
    );
  };

  const movePreviewWeek = (direction: -1 | 1) => {
    if (!previewMonthDates.length) return;

    const candidate = addDaysToDateValue(previewWeekStart || previewMonthDates[0], direction * 7);
    const minDate = previewMonthDates[0];
    const maxDate = previewMonthDates[previewMonthDates.length - 1];

    if (candidate < minDate) {
      setPreviewWeekStart(getMondayOfWeek(minDate));
      return;
    }

    if (candidate > maxDate) return;
    setPreviewWeekStart(candidate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 p-2 sm:p-4">
      <div className="flex max-h-[96dvh] w-[98vw] max-w-none flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3">
          <div>
            <h3 className="text-base font-black text-slate-950">Đề xuất lịch tháng</h3>
            <p className="text-xs text-slate-500">Xếp lịch cả tháng, nghỉ đúng N ngày, có preview trước khi áp dụng.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg border border-outline-variant text-slate-500 hover:bg-slate-50">
            <X className="mx-auto h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
          <div className="overflow-y-auto border-b border-outline-variant p-4 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-700">
                Tháng
                <select
                  value={getMonthNumber(monthValue)}
                  onChange={event => setMonthValue(buildMonthValue(getYearNumber(monthValue), Number(event.target.value)))}
                  className="mt-1 h-10 w-full rounded-md border border-outline-variant bg-white px-3 text-sm"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                    <option key={month} value={month}>Tháng {month}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Năm
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={getYearNumber(monthValue)}
                  onChange={event => setMonthValue(buildMonthValue(Number(event.target.value), getMonthNumber(monthValue)))}
                  className="mt-1 h-10 w-full rounded-md border border-outline-variant px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="block text-xs font-bold text-slate-700">
                Số ngày nghỉ mỗi nhân viên
                <input
                  type="number"
                  min={0}
                  value={monthlyOffDays}
                  onChange={event => setMonthlyOffDays(Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-outline-variant px-3 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Số tiếng mỗi nhân viên trong tháng
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={monthlyTargetHours}
                  onChange={event => setMonthlyTargetHours(Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-outline-variant px-3 text-sm"
                />
                <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                  Nhập 0 để không giới hạn và không validate min/max số tiếng.
                </span>
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={event => setOverwriteExisting(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Ghi đè lịch cũ trong tháng
            </label>

            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900">
              Sắp xếp linh động đang bật mặc định.
              <span className="mt-1 block text-[11px] font-semibold text-blue-700">
                Hệ thống tự tạo khoảng thời gian ca trong preview để phủ kín 07h30-23h và lưu trực tiếp vào lịch, không cần chọn ca cố định.
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Nhân viên & rule</p>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-900">
                <p className="font-black">Cú pháp nhập rule</p>
                <p>Mỗi dòng là một rule. <b>2026-07-10</b> = không muốn làm ngày đó. <b>2026-07-10 S+</b> = không muốn làm ca S+ ngày đó. <b>T2 C</b> = không muốn làm ca C vào thứ 2.</p>
              </div>
              {users.map(user => {
                const selected = selectedUserIds.includes(user.id);
                const rule = normalizeRuleState(rules[user.id]);

                return (
                  <div key={user.id} className={`rounded-lg border p-3 ${selected ? 'border-outline-variant bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                    <label className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setSelectedUserIds(current => current.includes(user.id) ? current.filter(id => id !== user.id) : [...current, user.id])}
                        className="h-4 w-4 accent-primary"
                      />
                      {user.name}
                    </label>

                    {selected && (
                      <label className="mt-3 block text-[11px] font-bold text-slate-500">
                        Rule không muốn làm
                        <textarea
                          value={rule.ruleText}
                          onChange={event => updateRule(user.id, current => ({ ...current, ruleText: event.target.value }))}
                          rows={5}
                          placeholder={'Nhập rule, mỗi dòng một rule'}
                          className="mt-1 w-full resize-y rounded-md border border-outline-variant px-2 py-2 font-mono text-xs leading-relaxed"
                          spellCheck={false}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <CalendarDays className="h-4 w-4" />
                {preview ? `${preview.month}/${preview.year}` : 'Chưa có preview'}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="h-10 rounded-md border border-outline-variant px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isPreviewing ? <Loader2 className="inline h-4 w-4 animate-spin" /> : <Sparkles className="inline h-4 w-4" />} Tạo preview
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!preview || isApplying}
                  className="h-10 rounded-md bg-primary px-4 text-xs font-black text-white hover:bg-primary-container disabled:opacity-60"
                >
                  {isApplying ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Áp dụng lịch
                </button>
              </div>
            </div>

            {!preview ? (
              <div className="flex h-[520px] items-center justify-center px-4 text-center text-sm font-semibold text-slate-400">
                {previewError ? (
                  <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-left text-red-700">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black">
                      <AlertTriangle className="h-4 w-4" />
                      Preview không tạo được
                    </div>
                    <pre className="max-h-72 whitespace-pre-wrap break-words rounded-md bg-white/70 p-3 font-mono text-xs leading-relaxed text-red-800">
                      {previewError}
                    </pre>
                  </div>
                ) : (
                  <span>Chọn cấu hình bên trái rồi bấm Tạo preview.</span>
                )}
              </div>
            ) : (
              <div className="h-[calc(94dvh-123px)] overflow-auto">
                <div className="sticky top-0 z-30 flex flex-col gap-3 border-b border-outline-variant bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Preview lịch theo tuần</p>
                    <p className="text-sm font-black text-slate-950">
                      {previewWeekDates.length > 0
                        ? `${formatShortDate(previewWeekDates[0])} - ${formatShortDate(previewWeekDates[previewWeekDates.length - 1])}`
                        : `Tháng ${preview.month}/${preview.year}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => movePreviewWeek(-1)}
                      disabled={!canGoPreviousPreviewWeek}
                      className="h-9 rounded-md border border-outline-variant px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="inline h-4 w-4" /> Tuần trước
                    </button>
                    <button
                      type="button"
                      onClick={() => movePreviewWeek(1)}
                      disabled={!canGoNextPreviewWeek}
                      className="h-9 rounded-md border border-outline-variant px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Tuần sau <ChevronRight className="inline h-4 w-4" />
                    </button>
                  </div>
                </div>
                {preview.warnings.length > 0 && (
                  <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    <div className="mb-2 flex items-center gap-2 font-black">
                      <AlertTriangle className="h-4 w-4" />
                      Cảnh báo preview ({preview.warnings.length})
                    </div>
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-amber-200 bg-white/60 p-2">
                      {preview.warnings.map((warning, index) => (
                        <p key={`${index}-${warning}`}>{warning}</p>
                      ))}
                    </div>
                  </div>
                )}
                <table className="w-max min-w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <th className="sticky left-0 top-[65px] z-20 w-[170px] bg-slate-50 px-3 py-3 shadow-[1px_0_0_#e5e7eb]">Nhân viên</th>
                      {previewWeekDates.map(date => (
                        <th key={date} className="sticky top-[65px] z-10 w-[112px] min-w-[112px] border-r border-slate-100 bg-slate-50 px-2 py-3 text-center">
                          <span className="block text-sm font-black text-slate-900">{formatShortDate(date)}</span>
                          <span className="block text-[10px] font-bold text-slate-500">{getVietnameseWeekday(date)}</span>
                        </th>
                      ))}
                      <th className="sticky right-[82px] top-[65px] z-20 w-[82px] min-w-[82px] border-l border-slate-200 bg-slate-50 px-1 py-3 text-center shadow-[-1px_0_0_#e5e7eb]">
                        Tổng giờ
                      </th>
                      <th className="sticky right-0 top-[65px] z-20 w-[82px] min-w-[82px] border-l border-slate-200 bg-slate-50 px-1 py-3 text-center shadow-[-1px_0_0_#e5e7eb]">
                        Ngày nghỉ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.users.map(renderWeeklyPreviewRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
