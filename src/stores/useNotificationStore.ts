import { create } from 'zustand';
import { SystemNotification } from '../types';
import { notificationsService } from '../services/api/notificationsService';

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
      const notifications = await notificationsService.getAll();
      set({ notifications, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendBroadcast: async (title, content, type, tag, audience) => {
    set({ isLoading: true, error: null });
    try {
      const newNotif = await notificationsService.create({
        title,
        content,
        type,
        tagName: audience,
        tagType: type === 'warning' ? 'Urgent' : 'Info'
      });
      set((state) => ({ notifications: [newNotif, ...state.notifications], isLoading: false }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  toggleReadState: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await notificationsService.toggleReadState(id);
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? updated : n),
        // Update selected detail if currently viewing
        selectedNotification: state.selectedNotification?.id === id ? updated : state.selectedNotification,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteNotification: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await notificationsService.delete(id);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
        selectedNotification: state.selectedNotification?.id === id ? null : state.selectedNotification,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
