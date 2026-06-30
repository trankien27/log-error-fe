import { create } from 'zustand';
import { shiftsService, ShiftsQuery } from '../services/api/shiftsService';
import { CreateShiftRequest, ShiftDto } from '../types';

type ShiftStatusFilter = 'all' | 'active' | 'inactive';

interface ShiftsState {
  shifts: ShiftDto[];
  selectedShift: ShiftDto | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  keyword: string;
  statusFilter: ShiftStatusFilter;
  isCreateModalOpen: boolean;

  setKeyword: (keyword: string) => void;
  setStatusFilter: (statusFilter: ShiftStatusFilter) => void;
  setIsCreateModalOpen: (isCreateModalOpen: boolean) => void;
  fetchShifts: () => Promise<void>;
  fetchShiftDetail: (id: number) => Promise<void>;
  createShift: (request: CreateShiftRequest) => Promise<void>;
  updateShiftStatus: (id: number, isActive: boolean) => Promise<void>;
}

function toQuery(statusFilter: ShiftStatusFilter, keyword: string): ShiftsQuery {
  return {
    isActive: statusFilter === 'all' ? null : statusFilter === 'active',
    keyword: keyword.trim() || undefined,
  };
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  shifts: [],
  selectedShift: null,
  isLoading: false,
  isSaving: false,
  error: null,
  keyword: '',
  statusFilter: 'active',
  isCreateModalOpen: false,

  setKeyword: (keyword) => set({ keyword }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setIsCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),

  fetchShifts: async () => {
    const { statusFilter, keyword } = get();
    set({ isLoading: true, error: null });
    try {
      const shifts = await shiftsService.getAll(toQuery(statusFilter, keyword));
      set({ shifts, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchShiftDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const selectedShift = await shiftsService.getById(id);
      set({ selectedShift, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  createShift: async (request) => {
    set({ isSaving: true, error: null });
    try {
      const created = await shiftsService.create(request);
      set((state) => ({
        shifts: [created, ...state.shifts],
        selectedShift: created,
        isSaving: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isSaving: false });
      throw err;
    }
  },

  updateShiftStatus: async (id, isActive) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await shiftsService.updateStatus(id, isActive);
      set((state) => ({
        shifts: state.shifts.map(shift => shift.id === id ? updated : shift),
        selectedShift: state.selectedShift?.id === id ? updated : state.selectedShift,
        isSaving: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isSaving: false });
      throw err;
    }
  },
}));
