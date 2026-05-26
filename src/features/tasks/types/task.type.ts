export interface TaskAttachment {
  name: string;
  url?: string;
  size?: string;
  type?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'progress' | 'done';
  dueText: string;
  assigneeName: string;
  assigneeAvatar?: string;
  commentsCount: number;
  isOverdue: boolean;
  notes?: string;
  attachments?: TaskAttachment[];
}
