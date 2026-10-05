import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Filter, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesService } from '../../../services/api/activitiesService';
import { RecentActivity } from '../../../types';
import { EmptyState, FilterBar, ListSkeleton, PageHeader, confirmAction } from '../../../components/ui';

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
    const confirmed = await confirmAction({
      title: 'Xóa hoạt động này?',
      content: activity.description,
    });
    if (!confirmed) return;

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

  const hasFilters = Boolean(date || activityTypeInput || Object.keys(filters).length > 0);
  const inputClass =
    'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="text-left">
      <PageHeader
        title="Hoạt động gần đây"
        description="Theo dõi các thay đổi mới nhất trong hệ thống."
        icon={History}
      />

      <form onSubmit={applyFilters}>
        <FilterBar onReset={hasFilters && !isLoading ? clearFilters : undefined}>
          <label className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span className="sr-only sm:not-sr-only">Ngày</span>
            <input
              type="date"
              aria-label="Ngày xảy ra"
              value={date}
              onChange={event => setDate(event.target.value)}
              className={`${inputClass} w-40`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span className="sr-only sm:not-sr-only">Loại</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Loại hoạt động"
              placeholder="Tất cả loại"
              value={activityTypeInput}
              onChange={event => setActivityTypeInput(event.target.value)}
              className={`${inputClass} w-32`}
            />
          </label>
          <button type="submit" disabled={isLoading} className="btn-primary h-9 px-3 text-sm">
            <Filter className="h-4 w-4" /> Lọc
          </button>
        </FilterBar>
      </form>

      <section className="card-surface overflow-hidden">
        <div className="divide-y divide-outline-variant">
          {isLoading ? (
            <ListSkeleton rows={6} className="p-4 sm:p-5" />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={History}
              title="Chưa có hoạt động nào"
              description={hasFilters ? 'Thử đổi bộ lọc để xem thêm kết quả.' : 'Các thay đổi mới sẽ xuất hiện ở đây.'}
            />
          ) : (
            activities.map(activity => (
              <article key={activity.id} className="group flex gap-3 p-4 transition-colors hover:bg-surface-2/50 sm:px-5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
                      {activity.activityTypeLabel || `Loại ${activity.activityType}`}
                    </span>
                    {activity.entityCode && (
                      <span className="font-mono text-xs font-medium text-on-surface-variant">{activity.entityCode}</span>
                    )}
                  </div>
                  <p className="mt-1.5 break-words text-sm leading-6 text-on-surface">{activity.description}</p>
                  <time dateTime={activity.occurredAt} className="mt-0.5 block text-xs text-on-surface-variant">
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

        <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-2/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-sm text-on-surface-variant">Hiển thị {activities.length} / {totalItems} hoạt động</span>
          <div className="flex items-center gap-2">
            <span className="min-w-[72px] text-center text-xs font-medium text-on-surface-variant">
              Trang {totalPages === 0 ? 0 : pageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex(current => Math.max(1, current - 1))}
              disabled={isLoading || pageIndex <= 1}
              aria-label="Trang trước"
              title="Trang trước"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPageIndex(current => current + 1)}
              disabled={isLoading || totalPages === 0 || pageIndex >= totalPages}
              aria-label="Trang sau"
              title="Trang sau"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
