import type { Task, TaskAttachment } from '@/features/tasks/types/task.type';
import { apiClient } from '@/services/api/apiClient';

export const taskApi = {
  getAll: async (): Promise<Task[]> => {
    return apiClient.get<Task[]>('/tasks');
  },

  save: async (task: Omit<Task, 'id' | 'commentsCount'> & { id?: string }): Promise<Task> => {
    if (task.id) {
      return apiClient.put<Task>(`/tasks/${encodeURIComponent(task.id)}`, task);
    }
    return apiClient.post<Task>('/tasks', task);
  },

  updateStatus: async (id: string, newStatus: 'pending' | 'progress' | 'done'): Promise<Task> => {
    return apiClient.patch<Task>(`/tasks/${encodeURIComponent(id)}/status`, { status: newStatus });
  },

  updateNotes: async (id: string, notes: string): Promise<Task> => {
    return apiClient.patch<Task>(`/tasks/${encodeURIComponent(id)}/notes`, { notes });
  },

  addAttachment: async (id: string, attachment: TaskAttachment): Promise<Task> => {
    return apiClient.post<Task>(`/tasks/${encodeURIComponent(id)}/attachments`, attachment);
  },

  deleteAttachment: async (id: string, attachmentName: string): Promise<Task> => {
    return apiClient.delete<Task>(
      `/tasks/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentName)}`,
    );
  }
};
