import { create } from 'zustand';
import { scheduleService } from '../services/api/scheduleService';

interface ScheduleState {
  shifts: any[];
  isLoading: boolean;
  error: string | null;

  // Filter settings
  scheduleTeamMode: 'team' | 'my';
  scheduleSearchQuery: string;
  scheduleRoleFilter: string;

  // Modals & fields
  isCreateShiftModalOpen: boolean;

  // Setters/Actions
  setScheduleTeamMode: (mode: 'team' | 'my') => void;
  setScheduleSearchQuery: (query: string) => void;
  setScheduleRoleFilter: (role: string) => void;
  setIsCreateShiftModalOpen: (isOpen: boolean) => void;

  fetchShifts: () => Promise<void>;
  saveShift: (shift: any) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  shifts: [],
  isLoading: false,
  error: null,

  scheduleTeamMode: 'team',
  scheduleSearchQuery: '',
  scheduleRoleFilter: 'Tất cả vai trò',

  isCreateShiftModalOpen: false,

  setScheduleTeamMode: (scheduleTeamMode) => set({ scheduleTeamMode }),
  setScheduleSearchQuery: (scheduleSearchQuery) => set({ scheduleSearchQuery }),
  setScheduleRoleFilter: (scheduleRoleFilter) => set({ scheduleRoleFilter }),
  setIsCreateShiftModalOpen: (isCreateShiftModalOpen) => set({ isCreateShiftModalOpen }),

  fetchShifts: async () => {
    set({ isLoading: true });
    try {
      const shifts = await scheduleService.getAll();
      set({ shifts, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveShift: async (shift) => {
    try {
      const saved = await scheduleService.save(shift);
      set((state) => {
        const exists = state.shifts.some(s => s.id === saved.id);
        const updated = exists
          ? state.shifts.map(s => s.id === saved.id ? saved : s)
          : [...state.shifts, saved];
        return { shifts: updated };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteShift: async (id) => {
    try {
      await scheduleService.delete(id);
      set((state) => ({
        shifts: state.shifts.filter(s => s.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
