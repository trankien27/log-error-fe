import { create } from 'zustand';
import { Booth } from '../types';
import { boothsService } from '../services/api/boothsService';

interface BoothsState {
  booths: Booth[];
  isLoading: boolean;
  error: string | null;

  // Search queries
  searchQuery: string;

  // Modals & Form editing states
  isBoothModalOpen: boolean;
  currentEditingBooth: Booth | null;

  // Setters/Actions
  setSearchQuery: (query: string) => void;
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
  isBoothModalOpen: false,
  currentEditingBooth: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsBoothModalOpen: (isBoothModalOpen) => set({ isBoothModalOpen }),
  setCurrentEditingBooth: (currentEditingBooth) => set({ currentEditingBooth }),

  fetchBooths: async () => {
    set({ isLoading: true });
    try {
      const booths = await boothsService.getAll();
      set({ booths, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveBooth: async (booth, isEdit) => {
    try {
      const savedBooth = await boothsService.save(booth, isEdit);
      set((state) => {
        const updated = isEdit
          ? state.booths.map(b => b.id === savedBooth.id ? savedBooth : b)
          : [...state.booths, savedBooth];
        return { booths: updated };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteBooth: async (id) => {
    try {
      await boothsService.delete(id);
      set((state) => ({
        booths: state.booths.filter(b => b.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  getFilteredBooths: () => {
    const { booths, searchQuery } = get();
    return booths.filter(b => {
      const sQuery = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(sQuery) ||
        b.id.toLowerCase().includes(sQuery) ||
        b.ultraviewId.includes(sQuery)
      );
    });
  }
}));
