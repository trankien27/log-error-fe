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
      toast.error(err.message || 'Không thể kết nối realtime chat.');
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
        <div className={`max-w-[72%] ${isMine ? 'text-right' : 'text-left'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              isMine
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-white border border-outline-variant text-gray-900 rounded-bl-md'
            }`}
          >
            {message.deletedAt ? (
              <span className="italic opacity-70">Tin nhắn đã bị xóa</span>
            ) : (
              message.content
            )}
          </div>
          <div className="mt-1 px-1 text-[10px] text-gray-400 font-medium">
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
    <div className="h-[calc(100vh-112px)] min-h-[620px] text-left animate-fadeIn">
      <div className="h-full grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-outline-variant space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Tin nhắn</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Trao đổi trực tiếp giữa người dùng</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${
                  connectionReady
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
                title={connectionReady ? 'SignalR connected' : 'SignalR disconnected'}
              >
                {connectionReady ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {isConnecting ? 'Đang nối' : connectionReady ? 'Realtime' : 'Offline'}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Tìm hội thoại..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs focus:outline-primary"
              />
            </div>

            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <select
                value={selectedReceiverId}
                onChange={event => handleSelectReceiver(event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-outline-variant rounded-lg text-xs font-semibold focus:outline-primary cursor-pointer"
              >
                <option value="">Tạo chat 1-1 mới</option>
                {directUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="py-14 text-center text-xs font-bold text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Đang tải hội thoại...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-14 px-6 text-center text-xs font-semibold text-gray-400">
                Chưa có hội thoại phù hợp.
              </div>
            ) : (
              filteredConversations.map(conversation => {
                const name = getChatUserName(conversation.otherUser);
                const isActive = conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full px-4 py-3 flex gap-3 text-left border-b border-[#f1f5f9] transition-colors cursor-pointer ${
                      isActive ? 'bg-[#eef4ff]' : 'hover:bg-[#faf8ff]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-black shrink-0">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-950 truncate">{name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {conversation.lastMessage?.content || conversation.otherUser?.email || 'Chưa có tin nhắn'}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="self-center bg-primary text-white text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-[#f8fafc] border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
          <header className="h-[68px] bg-white border-b border-outline-variant px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#dbe1ff] text-[#00174b] flex items-center justify-center text-xs font-black shrink-0">
                {getInitials(activeTitle)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-950 truncate">{activeTitle}</h3>
                <p className="text-[11px] text-gray-500 truncate">
                  {activeConversation?.otherUser?.email || selectedReceiver?.email || 'Chọn người nhận để bắt đầu'}
                </p>
              </div>
            </div>
            {activeConversationId && (
              <button
                onClick={() => markAsRead(activeConversationId).catch((err: any) => toast.error(err.message))}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-outline-variant rounded-lg text-xs font-bold text-primary bg-white hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                Đã đọc
              </button>
            )}
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
            {!receiverId ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">Chọn hội thoại hoặc người nhận mới</p>
                </div>
              </div>
            ) : isLoadingMessages && activeConversationId ? (
              <div className="py-14 text-center text-xs font-bold text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Đang tải tin nhắn...
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-sm font-semibold text-gray-400">Chưa có tin nhắn trong hội thoại này.</p>
              </div>
            ) : (
              activeMessages.map(renderMessage)
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="bg-white border-t border-outline-variant p-4 flex items-end gap-3">
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
              rows={2}
              placeholder={receiverId ? 'Nhập tin nhắn...' : 'Chọn người nhận trước khi gửi'}
              className="flex-1 resize-none rounded-lg border border-outline-variant bg-[#f8fafc] px-3 py-2 text-sm focus:outline-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!receiverId || !content.trim() || isSending}
              className="h-10 px-4 rounded-lg bg-primary text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-primary-container active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
