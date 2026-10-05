import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, Clock, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { storesService } from '../../../services/api/storesService';
import { useStoresStore } from '../../../stores/useStoresStore';
import { EmptyState, FilterBar, PageHeader, SectionCard, TableSkeletonRows } from '../../../components/ui';

const syncedAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatSyncedAt(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : syncedAtFormatter.format(date);
}

export default function StoresTab() {
  const {
    stores,
    isLoading,
    error,
    searchQuery,
    storePageIndex,
    storePageSize,
    storeTotalItems,
    storeTotalPages,
    latestStoreSyncedAt,
    setSearchQuery,
    setStorePageIndex,
    setStorePageSize,
    fetchStores,
  } = useStoresStore();

  const syncStoresMutation = useMutation({
    mutationFn: storesService.syncStores,
    onSuccess: result => {
      toast.success(`Đã đồng bộ cửa hàng: +${result.added}, cập nhật ${result.updated}, xóa ${result.deleted}.`);
      if (storePageIndex === 0) {
        void fetchStores();
      } else {
        setStorePageIndex(0);
      }
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể đồng bộ cửa hàng.');
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchStores();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchStores, searchQuery, storePageIndex, storePageSize]);

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Cửa hàng"
        icon={Building2}
        description="Danh sách cửa hàng và chi nhánh đồng bộ từ FunStudio."
        actions={
          <>
            <button
              type="button"
              onClick={() => void fetchStores()}
              disabled={isLoading || syncStoresMutation.isPending}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => syncStoresMutation.mutate()}
              disabled={syncStoresMutation.isPending || isLoading}
              className="btn-primary"
            >
              <RefreshCw className={`w-4 h-4 ${syncStoresMutation.isPending ? 'animate-spin' : ''}`} />
              Đồng bộ cửa hàng
            </button>
          </>
        }
      />

      <FilterBar
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
            <span className="font-medium">{storeTotalItems} cửa hàng</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Cập nhật: {formatSyncedAt(latestStoreSyncedAt)}
            </span>
          </div>
        }
      >
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="search"
            placeholder="Tìm theo tên cửa hàng..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            aria-label="Tìm cửa hàng"
          />
        </div>
      </FilterBar>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error-container p-3 text-sm text-on-error-container flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <SectionCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant select-none">
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 w-44">Mã cửa hàng</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Tên cửa hàng / chi nhánh</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 w-56">Đồng bộ lần cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <TableSkeletonRows rows={6} columns={3} />
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      compact
                      icon={Building2}
                      title="Không tìm thấy cửa hàng"
                      description="Thử đổi từ khóa tìm kiếm hoặc đồng bộ lại."
                    />
                  </td>
                </tr>
              ) : (
                stores.map(store => (
                  <tr key={store.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary text-sm">{store.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-primary-subtle text-primary inline-flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <span className="font-medium text-on-surface text-sm">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {formatSyncedAt(store.lastSyncedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Hiển thị</span>
            <select
              value={storePageSize}
              onChange={event => setStorePageSize(Number(event.target.value))}
              className="h-8 px-2 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface"
              aria-label="Số cửa hàng mỗi trang"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>mỗi trang</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm text-on-surface-variant tabular-nums">
              Trang {storeTotalPages === 0 ? 0 : storePageIndex + 1}/{storeTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStorePageIndex(Math.max(storePageIndex - 1, 0))}
                disabled={isLoading || storePageIndex <= 0}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang trước"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStorePageIndex(storePageIndex + 1)}
                disabled={isLoading || storeTotalPages === 0 || storePageIndex + 1 >= storeTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang sau"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
