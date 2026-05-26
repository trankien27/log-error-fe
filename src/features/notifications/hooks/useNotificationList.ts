import { create } from 'zustand';
import type { SystemNotification } from '@/features/notifications/types/notification.type';
import { notificationApi } from '@/features/notifications/api/notification.api';

interface NotificationState {
  notifications: SystemNotification[];
  isLoading: boolean;
  error: string | null;

  // Notification Modals
  isNotificationModalOpen: boolean;
  selectedNotification: SystemNotification | null;

  // Setters/Actions
  setIsNotificationModalOpen: (isOpen: boolean) => void;
  setSelectedNotification: (notif: SystemNotification | null) => void;

  fetchNotifications: () => Promise<void>;
  sendBroadcast: (title: string, content: string, type: 'warning' | 'update' | 'success', tag: string, audience: string) => Promise<void>;
  toggleReadState: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,

  isNotificationModalOpen: false,
  selectedNotification: null,

  setIsNotificationModalOpen: (isNotificationModalOpen) => set({ isNotificationModalOpen }),
  setSelectedNotification: (selectedNotification) => set({ selectedNotification }),

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const notifications = await notificationApi.getAll();
      set({ notifications, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendBroadcast: async (title, content, type, tag, audience) => {
    try {
      const newNotif = await notificationApi.create({
        title,
        content,
        type,
        tagName: audience,
        tagType: type === 'warning' ? 'Urgent' : 'Info'
      });
      set((state) => ({ notifications: [newNotif, ...state.notifications] }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  toggleReadState: async (id) => {
    try {
      const updated = await notificationApi.toggleReadState(id);
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? updated : n),
        // Update selected detail if currently viewing
        selectedNotification: state.selectedNotification?.id === id ? updated : state.selectedNotification
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteNotification: async (id) => {
    try {
      await notificationApi.delete(id);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
        selectedNotification: state.selectedNotification?.id === id ? null : state.selectedNotification
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
