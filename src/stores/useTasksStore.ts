import { create } from "zustand";
import { Task, TaskAttachment } from "../types";
import { tasksService } from "../services/api/tasksService";

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
  saveTask: (
    task: Omit<Task, "id" | "commentsCount"> & { id?: string },
  ) => Promise<void>;
  updateTaskStatus: (
    id: string,
    newStatus: "pending" | "progress" | "done",
  ) => Promise<void>;
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
      const tasks = await tasksService.getAll();
      set({ tasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const saved = await tasksService.save(taskData);
      set((state) => {
        const exists = state.tasks.some((t) => t.id === saved.id);
        return {
          tasks: exists
            ? state.tasks.map((t) => (t.id === saved.id ? saved : t))
            : [saved, ...state.tasks],
          isLoading: false,
        };
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateTaskStatus: async (id, newStatus) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.updateStatus(id, newStatus);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? updated
            : state.selectedTaskDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateTaskNotes: async (id, notes) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.updateNotes(id, notes);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? updated
            : state.selectedTaskDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  addAttachment: async (id, file) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.addAttachment(id, file);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? updated
            : state.selectedTaskDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteAttachment: async (id, fileName) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.deleteAttachment(id, fileName);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? updated
            : state.selectedTaskDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
