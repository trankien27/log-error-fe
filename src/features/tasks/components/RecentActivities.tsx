import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Filter, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesService } from '../../../services/api/activitiesService';
import { RecentActivity } from '../../../types';

const PAGE_SIZE = 20;

function formatOccurredAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [date, setDate] = useState('');
  const [activityTypeInput, setActivityTypeInput] = useState('');
  const [filters, setFilters] = useState<{ date?: string; activityType?: number }>({});
  const [pageIndex, setPageIndex] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await activitiesService.getRecent({
        ...filters,
        pageIndex,
        pageSize: PAGE_SIZE,
      });
      setActivities(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải hoạt động gần đây.');
      setActivities([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageIndex]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedActivityType = activityTypeInput === '' ? undefined : Number(activityTypeInput);
    setPageIndex(1);
    setFilters({
      date: date || undefined,
      activityType: Number.isInteger(parsedActivityType) ? parsedActivityType : undefined,
    });
  };

  const clearFilters = () => {
    setDate('');
    setActivityTypeInput('');
    setPageIndex(1);
    setFilters({});
  };

  const handleDelete = async (activity: RecentActivity) => {
    if (!window.confirm(`Xóa hoạt động “${activity.description}”?`)) return;

    setDeletingId(activity.id);
    try {
      await activitiesService.delete(activity.id);
      toast.success('Đã xóa hoạt động.');
      if (activities.length === 1 && pageIndex > 1) {
        setPageIndex(current => current - 1);
      } else {
        await loadActivities();
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể xóa hoạt động.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface text-left">
      <div className="flex flex-col gap-4 border-b border-outline-variant p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-extrabold text-on-surface">Hoạt động gần đây</h3>
          </div>
          <p className="mt-1 text-[11px] text-on-surface-variant">Theo dõi các thay đổi mới nhất trong hệ thống.</p>
        </div>

        <form onSubmit={applyFilters} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-[11px] font-bold text-on-surface-variant">
            Ngày xảy ra
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-medium text-on-surface-variant focus:outline-primary sm:w-40"
            />
          </label>
          <label className="text-[11px] font-bold text-on-surface-variant">
            Loại hoạt động
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="Tất cả"
              value={activityTypeInput}
              onChange={event => setActivityTypeInput(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-medium text-on-surface-variant focus:outline-primary sm:w-32"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary px-3 py-2 text-xs"
            >
              <Filter className="h-3.5 w-3.5" /> Lọc
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={isLoading || (!date && !activityTypeInput && Object.keys(filters).length === 0)}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Xóa lọc
            </button>
          </div>
        </form>
      </div>

      <div className="divide-y divide-outline-variant/40">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-on-surface-variant">Đang tải hoạt động...</div>
        ) : activities.length === 0 ? (
          <div className="empty-state border-none bg-transparent p-10">Không có hoạt động phù hợp.</div>
        ) : (
          activities.map(activity => (
            <article key={activity.id} className="group flex gap-3 p-4 transition-colors hover:bg-surface-2 sm:px-5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                <Clock3 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-primary">
                    {activity.activityTypeLabel || `Loại ${activity.activityType}`}
                  </span>
                  {activity.entityCode && (
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant">{activity.entityCode}</span>
                  )}
                </div>
                <p className="mt-1.5 break-words text-xs font-medium leading-5 text-on-surface-variant">{activity.description}</p>
                <time dateTime={activity.occurredAt} className="mt-1 block text-[10px] text-on-surface-variant">
                  {formatOccurredAt(activity.occurredAt)}
                </time>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(activity)}
                disabled={deletingId === activity.id}
                title="Xóa hoạt động"
                aria-label={`Xóa hoạt động ${activity.entityCode || activity.id}`}
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="text-xs text-on-surface-variant">Hiển thị {activities.length} / {totalItems} hoạt động</span>
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] text-center text-[11px] font-medium text-on-surface-variant">
            Trang {totalPages === 0 ? 0 : pageIndex}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPageIndex(current => Math.max(1, current - 1))}
            disabled={isLoading || pageIndex <= 1}
            aria-label="Trang hoạt động trước"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPageIndex(current => current + 1)}
            disabled={isLoading || totalPages === 0 || pageIndex >= totalPages}
            aria-label="Trang hoạt động sau"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
