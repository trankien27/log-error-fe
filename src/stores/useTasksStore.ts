import { create } from "zustand";
import { Task } from "../types";
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
  ) => Promise<Task>;
  updateTaskStatus: (
    id: string,
    newStatus: "pending" | "progress" | "done",
  ) => Promise<void>;
  updateTaskNotes: (id: string, notes: string) => Promise<void>;
  addAttachments: (id: string, files: File[]) => Promise<Task>;
  deleteAttachment: (id: string, attachmentId: string) => Promise<void>;
  getAttachmentDownloadUrl: (id: string, attachmentId: string) => Promise<string>;
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
      return saved;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateTaskStatus: async (id, newStatus) => {
    const previousTask = get().tasks.find((task) => task.id === id);

    if (!previousTask || previousTask.status === newStatus) {
      return;
    }

    const optimisticTask = { ...previousTask, status: newStatus };

    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? optimisticTask : task)),
      selectedTaskDetails:
        state.selectedTaskDetails?.id === id
          ? optimisticTask
          : state.selectedTaskDetails,
      isLoading: true,
      error: null,
    }));

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
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? previousTask : task)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? previousTask
            : state.selectedTaskDetails,
        error: err.message,
        isLoading: false,
      }));
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

  addAttachments: async (id, files) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.addAttachments(id, files);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTaskDetails:
          state.selectedTaskDetails?.id === id
            ? updated
            : state.selectedTaskDetails,
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteAttachment: async (id, attachmentId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await tasksService.deleteAttachment(id, attachmentId);
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

  getAttachmentDownloadUrl: (id, attachmentId) =>
    tasksService.getAttachmentDownloadUrl(id, attachmentId),
}));
