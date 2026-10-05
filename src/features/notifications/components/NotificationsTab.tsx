import React, { useState } from 'react';
import { AlertTriangle, Bell, BellOff, Info, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatNotificationTime, useNotificationStore } from '../../../stores/useNotificationStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { EmptyState, ListSkeleton, PageHeader } from '../../../components/ui';

export default function NotificationsTab() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const {
    notifications,
    isLoading,
    setIsNotificationModalOpen,
    toggleReadState,
    setSelectedNotification
  } = useNotificationStore();
  const canBroadcast = useAuthStore(s => s.hasAnyRole)([1, 3, 'Admin', 'ITSupportManager']);
  const visibleNotifications = filter === 'unread'
    ? notifications.filter(notification => !notification.isRead)
    : notifications;

  const handleToggleReadState = async (id: string) => {
    try {
      await toggleReadState(id);
      toast.success('Đã cập nhật trạng thái đọc.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật thông báo.');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const tabClass = (active: boolean) =>
    `h-8 px-3.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
      active ? 'bg-surface text-on-surface font-medium shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
    }`;

  return (
    <div className="text-left animate-fadeIn">
      <PageHeader
        title="Thông báo"
        description="Tin nhắn và cảnh báo gửi đến đội kỹ thuật."
        icon={Bell}
        actions={canBroadcast ? (
          <button
            type="button"
            onClick={() => setIsNotificationModalOpen(true)}
            disabled={isLoading}
            className="btn-primary"
          >
            <Send className="w-4 h-4" /> Gửi thông báo
          </button>
        ) : undefined}
      />

      <div className="mb-4 inline-flex gap-1 p-1 bg-surface-2 border border-outline-variant rounded-xl w-full sm:w-fit overflow-x-auto" role="tablist">
        <button type="button" role="tab" aria-selected={filter === 'all'} className={tabClass(filter === 'all')} onClick={() => setFilter('all')}>
          Tất cả
        </button>
        <button type="button" role="tab" aria-selected={filter === 'unread'} className={tabClass(filter === 'unread')} onClick={() => setFilter('unread')}>
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="card-surface p-5">
            <ListSkeleton rows={5} />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="card-surface">
            <EmptyState
              icon={BellOff}
              title={filter === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào'}
              description={filter === 'unread' ? 'Tuyệt vời, không còn gì cần xem.' : 'Thông báo mới sẽ xuất hiện ở đây.'}
            />
          </div>
        ) : (
          visibleNotifications.map(notif => {
            const TypeIcon = notif.type === 'warning' ? AlertTriangle : notif.type === 'update' ? Sparkles : Info;
            return (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!notif.isRead) {
                    handleToggleReadState(notif.id);
                  }
                  setSelectedNotification(notif.isRead ? notif : { ...notif, isRead: true });
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
                className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex gap-4 items-start shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  notif.isRead ? 'bg-surface border-outline-variant' : 'bg-primary-subtle/40 border-primary/25'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden="true"></div>
                )}

                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.type === 'warning'
                    ? 'bg-error-container text-on-error-container'
                    : notif.type === 'update'
                    ? 'bg-primary-subtle text-primary'
                    : 'bg-success-container text-on-success-container'
                }`}>
                  <TypeIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-1">
                    <h3 className={`text-sm ${notif.isRead ? 'text-on-surface-variant font-medium' : 'text-on-surface font-semibold'}`}>
                      {!notif.isRead && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Chưa đọc" />}
                      {notif.title}
                    </h3>
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">{formatNotificationTime(notif.time)}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed truncate-2-lines">{notif.content}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 bg-surface-2 px-2 py-0.5 rounded-md text-xs text-on-surface-variant font-medium">
                      Gửi đến: {notif.tagName}
                    </span>

                    {notif.category && (
                      <span className="inline-flex items-center bg-primary-subtle px-2 py-0.5 rounded-md text-xs text-primary font-medium">
                        {notif.category.replaceAll('_', ' ')}
                      </span>
                    )}

                    {notif.tagType === 'Urgent' && (
                      <span className="badge-error">Khẩn cấp</span>
                    )}

                    <button
                      type="button"
                      className="h-7 px-2 rounded-md text-xs font-medium text-on-surface-variant hover:bg-surface-2 hover:text-primary cursor-pointer sm:ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReadState(notif.id);
                      }}
                    >
                      {notif.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
