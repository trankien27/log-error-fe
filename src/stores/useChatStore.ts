import * as signalR from '@microsoft/signalr';
import { create } from 'zustand';
import { ChatConversation, ChatMessage, PagedResult } from '../types';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../services/api/apiClient';
import { chatService } from '../services/api/chatService';

type MessagesReadPayload = {
  conversationId: number;
  userId: string;
};

interface ChatState {
  conversations: ChatConversation[];
  messagesByConversation: Record<number, PagedResult<ChatMessage>>;
  activeConversationId: number | null;
  connection: signalR.HubConnection | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isConnecting: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: number) => Promise<void>;
  startConnection: () => Promise<void>;
  stopConnection: () => Promise<void>;
  setActiveConversation: (conversationId: number | null) => Promise<void>;
  sendDirectMessage: (receiverId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: number) => Promise<void>;
}

const sortConversations = (conversations: ChatConversation[]) =>
  [...conversations].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

const upsertConversationMessage = (
  conversations: ChatConversation[],
  message: ChatMessage,
) => {
  const found = conversations.some(c => c.id === message.conversationId);

  if (!found) {
    return conversations;
  }

  return sortConversations(
    conversations.map(conversation =>
      conversation.id === message.conversationId
        ? {
            ...conversation,
            updatedAt: message.createdAt,
            lastMessage: message,
          }
        : conversation,
    ),
  );
};

const appendMessage = (
  messagesByConversation: Record<number, PagedResult<ChatMessage>>,
  message: ChatMessage,
) => {
  const existing = messagesByConversation[message.conversationId];

  if (!existing) {
    return messagesByConversation;
  }

  if (existing.items.some(item => item.id === message.id)) {
    return messagesByConversation;
  }

  return {
    ...messagesByConversation,
    [message.conversationId]: {
      ...existing,
      items: [...existing.items, message],
      totalItems: existing.totalItems + 1,
    },
  };
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  connection: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isConnecting: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const conversations = await chatService.getConversations();
      set({ conversations: sortConversations(conversations), isLoadingConversations: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingConversations: false });
      throw err;
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const messages = await chatService.getMessages(conversationId);
      set(state => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: {
            ...messages,
            items: [...messages.items].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            ),
          },
        },
        isLoadingMessages: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoadingMessages: false });
      throw err;
    }
  },

  startConnection: async () => {
    const current = get().connection;
    if (current && current.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    set({ isConnecting: true, error: null });

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/chathub`, {
        accessTokenFactory: () => localStorage.getItem(AUTH_TOKEN_KEY) || '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('MessageCreated', (message: ChatMessage) => {
      set(state => ({
        conversations: upsertConversationMessage(state.conversations, message),
        messagesByConversation: appendMessage(state.messagesByConversation, message),
      }));

      if (!get().conversations.some(c => c.id === message.conversationId)) {
        get().fetchConversations().catch(() => undefined);
      }
    });

    connection.on('ConversationUpdated', (message: ChatMessage) => {
      set(state => ({
        conversations: upsertConversationMessage(state.conversations, message),
      }));

      if (!get().conversations.some(c => c.id === message.conversationId)) {
        get().fetchConversations().catch(() => undefined);
      }
    });

    connection.on('MessagesRead', ({ conversationId }: MessagesReadPayload) => {
      set(state => ({
        conversations: state.conversations.map(conversation =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      }));
    });

    connection.onreconnected(() => {
      const activeConversationId = get().activeConversationId;
      if (activeConversationId) {
        connection.invoke('JoinConversation', activeConversationId).catch(() => undefined);
      }
    });

    try {
      await connection.start();
      set({ connection, isConnecting: false });
    } catch (err: any) {
      set({ error: err.message, isConnecting: false, connection: null });
      throw err;
    }
  },

  stopConnection: async () => {
    const connection = get().connection;
    if (connection) {
      await connection.stop();
    }
    set({ connection: null, activeConversationId: null });
  },

  setActiveConversation: async (conversationId) => {
    const { activeConversationId, connection } = get();

    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected &&
      activeConversationId &&
      activeConversationId !== conversationId
    ) {
      await connection.invoke('LeaveConversation', activeConversationId);
    }

    set({ activeConversationId: conversationId });

    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected &&
      conversationId
    ) {
      await connection.invoke('JoinConversation', conversationId);
    }
  },

  sendDirectMessage: async (receiverId, content) => {
    const connection = get().connection;

    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('SendDirectMessage', receiverId, content);
      return;
    }

    const message = await chatService.sendDirectMessage(receiverId, content);
    set(state => ({
      conversations: upsertConversationMessage(state.conversations, message),
      messagesByConversation: appendMessage(state.messagesByConversation, message),
    }));
    await get().fetchConversations();
  },

  markAsRead: async (conversationId) => {
    const connection = get().connection;

    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('MarkAsRead', conversationId);
    } else {
      await chatService.markAsRead(conversationId);
    }

    set(state => ({
      conversations: state.conversations.map(conversation =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    }));
  },
}));
