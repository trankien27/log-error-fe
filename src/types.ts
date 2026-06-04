export type ErrorGroup = 1 | 2 | 3;
export type ProcessingFlow = 1 | 2 | 3;
export type ErrorLogStatus = 1 | 2 | 3;
export type Severity = 1 | 2 | 3;

export interface ErrorLog {
  id: string;
  errorCode: string;
  receivedDate: string;
  month: number;
  store: string;
  booth?: string | null;
  errorGroup: ErrorGroup;
  description: string;
  processingFlow: ProcessingFlow;
  preliminaryCause?: string | null;
  solution?: string | null;
  status: ErrorLogStatus;
  severity: Severity;
  assignedToId: string;
  assignedToName?: string | null;
  note?: string | null;
  createdTime: string;
  lastUpdatedTime?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'IT Support' | 'Staff' | 'User';
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

export interface LookupItem {
  id: string | number;
  code?: string;
  name: string;
  lastSyncedAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
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
