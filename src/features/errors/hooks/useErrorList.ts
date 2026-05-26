import { create } from 'zustand';
import type { ErrorLog } from '@/features/errors/types/error.type';
import { errorApi } from '@/features/errors/api/error.api';

interface LogsState {
  logs: ErrorLog[];
  isLoading: boolean;
  error: string | null;

  // Filter & Search states
  searchQuery: string;
  logStoreFilter: string;
  logBoothFilter: string;

  // Modals & form editing states
  isLogModalOpen: boolean;
  currentEditingLog: ErrorLog | null;

  // Action methods
  setSearchQuery: (query: string) => void;
  setLogStoreFilter: (store: string) => void;
  setLogBoothFilter: (booth: string) => void;
  setIsLogModalOpen: (isOpen: boolean) => void;
  setCurrentEditingLog: (log: ErrorLog | null) => void;
  
  fetchLogs: () => Promise<void>;
  addLog: (log: Omit<ErrorLog, 'id' | 'reportTime'>) => Promise<void>;
  updateLog: (id: string, fields: Partial<ErrorLog>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  
  // Helpers
  getFilteredLogs: () => ErrorLog[];
}

export const useLogsStore = create<LogsState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,

  searchQuery: '',
  logStoreFilter: '',
  logBoothFilter: '',

  isLogModalOpen: false,
  currentEditingLog: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLogStoreFilter: (logStoreFilter) => set({ logStoreFilter }),
  setLogBoothFilter: (logBoothFilter) => set({ logBoothFilter }),
  setIsLogModalOpen: (isLogModalOpen) => set({ isLogModalOpen }),
  setCurrentEditingLog: (currentEditingLog) => set({ currentEditingLog }),

  fetchLogs: async () => {
    set({ isLoading: true });
    try {
      const logs = await errorApi.getAll();
      set({ logs, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addLog: async (logData) => {
    try {
      const newLog = await errorApi.create(logData);
      set((state) => ({ logs: [newLog, ...state.logs] }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateLog: async (id, fields) => {
    try {
      const updatedLog = await errorApi.update(id, fields);
      set((state) => ({
        logs: state.logs.map(l => l.id === id ? updatedLog : l)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteLog: async (id) => {
    try {
      await errorApi.delete(id);
      set((state) => ({
        logs: state.logs.filter(l => l.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  getFilteredLogs: () => {
    const { logs, searchQuery, logStoreFilter, logBoothFilter } = get();
    return logs.filter(log => {
      const sQuery = searchQuery.toLowerCase();
      const titleMatch = 
        log.title.toLowerCase().includes(sQuery) || 
        log.id.toLowerCase().includes(sQuery) || 
        log.reporter.toLowerCase().includes(sQuery);
      const storeMatch = logStoreFilter ? log.store === logStoreFilter : true;
      const boothMatch = logBoothFilter ? log.booth === logBoothFilter : true;
      return titleMatch && storeMatch && boothMatch;
    });
  }
}));
