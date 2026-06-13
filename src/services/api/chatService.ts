import { ChatConversation, ChatMessage, PagedResult } from '../../types';
import { apiClient } from './apiClient';

export const chatService = {
  getConversations: (): Promise<ChatConversation[]> => {
    return apiClient.get<ChatConversation[]>('/api/chats');
  },

  getMessages: (
    conversationId: number,
    pageIndex = 1,
    pageSize = 30,
  ): Promise<PagedResult<ChatMessage>> => {
    return apiClient.get<PagedResult<ChatMessage>>(
      `/api/chats/${conversationId}/messages?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    );
  },

  sendDirectMessage: (receiverId: string, content: string): Promise<ChatMessage> => {
    return apiClient.post<ChatMessage>(
      `/api/chats/direct/${encodeURIComponent(receiverId)}/messages`,
      { content },
    );
  },

  markAsRead: (conversationId: number): Promise<void> => {
    return apiClient.post<void>(`/api/chats/${conversationId}/read`);
  },
};
