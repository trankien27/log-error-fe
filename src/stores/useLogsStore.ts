import { create } from 'zustand';
import { ErrorGroup, ErrorLog, ErrorLogStatus, Severity } from '../types';
import { ErrorLogPayload, ErrorLogQuery, logsService } from '../services/api/logsService';

interface LogsState {
  logs: ErrorLog[];
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;

  searchQuery: string;
  logStoreFilter: string;
  logBoothFilter: string;
  logStatusFilter: '' | ErrorLogStatus;
  logMonthFilter: '' | number;
  logErrorGroupFilter: '' | ErrorGroup;
  logSeverityFilter: '' | Severity;

  isLogModalOpen: boolean;
  currentEditingLog: ErrorLog | null;

  setSearchQuery: (query: string) => void;
  setLogStoreFilter: (store: string) => void;
  setLogBoothFilter: (booth: string) => void;
  setLogStatusFilter: (status: '' | ErrorLogStatus) => void;
  setLogMonthFilter: (month: '' | number) => void;
  setLogErrorGroupFilter: (group: '' | ErrorGroup) => void;
  setLogSeverityFilter: (severity: '' | Severity) => void;
  setIsLogModalOpen: (isOpen: boolean) => void;
  setCurrentEditingLog: (log: ErrorLog | null) => void;

  fetchLogs: (query?: ErrorLogQuery) => Promise<void>;
  addLog: (log: ErrorLogPayload) => Promise<void>;
  updateLog: (id: string, log: ErrorLogPayload) => Promise<void>;
  updateLogStatus: (id: string, status: ErrorLogStatus) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  exportLogs: (query?: ErrorLogQuery) => Promise<void>;

  getFilteredLogs: () => ErrorLog[];
}

export const useLogsStore = create<LogsState>((set, get) => ({
  logs: [],
  isLoading: false,
  isExporting: false,
  error: null,

  searchQuery: '',
  logStoreFilter: '',
  logBoothFilter: '',
  logStatusFilter: '',
  logMonthFilter: '',
  logErrorGroupFilter: '',
  logSeverityFilter: '',

  isLogModalOpen: false,
  currentEditingLog: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLogStoreFilter: (logStoreFilter) => set({ logStoreFilter }),
  setLogBoothFilter: (logBoothFilter) => set({ logBoothFilter }),
  setLogStatusFilter: (logStatusFilter) => set({ logStatusFilter }),
  setLogMonthFilter: (logMonthFilter) => set({ logMonthFilter }),
  setLogErrorGroupFilter: (logErrorGroupFilter) => set({ logErrorGroupFilter }),
  setLogSeverityFilter: (logSeverityFilter) => set({ logSeverityFilter }),
  setIsLogModalOpen: (isLogModalOpen) => set({ isLogModalOpen }),
  setCurrentEditingLog: (currentEditingLog) => set({ currentEditingLog }),

  fetchLogs: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const logs = await logsService.getAll(query);
      set({ logs, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addLog: async (logData) => {
    set({ isLoading: true, error: null });
    try {
      const newLog = await logsService.create(logData);
      set((state) => ({ logs: [newLog, ...state.logs], isLoading: false }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateLog: async (id, logData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLog = await logsService.update(id, logData);
      set((state) => ({
        logs: state.logs.map(log => log.id === id ? updatedLog : log),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateLogStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLog = await logsService.updateStatus(id, status);
      set((state) => ({
        logs: state.logs.map(log => log.id === id ? updatedLog : log),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await logsService.delete(id);
      set((state) => ({
        logs: state.logs.filter(log => log.id !== id),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  exportLogs: async (query) => {
    set({ isExporting: true, error: null });
    try {
      const { blob, fileName } = await logsService.exportExcel(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      set({ isExporting: false });
    } catch (err: any) {
      set({ error: err.message, isExporting: false });
      throw err;
    }
  },

  getFilteredLogs: () => {
    const {
      logs,
      searchQuery,
      logStoreFilter,
      logBoothFilter,
      logStatusFilter,
      logMonthFilter,
      logErrorGroupFilter,
      logSeverityFilter,
    } = get();
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return logs.filter(log => {
      const searchMatch = normalizedQuery
        ? [log.errorCode, log.store, log.description, log.assignedToName]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(normalizedQuery))
        : true;
      const storeMatch = logStoreFilter ? log.store === logStoreFilter : true;
      const boothMatch = logBoothFilter ? log.booth === logBoothFilter : true;
      const statusMatch = logStatusFilter ? log.status === logStatusFilter : true;
      const monthMatch = logMonthFilter ? log.month === logMonthFilter : true;
      const groupMatch = logErrorGroupFilter ? log.errorGroup === logErrorGroupFilter : true;
      const severityMatch = logSeverityFilter ? log.severity === logSeverityFilter : true;

      return searchMatch && storeMatch && boothMatch && statusMatch && monthMatch && groupMatch && severityMatch;
    });
  },
}));
