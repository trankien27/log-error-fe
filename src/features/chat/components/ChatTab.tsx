import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCheck,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '../../../stores/useChatStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { ChatConversation, ChatMessage, ChatUser } from '../../../types';
import { PageHeader, EmptyState, ListSkeleton, Skeleton } from '../../../components/ui';

function getChatUserName(user?: ChatUser | null) {
  if (!user) return 'Người dùng';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'US';
}

function formatTime(value?: string | null) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export default function ChatTab() {
  const {
    conversations,
    messagesByConversation,
    activeConversationId,
    connection,
    isLoadingConversations,
    isLoadingMessages,
    isConnecting,
    fetchConversations,
    fetchMessages,
    startConnection,
    setActiveConversation,
    sendDirectMessage,
    markAsRead,
  } = useChatStore();
  const { currentUser } = useAuthStore();
  const { users } = useUsersStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId]?.items || []
    : [];
  const selectedReceiver =
    users.find(user => user.id === selectedReceiverId) ||
    users.find(user => user.id === activeConversation?.otherUser?.id) ||
    null;
  const receiverId = activeConversation?.otherUser?.id || selectedReceiverId;

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return conversations;

    return conversations.filter(conversation => {
      const userName = getChatUserName(conversation.otherUser).toLowerCase();
      const email = conversation.otherUser?.email?.toLowerCase() || '';
      const message = conversation.lastMessage?.content?.toLowerCase() || '';
      return userName.includes(query) || email.includes(query) || message.includes(query);
    });
  }, [conversations, searchQuery]);

  const directUsers = users.filter(user => user.id !== currentUser?.id);

  useEffect(() => {
    fetchConversations().catch((err: any) => {
      toast.error(err.message || 'Không thể tải danh sách hội thoại.');
    });

    startConnection().catch((err: any) => {
      toast.error(err.message || 'Không thể kết nối trò chuyện thời gian thực.');
    });
  }, [fetchConversations, startConnection]);

  useEffect(() => {
    if (!activeConversationId) return;

    fetchMessages(activeConversationId)
      .then(() => markAsRead(activeConversationId))
      .catch((err: any) => {
        toast.error(err.message || 'Không thể tải tin nhắn.');
      });
  }, [activeConversationId, fetchMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeConversationId]);

  const handleSelectConversation = async (conversation: ChatConversation) => {
    setSelectedReceiverId('');
    try {
      await setActiveConversation(conversation.id);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tham gia hội thoại.');
    }
  };

  const handleSelectReceiver = async (receiverId: string) => {
    const conversation = conversations.find(c => c.otherUser?.id === receiverId);

    setSelectedReceiverId(receiverId);

    if (conversation) {
      await handleSelectConversation(conversation);
    } else {
      try {
        await setActiveConversation(null);
      } catch (err: any) {
        toast.error(err.message || 'Không thể rời hội thoại hiện tại.');
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!receiverId) {
      toast.error('Vui lòng chọn người nhận.');
      return;
    }

    if (!trimmedContent) {
      return;
    }

    setIsSending(true);
    try {
      await sendDirectMessage(receiverId, trimmedContent);
      setContent('');
      await fetchConversations();

      if (!activeConversationId && selectedReceiverId) {
        const conversation = useChatStore
          .getState()
          .conversations.find(item => item.otherUser?.id === selectedReceiverId);

        if (conversation) {
          await setActiveConversation(conversation.id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isMine = message.senderId === currentUser?.id;

    return (
      <div
        key={message.id}
        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[80%] sm:max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isMine
                ? 'bg-primary text-on-primary rounded-br-md'
                : 'bg-surface-2 text-on-surface rounded-bl-md'
            }`}
          >
            {message.deletedAt ? (
              <span className="italic opacity-70">Tin nhắn đã bị xóa</span>
            ) : (
              message.content
            )}
          </div>
          <div className="mt-1 px-1 text-[11px] text-on-surface-variant">
            {formatTime(message.createdAt)}
            {message.editedAt && <span> · đã sửa</span>}
          </div>
        </div>
      </div>
    );
  };

  const activeTitle =
    activeConversation
      ? getChatUserName(activeConversation.otherUser)
      : selectedReceiver?.name || 'Chọn hội thoại';

  const connectionReady = connection?.state === 'Connected';

  return (
    <div className="flex flex-col h-auto xl:h-[calc(100vh-112px)] min-h-[calc(100dvh-96px)] xl:min-h-[620px] text-left animate-fadeIn">
      <PageHeader
        title="Trò chuyện"
        description="Nhắn tin trực tiếp với đồng nghiệp."
        icon={MessageSquare}
        actions={
          <span
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium ${
              connectionReady
                ? 'bg-success-container text-on-success-container'
                : 'bg-surface-2 text-on-surface-variant'
            }`}
            title={connectionReady ? 'Đã kết nối thời gian thực' : 'Chưa kết nối thời gian thực'}
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : connectionReady ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {isConnecting ? 'Đang kết nối' : connectionReady ? 'Trực tuyến' : 'Ngoại tuyến'}
          </span>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        <section className="card-surface overflow-hidden flex flex-col min-h-[340px] xl:min-h-0">
          <div className="p-3 border-b border-outline-variant space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Tìm hội thoại…"
                aria-label="Tìm hội thoại"
                className="w-full h-10 pl-9 pr-3 bg-surface-2 border border-transparent rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:bg-surface transition-colors"
              />
            </div>

            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
              <select
                value={selectedReceiverId}
                onChange={event => handleSelectReceiver(event.target.value)}
                aria-label="Bắt đầu cuộc trò chuyện mới"
                className="w-full h-10 pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="">Cuộc trò chuyện mới</option>
                {directUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {isLoadingConversations ? (
              <ListSkeleton rows={6} className="p-2" />
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                compact
                icon={MessageSquare}
                title={searchQuery.trim() ? 'Không tìm thấy hội thoại' : 'Chưa có hội thoại'}
                description={searchQuery.trim() ? 'Thử tìm với từ khóa khác.' : 'Chọn một người để bắt đầu trò chuyện.'}
              />
            ) : (
              <div className="space-y-0.5">
                {filteredConversations.map(conversation => {
                  const name = getChatUserName(conversation.otherUser);
                  const isActive = conversation.id === activeConversationId;
                  const hasUnread = conversation.unreadCount > 0;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation)}
                      className={`w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-xl transition-colors cursor-pointer ${
                        isActive ? 'bg-primary-subtle' : 'hover:bg-surface-2'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isActive ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-on-surface' : 'font-medium text-on-surface'}`}>{name}</p>
                          <span className={`text-[11px] shrink-0 ${hasUnread ? 'font-medium text-primary' : 'text-on-surface-variant'}`}>
                            {formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${hasUnread ? 'font-medium text-on-surface' : 'text-on-surface-variant'}`}>
                            {conversation.lastMessage?.content || conversation.otherUser?.email || 'Chưa có tin nhắn'}
                          </p>
                          {hasUnread && (
                            <span className="shrink-0 bg-primary text-on-primary text-[11px] font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="card-surface overflow-hidden flex flex-col min-h-[460px] xl:min-h-0">
          {!receiverId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Chưa chọn cuộc trò chuyện"
                description="Chọn một hội thoại bên trái hoặc bắt đầu cuộc trò chuyện mới."
              />
            </div>
          ) : (
            <>
              <header className="min-h-[64px] border-b border-outline-variant px-4 sm:px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(activeTitle)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-on-surface truncate">{activeTitle}</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      {activeConversation?.otherUser?.email || selectedReceiver?.email || 'Bắt đầu cuộc trò chuyện mới'}
                    </p>
                  </div>
                </div>
                {activeConversationId && (
                  <button
                    type="button"
                    onClick={() => markAsRead(activeConversationId).catch((err: any) => toast.error(err.message))}
                    className="btn-ghost h-8 px-3 text-sm"
                    title="Đánh dấu đã đọc"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Đã đọc</span>
                  </button>
                )}
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
                {isLoadingMessages && activeConversationId ? (
                  <div className="space-y-4" aria-busy="true" aria-label="Đang tải tin nhắn">
                    <Skeleton className="h-10 w-2/5 rounded-2xl" />
                    <Skeleton className="h-10 w-1/2 rounded-2xl ml-auto" />
                    <Skeleton className="h-14 w-3/5 rounded-2xl" />
                    <Skeleton className="h-10 w-1/3 rounded-2xl ml-auto" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState compact icon={MessageSquare} title="Chưa có tin nhắn" description="Gửi lời chào để bắt đầu nhé." />
                  </div>
                ) : (
                  activeMessages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="border-t border-outline-variant p-3 sm:p-4 flex items-end gap-2">
                <textarea
                  value={content}
                  onChange={event => setContent(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event);
                    }
                  }}
                  disabled={!receiverId || isSending}
                  rows={1}
                  aria-label="Nội dung tin nhắn"
                  placeholder="Nhập tin nhắn… (Shift + Enter để xuống dòng)"
                  className="flex-1 min-h-[44px] max-h-40 resize-none rounded-xl border border-outline-variant bg-surface-2 px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:bg-surface transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!receiverId || !content.trim() || isSending}
                  className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Gửi tin nhắn"
                  title="Gửi tin nhắn"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
