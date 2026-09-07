import { create } from 'zustand';
import { Booth } from '../types';
import { boothsService } from '../services/api/boothsService';

interface BoothsState {
  booths: Booth[];
  isLoading: boolean;
  error: string | null;

  // Search queries
  searchQuery: string;
  boothPageIndex: number;
  boothPageSize: number;
  boothTotalItems: number;
  boothTotalPages: number;
  latestBoothSyncedAt: string | null;

  // Modals & Form editing states
  isBoothModalOpen: boolean;
  currentEditingBooth: Booth | null;

  // Setters/Actions
  setSearchQuery: (query: string) => void;
  setBoothPageIndex: (pageIndex: number) => void;
  setBoothPageSize: (pageSize: number) => void;
  setIsBoothModalOpen: (isOpen: boolean) => void;
  setCurrentEditingBooth: (booth: Booth | null) => void;

  fetchBooths: () => Promise<void>;
  saveBooth: (booth: Booth, isEdit: boolean) => Promise<void>;
  deleteBooth: (id: string) => Promise<void>;

  // Helpers
  getFilteredBooths: () => Booth[];
}

export const useBoothsStore = create<BoothsState>((set, get) => ({
  booths: [],
  isLoading: false,
  error: null,

  searchQuery: '',
  boothPageIndex: 0,
  boothPageSize: 20,
  boothTotalItems: 0,
  boothTotalPages: 0,
  latestBoothSyncedAt: null,
  isBoothModalOpen: false,
  currentEditingBooth: null,

  setSearchQuery: (searchQuery) => set({ searchQuery, boothPageIndex: 0 }),
  setBoothPageIndex: (boothPageIndex) => set({ boothPageIndex }),
  setBoothPageSize: (boothPageSize) => set({ boothPageSize, boothPageIndex: 0 }),
  setIsBoothModalOpen: (isBoothModalOpen) => set({ isBoothModalOpen }),
  setCurrentEditingBooth: (currentEditingBooth) => set({ currentEditingBooth }),

  fetchBooths: async () => {
    const { searchQuery, boothPageIndex, boothPageSize } = get();
    set({ isLoading: true, error: null });
    try {
      const [result, latestBoothSyncedAt] = await Promise.all([
        boothsService.getPage({
          search: searchQuery,
          pageIndex: boothPageIndex,
          pageSize: boothPageSize,
        }),
        boothsService.getLatestSync(),
      ]);
      set({
        booths: result.items,
        boothTotalItems: result.totalItems,
        boothTotalPages: result.totalPages,
        boothPageIndex: result.pageIndex,
        boothPageSize: result.pageSize,
        latestBoothSyncedAt,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveBooth: async (booth, isEdit) => {
    set({ isLoading: true, error: null });
    try {
      const savedBooth = await boothsService.save(booth, isEdit);
      set((state) => ({
        booths: isEdit
          ? state.booths.map(b => b.id === savedBooth.id ? savedBooth : b)
          : [savedBooth, ...state.booths].slice(0, state.boothPageSize),
        isLoading: false,
      }));
      await get().fetchBooths();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteBooth: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await boothsService.delete(id);
      set((state) => ({
        booths: state.booths.filter(b => b.id !== id),
        isLoading: false
      }));
      await get().fetchBooths();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  getFilteredBooths: () => {
    const { booths, searchQuery } = get();
    return booths.filter(b => {
      const sQuery = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(sQuery) ||
        b.id.toLowerCase().includes(sQuery) ||
        (b.code || '').toLowerCase().includes(sQuery) ||
        b.ultraviewId.toLowerCase().includes(sQuery)
      );
    });
  }
}));
