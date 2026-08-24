import { Task, TaskAttachment } from '../../types';
import { apiClient } from './apiClient';

type TasksResponse = Task[] | {
  items?: Task[];
};

type TaskStatus = Task['status'];
type TaskPayload = Omit<Task, 'id' | 'commentsCount'> & { id?: string };

const taskStatusToApi: Record<TaskStatus, number> = {
  pending: 0,
  progress: 1,
  done: 2,
};

function normalizeTaskStatus(status: unknown): TaskStatus {
  if (status === 0 || status === '0' || String(status).toLowerCase() === 'pending') {
    return 'pending';
  }

  if (
    status === 1 ||
    status === '1' ||
    String(status).toLowerCase() === 'progress' ||
    String(status).toLowerCase() === 'inprogress' ||
    String(status).toLowerCase() === 'in_progress'
  ) {
    return 'progress';
  }

  return 'done';
}

function normalizeTask(task: any): Task {
  const dueDate = task.deadline || task.dueDate || task.dueAt || '';

  return {
    ...task,
    id: String(task.id ?? task.taskId ?? ''),
    code: task.code,
    title: task.title ?? task.name ?? '',
    description: task.description || '',
    priority: task.priority ?? 1,
    status: normalizeTaskStatus(task.status),
    dueDate,
    dueText: task.dueText || formatDueText(dueDate),
    assigneeId: task.assigneeId || task.assignedToId || task.userId,
    assigneeName: task.assigneeName || task.assignedToName || task.userName || '',
    commentsCount: task.commentsCount ?? 0,
    isOverdue: Boolean(task.isOverdue),
    attachments: Array.isArray(task.attachments)
      ? task.attachments.map(normalizeTaskAttachment)
      : [],
  };
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function normalizeTaskAttachment(attachment: any): TaskAttachment {
  const sizeBytes = Number(attachment.fileSize ?? attachment.sizeBytes ?? 0);

  return {
    id: String(attachment.id ?? ''),
    name: attachment.fileName ?? attachment.name ?? '',
    type: attachment.contentType ?? attachment.type ?? 'application/octet-stream',
    sizeBytes,
    size: attachment.size || formatFileSize(sizeBytes),
    createdAt: attachment.createdAt,
  };
}

function formatDueText(dateValue?: string) {
  if (!dateValue) {
    return 'Hôm nay';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('vi-VN');
}

function toApiDeadline(dateValue?: string) {
  if (!dateValue) {
    return undefined;
  }

  if (dateValue.includes('T')) {
    return dateValue;
  }

  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function buildTaskCode(task: TaskPayload) {
  if (task.code) {
    return task.code;
  }

  if (task.id) {
    return `Task${task.id}`;
  }

  return `Task${Date.now()}`;
}

function buildTaskRequest(task: TaskPayload) {
  if (!task.assigneeId) {
    throw new Error('Vui lòng chọn người đảm nhận từ danh sách người dùng.');
  }

  return {
    code: buildTaskCode(task),
    title: task.title,
    description: task.description || task.notes || '',
    priority: task.priority ?? 1,
    status: taskStatusToApi[task.status],
    deadline: toApiDeadline(task.dueDate || task.dueText),
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
  };
}

export const tasksService = {
  getAll: async (): Promise<Task[]> => {
    const result = await apiClient.get<TasksResponse>('/api/tasks');

    if (Array.isArray(result)) {
      return result.map(normalizeTask);
    }

    return Array.isArray(result.items) ? result.items.map(normalizeTask) : [];
  },

  save: async (task: TaskPayload): Promise<Task> => {
    if (task.id) {
      const updated = await apiClient.put<Task>(`/api/tasks/${encodeURIComponent(task.id)}`, buildTaskRequest(task));
      return normalizeTask(updated);
    }

    const created = await apiClient.post<Task>('/api/tasks', buildTaskRequest(task));
    return normalizeTask(created);
  },

  updateStatus: async (id: string, newStatus: 'pending' | 'progress' | 'done'): Promise<Task> => {
    const updated = await apiClient.patch<Task>(
      `/api/tasks/${encodeURIComponent(id)}/status`,
      { status: taskStatusToApi[newStatus] },
    );
    return normalizeTask(updated);
  },

  updateNotes: async (id: string, notes: string): Promise<Task> => {
    const updated = await apiClient.patch<Task>(
      `/api/tasks/${encodeURIComponent(id)}/notes`,
      { notes },
    );
    return normalizeTask(updated);
  },

  addAttachments: async (id: string, files: File[]): Promise<Task> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const updated = await apiClient.post<Task>(
      `/api/tasks/${encodeURIComponent(id)}/attachments`,
      formData,
    );
    return normalizeTask(updated);
  },

  deleteAttachment: async (id: string, attachmentId: string): Promise<Task> => {
    const updated = await apiClient.delete<Task>(
      `/api/tasks/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
    return normalizeTask(updated);
  },

  getAttachmentDownloadUrl: async (id: string, attachmentId: string): Promise<string> => {
    const result = await apiClient.get<{ url: string }>(
      `/api/tasks/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/download-url`,
    );
    return result.url;
  }
};
