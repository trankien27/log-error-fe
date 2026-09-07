import { create } from 'zustand';
import { storesService } from '../services/api/storesService';
import { Store } from '../types';

interface StoresState {
  stores: Store[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  storePageIndex: number;
  storePageSize: number;
  storeTotalItems: number;
  storeTotalPages: number;
  latestStoreSyncedAt: string | null;
  setSearchQuery: (query: string) => void;
  setStorePageIndex: (pageIndex: number) => void;
  setStorePageSize: (pageSize: number) => void;
  fetchStores: () => Promise<void>;
}

let latestRequestId = 0;

export const useStoresStore = create<StoresState>((set, get) => ({
  stores: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  storePageIndex: 0,
  storePageSize: 20,
  storeTotalItems: 0,
  storeTotalPages: 0,
  latestStoreSyncedAt: null,

  setSearchQuery: searchQuery => set({ searchQuery, storePageIndex: 0 }),
  setStorePageIndex: storePageIndex => set({ storePageIndex }),
  setStorePageSize: storePageSize => set({ storePageSize, storePageIndex: 0 }),

  fetchStores: async () => {
    const requestId = ++latestRequestId;
    const { searchQuery, storePageIndex, storePageSize } = get();
    set({ isLoading: true, error: null });

    try {
      const [result, latestStoreSyncedAt] = await Promise.all([
        storesService.getPage({
          search: searchQuery,
          pageIndex: storePageIndex,
          pageSize: storePageSize,
        }),
        storesService.getLatestSync(),
      ]);

      if (requestId !== latestRequestId) return;

      set({
        stores: result.items,
        storeTotalItems: result.totalItems,
        storeTotalPages: result.totalPages,
        storePageIndex: result.pageIndex,
        storePageSize: result.pageSize,
        latestStoreSyncedAt,
        isLoading: false,
      });
    } catch (error) {
      if (requestId !== latestRequestId) return;

      set({
        error: error instanceof Error ? error.message : 'Không thể tải danh sách cửa hàng.',
        isLoading: false,
      });
    }
  },
}));
