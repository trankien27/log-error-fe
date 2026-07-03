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
  | 'recent_activities'
  | 'users'
  | 'roles'
  | 'booths'
  | 'notifications'
  | 'schedule'
  | 'settings';
