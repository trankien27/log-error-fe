export interface ErrorLog {
  id: string;
  title: string;
  description?: string;
  reporter: string;
  reportTime: string;
  store: string;
  booth: string;
  attachment: boolean;
  status: 'Mới' | 'Đang xử lý' | 'Đã đóng';
  severity: 'Lỗi nghiêm trọng' | 'Bình thường' | 'Cảnh báo';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'IT Support' | 'Staff';
  status: 'Hoạt động' | 'Vô hiệu hóa';
  avatar?: string;
  phone?: string;
  department?: string;
}

export interface Role {
  name: string;
  userCount: number;
  description: string;
  securityLevel: 'Cao' | 'Trung bình' | 'Thấp';
}

export interface Booth {
  id: string;
  name: string;
  ultraviewId: string;
  relatedStores: string;
}

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

export interface SystemNotification {
  id: string;
  type: 'warning' | 'update' | 'success';
  title: string;
  content: string;
  time: string;
  tagName: string;
  tagType: 'Urgent' | 'Info' | 'None';
  isRead: boolean;
}

export interface Activity {
  id: string;
  type: 'log' | 'task';
  title: string;
  location: string;
  timeText: string;
  statusText: string;
  statusType: 'error' | 'pending' | 'success';
}

export type TabType =
  | 'overview'
  | 'error_logs'
  | 'tasks'
  | 'users'
  | 'roles'
  | 'booths'
  | 'notifications'
  | 'schedule'
  | 'settings';
