import { create } from 'zustand';
import { scheduleService } from '../services/api/scheduleService';
import { CalendarDayDto, ShiftDto, WorkScheduleWeekResponse } from '../types';

interface ScheduleState {
  shifts: any[];
  shiftDefinitions: ShiftDto[];
  calendarDays: CalendarDayDto[];
  weekSchedule: WorkScheduleWeekResponse | null;
  weekStart: string;
  weekEnd: string;
  isLoading: boolean;
  error: string | null;

  scheduleTeamMode: 'team' | 'my';
  scheduleSearchQuery: string;
  scheduleRoleFilter: string;
  scheduleShiftFilter: string;
  scheduleStatusFilter: string;

  isCreateShiftModalOpen: boolean;

  setScheduleTeamMode: (mode: 'team' | 'my') => void;
  setScheduleSearchQuery: (query: string) => void;
  setScheduleRoleFilter: (role: string) => void;
  setScheduleShiftFilter: (shiftId: string) => void;
  setScheduleStatusFilter: (status: string) => void;
  setIsCreateShiftModalOpen: (isOpen: boolean) => void;
  setWeekSchedule: (weekSchedule: WorkScheduleWeekResponse | null) => void;

  fetchShifts: () => Promise<void>;
  fetchCalendar: (fromDate: string, toDate: string) => Promise<void>;
  fetchWeekSchedule: (date: string, filters?: {
    userId?: string;
    shiftId?: number | string;
    storeId?: string | number;
    departmentId?: string | number;
    keyword?: string;
  }) => Promise<void>;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
  };
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  shifts: [],
  shiftDefinitions: [],
  calendarDays: [],
  weekSchedule: null,
  ...getCurrentWeekRange(),
  isLoading: false,
  error: null,

  scheduleTeamMode: 'team',
  scheduleSearchQuery: '',
  scheduleRoleFilter: 'Tất cả vai trò',
  scheduleShiftFilter: '',
  scheduleStatusFilter: '',

  isCreateShiftModalOpen: false,

  setScheduleTeamMode: (scheduleTeamMode) => set({ scheduleTeamMode }),
  setScheduleSearchQuery: (scheduleSearchQuery) => set({ scheduleSearchQuery }),
  setScheduleRoleFilter: (scheduleRoleFilter) => set({ scheduleRoleFilter }),
  setScheduleShiftFilter: (scheduleShiftFilter) => set({ scheduleShiftFilter }),
  setScheduleStatusFilter: (scheduleStatusFilter) => set({ scheduleStatusFilter }),
  setIsCreateShiftModalOpen: (isCreateShiftModalOpen) => set({ isCreateShiftModalOpen }),
  setWeekSchedule: (weekSchedule) => set({
    weekSchedule,
    shifts: weekSchedule?.users.flatMap((user) => user.schedules) || [],
  }),

  fetchShifts: async () => {
    const { weekStart, weekEnd } = getCurrentWeekRange();
    await get().fetchCalendar(weekStart, weekEnd);
  },

  fetchCalendar: async (fromDate, toDate) => {
    await get().fetchWeekSchedule(fromDate || toDate);
  },

  fetchWeekSchedule: async (date, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const [shiftDefinitions, weekSchedule] = await Promise.all([
        scheduleService.getShifts(true),
        scheduleService.getWeekSchedule({ date, ...filters }),
      ]);

      set({
        shiftDefinitions,
        weekSchedule,
        calendarDays: [],
        shifts: weekSchedule.users.flatMap((user) => user.schedules),
        weekStart: weekSchedule.startDate,
        weekEnd: weekSchedule.endDate,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
