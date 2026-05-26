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
