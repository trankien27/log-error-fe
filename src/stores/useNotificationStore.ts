import * as signalR from '@microsoft/signalr';
import { create } from 'zustand';
import { SystemNotification } from '../types';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../services/api/apiClient';
import { notificationsService } from '../services/api/notificationsService';

interface NotificationState {
  notifications: SystemNotification[];
  connection: signalR.HubConnection | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  isNotificationModalOpen: boolean;
  selectedNotification: SystemNotification | null;

  setIsNotificationModalOpen: (isOpen: boolean) => void;
  setSelectedNotification: (notif: SystemNotification | null) => void;
  fetchNotifications: () => Promise<void>;
  startConnection: () => Promise<void>;
  stopConnection: () => Promise<void>;
  sendBroadcast: (
    title: string,
    content: string,
    type: SystemNotification['type'],
    tag: string,
    recipientUserIds: string[] | null,
  ) => Promise<void>;
  toggleReadState: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const sortNewestFirst = (notifications: SystemNotification[]) =>
  [...notifications].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

const upsertNotification = (
  notifications: SystemNotification[],
  notification: SystemNotification,
) => sortNewestFirst([
  notification,
  ...notifications.filter(item => item.id !== notification.id),
]);

export const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  connection: null,
  isLoading: false,
  isConnecting: false,
  error: null,
  isNotificationModalOpen: false,
  selectedNotification: null,

  setIsNotificationModalOpen: (isNotificationModalOpen) => set({ isNotificationModalOpen }),
  setSelectedNotification: (selectedNotification) => set({ selectedNotification }),

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await notificationsService.getAll();
      set({ notifications: sortNewestFirst(notifications), isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  startConnection: async () => {
    const current = get().connection;
    if (current && current.state !== signalR.HubConnectionState.Disconnected) return;
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return;

    set({ isConnecting: true, error: null });
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem(AUTH_TOKEN_KEY) || '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('NotificationCreated', (notification: SystemNotification) => {
      set(state => ({
        notifications: upsertNotification(state.notifications, notification),
      }));
    });

    connection.onreconnected(() => {
      get().fetchNotifications().catch(() => undefined);
    });

    try {
      await connection.start();
      set({ connection, isConnecting: false });
    } catch (err: any) {
      set({ connection: null, isConnecting: false, error: err.message });
      throw err;
    }
  },

  stopConnection: async () => {
    const connection = get().connection;
    if (connection) await connection.stop();
    set({ connection: null, isConnecting: false });
  },

  sendBroadcast: async (title, content, type, tag, recipientUserIds) => {
    set({ isLoading: true, error: null });
    try {
      await notificationsService.create({
        title,
        content,
        type,
        tagName: tag,
        audienceType: recipientUserIds === null ? 'all' : 'users',
        recipientUserIds: recipientUserIds ?? [],
      });
      await get().fetchNotifications();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  toggleReadState: async (id) => {
    set({ error: null });
    try {
      const updated = await notificationsService.toggleReadState(id);
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? updated : n),
        selectedNotification: state.selectedNotification?.id === id ? updated : state.selectedNotification,
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  markAllRead: async () => {
    set({ error: null });
    try {
      await notificationsService.markAllRead();
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        selectedNotification: state.selectedNotification
          ? { ...state.selectedNotification, isRead: true }
          : null,
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteNotification: async (id) => {
    set({ error: null });
    try {
      await notificationsService.delete(id);
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
        selectedNotification: state.selectedNotification?.id === id ? null : state.selectedNotification,
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
