import { apiClient } from './apiClient';

export type AiChatSection = {
  title: string;
  items: string[];
};

export type AiChatPendingAction = {
  id: string;
  type: 'create_error_log' | 'confirm_schedule' | 'shift_change';
  title: string;
  summary: string;
  assumptions: string[];
  sections: AiChatSection[];
};

export type AiChatReply = {
  conversationId: string;
  message: string;
  pendingAction?: AiChatPendingAction | null;
};

export type AiChatActionResult = {
  success: boolean;
  message: string;
  errorCode?: string | null;
};

export const aiChatService = {
  getStatus: () => apiClient.get<{ available: boolean }>('/api/ai-chat/status'),
  send: (conversationId: string | null, message: string) =>
    apiClient.post<AiChatReply>('/api/ai-chat', { conversationId, message }),
  confirm: (actionId: string) => apiClient.post<AiChatActionResult>(`/api/ai-chat/actions/${actionId}/confirm`),
  cancel: (actionId: string) => apiClient.post<void>(`/api/ai-chat/actions/${actionId}/cancel`),
};
