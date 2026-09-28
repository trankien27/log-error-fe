import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Loader2,
  MoonStar,
  Sparkles,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { WorkScheduleDto } from '../../../types';

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(value: string) {
  return value?.slice(0, 5) || '--:--';
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getEffectiveHours(schedule: WorkScheduleDto) {
  return schedule.effectiveWorkingHours
    ?? (schedule.paidWorkingHours ?? schedule.workingHours ?? 0) * (schedule.shiftCoefficient || 1);
}

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export default function MyScheduleTab() {
  const currentUser = useAuthStore(state => state.currentUser);
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<WorkScheduleDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const today = toDateInput(new Date());
  const weekStart = toDateInput(weekAnchor);
  const weekEnd = toDateInput(addDays(weekAnchor, 6));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekAnchor, index);
    const dateKey = toDateInput(date);
    return {
      date,
      dateKey,
      label: dayNames[index],
      schedules: schedules
        .filter(schedule => schedule.workDate === dateKey && schedule.status !== 4 && schedule.status !== 5)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  }), [schedules, weekAnchor]);

  useEffect(() => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    scheduleService.getWorkSchedules({
      fromDate: weekStart,
      toDate: weekEnd,
      userId: currentUser.id,
    })
      .then(setSchedules)
      .catch((error: any) => toast.error(error.message || 'Không thể tải lịch làm việc của bạn.'))
      .finally(() => setIsLoading(false));
  }, [currentUser?.id, weekEnd, weekStart]);

  const activeSchedules = schedules.filter(schedule => schedule.status !== 4 && schedule.status !== 5);
  const todaySchedules = activeSchedules.filter(schedule => schedule.workDate === today);
  const totalHours = activeSchedules.reduce((total, schedule) => total + getEffectiveHours(schedule), 0);
  const upcomingSchedule = activeSchedules
    .filter(schedule => `${schedule.workDate}T${formatTime(schedule.startTime)}` >= toDateInput(new Date()) + 'T' + new Date().toTimeString().slice(0, 5))
    .sort((a, b) => `${a.workDate}${a.startTime}`.localeCompare(`${b.workDate}${b.startTime}`))[0];

  const isCurrentWeek = weekStart === toDateInput(getMonday(new Date()));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-primary/15 via-surface to-surface shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_1fr] lg:p-9">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Lịch cá nhân
            </div>
            <p className="text-sm font-semibold text-on-surface-variant">Xin chào, {currentUser?.name || 'bạn'}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
              {todaySchedules.length > 0 ? 'Hôm nay bạn có ca làm việc' : 'Hôm nay bạn được nghỉ'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
              {todaySchedules.length > 0
                ? `Bạn có ${todaySchedules.length} ca. Hãy có mặt đúng giờ và kiểm tra ghi chú trước khi bắt đầu.`
                : upcomingSchedule
                  ? `Ca tiếp theo của bạn là ${upcomingSchedule.shiftName} vào ${new Date(`${upcomingSchedule.workDate}T00:00:00`).toLocaleDateString('vi-VN')}.`
                  : 'Bạn chưa có ca làm việc nào sắp tới trong tuần này.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-outline-variant bg-surface/90 p-4">
              <CalendarCheck2 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-black">{activeSchedules.length}</p>
              <p className="text-xs font-semibold text-on-surface-variant">Ca trong tuần</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface/90 p-4">
              <Clock3 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-black">{formatHours(totalHours)}h</p>
              <p className="text-xs font-semibold text-on-surface-variant">Tổng giờ làm</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black">Lịch tuần của tôi</h2>
            <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
              {new Date(`${weekStart}T00:00:00`).toLocaleDateString('vi-VN')} - {new Date(`${weekEnd}T00:00:00`).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWeekAnchor(current => addDays(current, -7))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2" aria-label="Tuần trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setWeekAnchor(getMonday(new Date()))} disabled={isCurrentWeek} className="h-10 rounded-lg border border-outline-variant px-4 text-sm font-bold hover:bg-surface-2 disabled:opacity-50">
              Tuần này
            </button>
            <button type="button" onClick={() => setWeekAnchor(current => addDays(current, 7))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2" aria-label="Tuần sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải lịch của bạn...
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 xl:grid-cols-7">
            {days.map(day => {
              const isToday = day.dateKey === today;
              return (
                <article key={day.dateKey} className={`min-h-52 rounded-xl border p-3 ${isToday ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-outline-variant bg-surface'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>{day.label}</p>
                      <p className="mt-0.5 text-lg font-black">{day.date.getDate().toString().padStart(2, '0')}/{(day.date.getMonth() + 1).toString().padStart(2, '0')}</p>
                    </div>
                    {isToday && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black text-on-primary">Hôm nay</span>}
                  </div>

                  <div className="mt-4 space-y-2">
                    {day.schedules.length === 0 ? (
                      <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-2/60 text-center">
                        <Coffee className="h-6 w-6 text-on-surface-variant" />
                        <p className="mt-2 text-sm font-bold">Ngày nghỉ</p>
                      </div>
                    ) : day.schedules.map(schedule => (
                      <div key={schedule.id} className="rounded-lg border border-primary/25 bg-primary/10 p-3">
                        <div className="flex items-center gap-2 text-primary">
                          {formatTime(schedule.startTime) < '18:00' ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                          <span className="text-xs font-black">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                        </div>
                        <p className="mt-2 text-sm font-black text-on-surface">{schedule.shiftCode} - {schedule.shiftName}</p>
                        {schedule.endDayOffset ? <p className="mt-1 text-[11px] font-bold text-on-surface-variant">Kết thúc vào ngày hôm sau</p> : null}
                        {schedule.note ? <p className="mt-2 border-t border-primary/15 pt-2 text-xs text-on-surface-variant">{schedule.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
