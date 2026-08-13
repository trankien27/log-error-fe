import { create } from 'zustand';
import { ErrorGroup, ErrorLog, ErrorLogStatus, ProcessingFlow, Severity } from '../types';
import { ErrorLogPayload, ErrorLogQuery, logsService } from '../services/api/logsService';

interface LogsState {
  logs: ErrorLog[];
  totalItems: number;
  totalPages: number;
  logPageIndex: number;
  logPageSize: number;
  isLoading: boolean;
  isExporting: boolean;
  isSyncingGoogleSheet: boolean;
  error: string | null;

  searchQuery: string;
  logStoreFilter: string;
  logBoothFilter: string;
  logStatusFilter: '' | ErrorLogStatus;
  logMonthFilter: '' | number;
  logErrorGroupFilter: '' | ErrorGroup;
  logProcessingFlowFilter: '' | ProcessingFlow;
  logSeverityFilter: '' | Severity;

  isLogModalOpen: boolean;
  currentEditingLog: ErrorLog | null;

  setSearchQuery: (query: string) => void;
  setLogStoreFilter: (store: string) => void;
  setLogBoothFilter: (booth: string) => void;
  setLogStatusFilter: (status: '' | ErrorLogStatus) => void;
  setLogMonthFilter: (month: '' | number) => void;
  setLogErrorGroupFilter: (group: '' | ErrorGroup) => void;
  setLogProcessingFlowFilter: (flow: '' | ProcessingFlow) => void;
  setLogSeverityFilter: (severity: '' | Severity) => void;
  setLogPageIndex: (pageIndex: number) => void;
  setLogPageSize: (pageSize: number) => void;
  setIsLogModalOpen: (isOpen: boolean) => void;
  setCurrentEditingLog: (log: ErrorLog | null) => void;

  fetchLogs: (query?: ErrorLogQuery) => Promise<void>;
  addLog: (log: ErrorLogPayload) => Promise<ErrorLog>;
  updateLog: (id: string, log: ErrorLogPayload) => Promise<ErrorLog>;
  updateLogStatus: (id: string, status: ErrorLogStatus) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  syncGoogleSheet: () => Promise<void>;
  exportLogs: (query?: ErrorLogQuery) => Promise<void>;

  getFilteredLogs: () => ErrorLog[];
}

export const useLogsStore = create<LogsState>((set, get) => ({
  logs: [],
  totalItems: 0,
  totalPages: 0,
  logPageIndex: 1,
  logPageSize: 20,
  isLoading: false,
  isExporting: false,
  isSyncingGoogleSheet: false,
  error: null,

  searchQuery: '',
  logStoreFilter: '',
  logBoothFilter: '',
  logStatusFilter: '',
  logMonthFilter: '',
  logErrorGroupFilter: '',
  logProcessingFlowFilter: '',
  logSeverityFilter: '',

  isLogModalOpen: false,
  currentEditingLog: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLogStoreFilter: (logStoreFilter) => set({ logStoreFilter, logPageIndex: 1 }),
  setLogBoothFilter: (logBoothFilter) => set({ logBoothFilter, logPageIndex: 1 }),
  setLogStatusFilter: (logStatusFilter) => set({ logStatusFilter, logPageIndex: 1 }),
  setLogMonthFilter: (logMonthFilter) => set({ logMonthFilter, logPageIndex: 1 }),
  setLogErrorGroupFilter: (logErrorGroupFilter) => set({ logErrorGroupFilter, logPageIndex: 1 }),
  setLogProcessingFlowFilter: (logProcessingFlowFilter) => set({ logProcessingFlowFilter, logPageIndex: 1 }),
  setLogSeverityFilter: (logSeverityFilter) => set({ logSeverityFilter, logPageIndex: 1 }),
  setLogPageIndex: (logPageIndex) => set({ logPageIndex }),
  setLogPageSize: (logPageSize) => set({ logPageSize, logPageIndex: 1 }),
  setIsLogModalOpen: (isLogModalOpen) => set({ isLogModalOpen }),
  setCurrentEditingLog: (currentEditingLog) => set({ currentEditingLog }),

  fetchLogs: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const result = await logsService.getAll(query);
      set({
        logs: result.items,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        logPageIndex: result.pageIndex,
        logPageSize: result.pageSize,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addLog: async (logData) => {
    set({ isLoading: true, error: null });
    try {
      const newLog = await logsService.create(logData);
      set((state) => ({ logs: [newLog, ...state.logs], isLoading: false }));
      return newLog;
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
      return updatedLog;
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

  syncGoogleSheet: async () => {
    set({ isSyncingGoogleSheet: true, error: null });
    try {
      await logsService.syncGoogleSheet();
      set({ isSyncingGoogleSheet: false });
    } catch (err: any) {
      set({ error: err.message, isSyncingGoogleSheet: false });
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
      logProcessingFlowFilter,
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
      const processingFlowMatch = logProcessingFlowFilter ? log.processingFlow === logProcessingFlowFilter : true;
      const severityMatch = logSeverityFilter ? log.severity === logSeverityFilter : true;

      return searchMatch && storeMatch && boothMatch && statusMatch && monthMatch && groupMatch && processingFlowMatch && severityMatch;
    });
  },
}));
