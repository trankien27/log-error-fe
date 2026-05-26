import { create } from 'zustand';
import type { Task, TaskAttachment } from '@/features/tasks/types/task.type';
import { taskApi } from '@/features/tasks/api/task.api';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Kanban Modals
  isTaskModalOpen: boolean;
  currentEditingTask: Task | null;
  selectedTaskDetails: Task | null;

  // Actions
  setIsTaskModalOpen: (isOpen: boolean) => void;
  setCurrentEditingTask: (task: Task | null) => void;
  setSelectedTaskDetails: (task: Task | null) => void;

  fetchTasks: () => Promise<void>;
  saveTask: (task: Omit<Task, 'id' | 'commentsCount'> & { id?: string }) => Promise<void>;
  updateTaskStatus: (id: string, newStatus: 'pending' | 'progress' | 'done') => Promise<void>;
  updateTaskNotes: (id: string, notes: string) => Promise<void>;
  addAttachment: (id: string, file: TaskAttachment) => Promise<void>;
  deleteAttachment: (id: string, fileName: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  isTaskModalOpen: false,
  currentEditingTask: null,
  selectedTaskDetails: null,

  setIsTaskModalOpen: (isTaskModalOpen) => set({ isTaskModalOpen }),
  setCurrentEditingTask: (currentEditingTask) => set({ currentEditingTask }),
  setSelectedTaskDetails: (selectedTaskDetails) => set({ selectedTaskDetails }),

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const tasks = await taskApi.getAll();
      set({ tasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveTask: async (taskData) => {
    try {
      const saved = await taskApi.save(taskData);
      set((state) => {
        const exists = state.tasks.some(t => t.id === saved.id);
        return {
          tasks: exists 
            ? state.tasks.map(t => t.id === saved.id ? saved : t) 
            : [...state.tasks, saved]
        };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateTaskStatus: async (id, newStatus) => {
    try {
      const updated = await taskApi.updateStatus(id, newStatus);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        selectedTaskDetails: state.selectedTaskDetails?.id === id ? updated : state.selectedTaskDetails
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateTaskNotes: async (id, notes) => {
    try {
      const updated = await taskApi.updateNotes(id, notes);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        selectedTaskDetails: state.selectedTaskDetails?.id === id ? updated : state.selectedTaskDetails
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addAttachment: async (id, file) => {
    try {
      const updated = await taskApi.addAttachment(id, file);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        selectedTaskDetails: state.selectedTaskDetails?.id === id ? updated : state.selectedTaskDetails
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteAttachment: async (id, fileName) => {
    try {
      const updated = await taskApi.deleteAttachment(id, fileName);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        selectedTaskDetails: state.selectedTaskDetails?.id === id ? updated : state.selectedTaskDetails
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
