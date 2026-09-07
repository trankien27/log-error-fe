import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, Clock, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { storesService } from '../../../services/api/storesService';
import { useStoresStore } from '../../../stores/useStoresStore';

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
      toast.success(`Đã sync cửa hàng: +${result.added}, cập nhật ${result.updated}, xóa ${result.deleted}.`);
      if (storePageIndex === 0) {
        void fetchStores();
      } else {
        setStorePageIndex(0);
      }
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể sync cửa hàng.');
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchStores();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchStores, searchQuery, storePageIndex, storePageSize]);

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Quản lý cửa hàng</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Danh sách cửa hàng và chi nhánh được đồng bộ từ hệ thống FunStudio.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <Clock className="w-4 h-4 text-primary" />
          <span>Cập nhật gần nhất: {formatSyncedAt(latestStoreSyncedAt)}</span>
        </div>
      </div>

      <div className="card-surface p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="search"
            placeholder="Tìm theo tên cửa hàng..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-xs"
            aria-label="Tìm cửa hàng"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
          <span className="text-xs text-on-surface-variant font-medium mr-auto md:mr-0">
            {storeTotalItems} cửa hàng
          </span>
          <button
            type="button"
            onClick={() => syncStoresMutation.mutate()}
            disabled={syncStoresMutation.isPending || isLoading}
            className="h-9 px-3 border border-success/30 rounded-lg bg-surface text-success hover:bg-success-container text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStoresMutation.isPending ? 'animate-spin' : ''}`} />
            Sync cửa hàng
          </button>
          <button
            type="button"
            onClick={() => void fetchStores()}
            disabled={isLoading || syncStoresMutation.isPending}
            className="h-9 px-3 border border-outline-variant rounded-lg hover:bg-surface-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container p-3 text-xs font-medium text-on-error-container flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant font-bold select-none font-sans">
                <th className="py-4 px-5 w-44">Mã cửa hàng</th>
                <th className="py-4 px-5">Tên cửa hàng / Chi nhánh</th>
                <th className="py-4 px-5 w-56">Đồng bộ lần cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center font-sans font-bold text-on-surface-variant">
                    Đang tải dữ liệu cửa hàng...
                  </td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center font-sans font-bold text-on-surface-variant">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Không tìm thấy cửa hàng nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                stores.map(store => (
                  <tr key={store.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-primary text-sm">{store.id}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-on-surface text-sm">{store.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-on-surface-variant font-medium tabular-nums">
                      {formatSyncedAt(store.lastSyncedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant bg-surface-2 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span>Hiển thị</span>
            <select
              value={storePageSize}
              onChange={event => setStorePageSize(Number(event.target.value))}
              className="h-8 px-2 border border-outline-variant rounded-lg bg-surface text-xs font-bold focus:outline-primary"
              aria-label="Số cửa hàng mỗi trang"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>mỗi trang</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-semibold text-on-surface-variant">
              Trang {storeTotalPages === 0 ? 0 : storePageIndex + 1}/{storeTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStorePageIndex(Math.max(storePageIndex - 1, 0))}
                disabled={isLoading || storePageIndex <= 0}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStorePageIndex(storePageIndex + 1)}
                disabled={isLoading || storeTotalPages === 0 || storePageIndex + 1 >= storeTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
