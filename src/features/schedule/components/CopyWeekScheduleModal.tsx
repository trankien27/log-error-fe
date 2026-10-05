import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, Copy, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '../../../services/api/scheduleService';
import { ShiftDto, User, WorkScheduleDto } from '../../../types';
import { EmptyState } from '../../../components/ui';

type PreviewItem = {
  key: string;
  sourceId: number;
  sourceDate: string;
  workDate: string;
  userId: string;
  shiftId: number | null;
  shiftCoefficient: number;
  note: string;
};

type Props = {
  open: boolean;
  initialSourceDate: string;
  users: User[];
  shifts: ShiftDto[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function getMonday(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toDateInput(date);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

function getWeekLabel(monday: string) {
  return `${formatDate(monday)} - ${formatDate(addDays(monday, 6))}`;
}

export default function CopyWeekScheduleModal({ open, initialSourceDate, users, shifts, onClose, onSuccess }: Props) {
  const [sourceDate, setSourceDate] = useState(getMonday(initialSourceDate));
  const [targetDate, setTargetDate] = useState(addDays(getMonday(initialSourceDate), 7));
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeShifts = useMemo(() => shifts.filter(shift => shift.isActive), [shifts]);
  const shiftById = useMemo(() => new Map(shifts.map(shift => [shift.id, shift])), [shifts]);

  useEffect(() => {
    if (!open) return;
    const sourceMonday = getMonday(initialSourceDate);
    setSourceDate(sourceMonday);
    setTargetDate(addDays(sourceMonday, 7));
    setPreviewItems([]);
    setStep('select');
  }, [initialSourceDate, open]);

  if (!open) return null;

  const loadPreview = async () => {
    const sourceMonday = getMonday(sourceDate);
    const targetMonday = getMonday(targetDate);
    if (sourceMonday === targetMonday) {
      toast.error('Tuần nguồn và tuần đích phải khác nhau.');
      return;
    }

    setIsLoading(true);
    try {
      const schedules = await scheduleService.getWorkSchedules({
        fromDate: sourceMonday,
        toDate: addDays(sourceMonday, 6),
      });
      const offset = Math.round((new Date(`${targetMonday}T00:00:00`).getTime() - new Date(`${sourceMonday}T00:00:00`).getTime()) / 86400000);
      const items = schedules
        .filter(schedule => schedule.status !== 5)
        .map((schedule, index) => ({
          key: `${schedule.id}-${index}`,
          sourceId: schedule.id,
          sourceDate: schedule.workDate,
          workDate: addDays(schedule.workDate, offset),
          userId: schedule.userId,
          shiftId: schedule.shiftId ?? null,
          shiftCoefficient: schedule.shiftCoefficient || 1,
          note: schedule.note || '',
        }));

      if (items.length === 0) {
        toast.error('Tuần nguồn chưa có lịch để sao chép.');
        return;
      }
      setSourceDate(sourceMonday);
      setTargetDate(targetMonday);
      setPreviewItems(items);
      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải lịch tuần nguồn.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = (key: string, patch: Partial<PreviewItem>) => {
    setPreviewItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item));
  };

  const submit = async () => {
    if (previewItems.length === 0) {
      toast.error('Không còn lịch nào để sao chép.');
      return;
    }
    if (previewItems.some(item => !item.userId || !item.shiftId || !item.workDate)) {
      toast.error('Vui lòng chọn đầy đủ nhân viên, ngày và ca làm việc.');
      return;
    }
    if (previewItems.some(item => item.workDate < targetDate || item.workDate > addDays(targetDate, 6))) {
      toast.error('Ngày làm việc phải nằm trong tuần đích.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await scheduleService.batchCreateWorkSchedules({
        items: previewItems.map(item => ({
          workDate: item.workDate,
          userId: item.userId,
          shiftId: item.shiftId,
          shiftCoefficient: item.shiftCoefficient,
          note: item.note || null,
        })),
      });
      toast.success(`Đã sao chép ${result.length} ca làm việc.`);
      await onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Không thể lưu lịch. Vui lòng kiểm tra ca bị trùng.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay !z-[80] sm:!p-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-elevated">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface"><Copy className="h-5 w-5 text-primary" /> Sao chép lịch tuần</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {step === 'select' ? 'Chọn tuần lấy lịch và tuần nhận lịch.' : 'Kiểm tra và điều chỉnh trước khi lưu.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface" aria-label="Đóng" title="Đóng"><X className="h-5 w-5" /></button>
        </div>

        {step === 'select' ? (
          <div className="overflow-y-auto p-5 sm:p-8">
            <div className="mx-auto grid max-w-3xl items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
              <label className="block text-sm font-medium text-on-surface">
                Tuần nguồn
                <input type="date" value={sourceDate} onChange={event => setSourceDate(getMonday(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface" />
                <span className="mt-2 block text-xs text-on-surface-variant">{getWeekLabel(getMonday(sourceDate))}</span>
              </label>
              <ArrowRight className="mb-8 hidden h-5 w-5 text-primary md:block" />
              <label className="block text-sm font-medium text-on-surface">
                Tuần đích
                <input type="date" value={targetDate} onChange={event => setTargetDate(getMonday(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface" />
                <span className="mt-2 block text-xs text-on-surface-variant">{getWeekLabel(getMonday(targetDate))}</span>
              </label>
            </div>
            <div className="mx-auto mt-7 max-w-3xl rounded-xl border border-primary/20 bg-primary-subtle p-4 text-sm text-on-surface-variant">
              <CalendarDays className="mb-2 h-5 w-5 text-primary" />
              Đây chỉ là bản xem trước. Lịch sẽ chưa thay đổi cho đến khi bạn bấm <strong className="font-semibold text-on-surface">Xác nhận sao chép</strong>.
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface">{getWeekLabel(sourceDate)} <ArrowRight className="mx-1 inline h-4 w-4 text-primary" /> {getWeekLabel(targetDate)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Sẽ tạo {previewItems.length} ca</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-container px-3 py-2 text-xs font-medium text-on-warning-container">
                <AlertTriangle className="h-4 w-4" /> Ca bị trùng sẽ không được lưu.
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-surface-2/60 text-xs font-medium text-on-surface-variant">
                  <tr><th className="px-4 py-3 font-medium">Lịch gốc</th><th className="px-4 py-3 font-medium">Nhân viên</th><th className="px-4 py-3 font-medium">Ngày mới</th><th className="px-4 py-3 font-medium">Ca làm việc</th><th className="px-4 py-3 font-medium">Ghi chú</th><th className="w-12 px-4 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {previewItems.map(item => {
                    const originalShift = shiftById.get(item.shiftId || -1);
                    return (
                      <tr key={item.key} className="align-top hover:bg-surface-2/50">
                        <td className="px-4 py-3"><p className="font-medium text-on-surface">{formatDate(item.sourceDate)}</p><p className="mt-1 text-xs text-on-surface-variant">{originalShift?.code || 'Ca cũ'}</p></td>
                        <td className="px-4 py-3"><select value={item.userId} onChange={event => updateItem(item.key, { userId: event.target.value })} className="h-10 w-full min-w-44 rounded-lg border border-outline-variant bg-surface px-2 text-on-surface"><option value="">Chọn người</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
                        <td className="px-4 py-3"><input type="date" min={targetDate} max={addDays(targetDate, 6)} value={item.workDate} onChange={event => updateItem(item.key, { workDate: event.target.value })} className="h-10 rounded-lg border border-outline-variant bg-surface px-2 text-on-surface" /></td>
                        <td className="px-4 py-3"><select value={item.shiftId || ''} onChange={event => updateItem(item.key, { shiftId: Number(event.target.value) || null })} className="h-10 w-full min-w-48 rounded-lg border border-outline-variant bg-surface px-2 text-on-surface"><option value="">Chọn ca</option>{activeShifts.map(shift => <option key={shift.id} value={shift.id}>{shift.code} - {shift.name} ({shift.startTime.slice(0, 5)}-{shift.endTime.slice(0, 5)})</option>)}</select></td>
                        <td className="px-4 py-3"><input value={item.note} onChange={event => updateItem(item.key, { note: event.target.value })} placeholder="Ghi chú" className="h-10 w-full min-w-40 rounded-lg border border-outline-variant bg-surface px-2 text-on-surface" /></td>
                        <td className="px-4 py-3"><button type="button" onClick={() => setPreviewItems(current => current.filter(row => row.key !== item.key))} className="rounded-lg p-2 text-error hover:bg-error-container" title="Bỏ dòng này" aria-label="Bỏ dòng này"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {previewItems.length === 0 && <EmptyState compact icon={CalendarDays} title="Không còn ca nào để sao chép" />}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-5 py-4 sm:px-6">
          {step === 'preview' && <button type="button" onClick={() => setStep('select')} disabled={isSaving} className="btn-secondary">Chọn lại tuần</button>}
          <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary">Hủy</button>
          {step === 'select' ? (
            <button type="button" onClick={loadPreview} disabled={isLoading} className="btn-primary">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Xem trước</button>
          ) : (
            <button type="button" onClick={submit} disabled={isSaving || previewItems.length === 0} className="btn-primary disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Xác nhận sao chép</button>
          )}
        </div>
      </div>
    </div>
  );
}
