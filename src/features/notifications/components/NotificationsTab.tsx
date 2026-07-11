import React from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationStore } from '../../../stores/useNotificationStore';

export default function NotificationsTab() {
  const {
    notifications,
    isLoading,
    setIsNotificationModalOpen,
    toggleReadState,
    setSelectedNotification
  } = useNotificationStore();

  const handleToggleReadState = async (id: string) => {
    try {
      await toggleReadState(id);
      toast.success('Đã cập nhật trạng thái đọc.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật thông báo.');
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Header screen */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Màn hình cảnh báo phát thanh & Thông báo hệ thống</h2>
          <p className="text-xs text-on-surface-variant mt-1">Điều khiển các luồng tin thông báo cảnh báo hoặc nâng cấp tài nguyên máy chủ tới toàn thể kỹ thuật viên.</p>
        </div>
        <button
          onClick={() => setIsNotificationModalOpen(true)}
          disabled={isLoading}
          className="btn-primary"
        >
          <Send className="w-4 h-4" /> Gửi thông báo
        </button>
      </div>

      {/* Simple helper tabs filter */}
      <div className="flex gap-2 p-1 bg-surface border border-outline-variant rounded-xl shadow-sm w-full sm:w-fit overflow-x-auto font-sans">
        <button className="px-4 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-lg pointer-events-none whitespace-nowrap">Tất cả thông báo</button>
        <button className="px-4 py-1.5 text-on-surface-variant hover:bg-surface-2 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap" onClick={() => toast.info(`Có ${notifications.filter(n => !n.isRead).length} thông báo chưa đọc.`)}>Chưa đọc ({notifications.filter(n => !n.isRead).length})</button>
      </div>

      {/* Notification list block */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center font-sans font-bold text-on-surface-variant py-12 bg-surface rounded-xl border border-outline-variant">
            Đang tải thông báo...
          </p>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle className="w-8 h-8 text-on-surface-variant/50 mb-2" />
            <p className="font-sans font-bold text-on-surface-variant">Không có thông báo nào trong hệ thống.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) {
                  handleToggleReadState(notif.id);
                }
                setSelectedNotification(notif);
              }}
              className={`bg-surface border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start shadow-sm hover:shadow-md hover:border-primary/40 transition-all relative overflow-hidden cursor-pointer ${
                notif.isRead ? 'border-outline-variant opacity-80' : 'border-primary/20 bg-primary/5'
              }`}
            >
              {/* Active highlight color ribbon */}
              {!notif.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>
              )}

              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                notif.type === 'warning'
                  ? 'bg-error-container text-error'
                  : notif.type === 'update'
                  ? 'bg-secondary-container text-primary'
                  : 'bg-success-container text-success'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-1">
                  <h3 className={`text-sm tracking-tight ${notif.isRead ? 'text-on-surface-variant line-through' : 'text-on-surface font-bold'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-on-surface-variant font-mono whitespace-nowrap">{notif.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed truncate-2-lines">{notif.content}</p>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="inline-flex items-center gap-1 bg-surface-2 px-2 py-0.5 rounded text-[10px] text-on-surface-variant font-medium font-sans">
                    Gửi đến: {notif.tagName}
                  </span>

                  {notif.tagType === 'Urgent' && (
                    <span className="badge-error font-sans">Khẩn cấp</span>
                  )}

                  <span className="text-[10px] text-on-surface-variant hover:underline cursor-pointer sm:ml-auto font-sans" onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReadState(notif.id);
                  }}>
                    {notif.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
