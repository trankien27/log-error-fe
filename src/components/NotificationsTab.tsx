import React from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { SystemNotification } from '../types';

interface NotificationsTabProps {
  notifications: SystemNotification[];
  setIsNotificationModalOpen: (val: boolean) => void;
  toggleNotifReadState: (id: string) => void;
  setSelectedNotification: (notif: SystemNotification) => void;
  triggerToast: (msg: string) => void;
}

export default function NotificationsTab({
  notifications,
  setIsNotificationModalOpen,
  toggleNotifReadState,
  setSelectedNotification,
  triggerToast,
}: NotificationsTabProps) {
  return (
    <div className="space-y-6 text-left">
      {/* Header screen */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Màn hình cảnh báo phát thanh & Thông báo hệ thống</h2>
          <p className="text-xs text-gray-500 mt-1">Điều khiển các luồng tin thông báo cảnh báo hoặc nâng cấp tài nguyên máy chủ tới toàn thể kỹ thuật viên.</p>
        </div>
        <button
          onClick={() => setIsNotificationModalOpen(true)}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Send className="w-4 h-4" /> Gửi thông báo
        </button>
      </div>

      {/* Simple helper tabs filter */}
      <div className="flex gap-2 p-1 bg-white border border-outline-variant rounded-xl shadow-sm w-fit font-sans">
        <button className="px-4 py-1.5 bg-[#d0e1fb] text-[#00174b] text-xs font-bold rounded-lg pointer-events-none">Tất cả thông báo</button>
        <button className="px-4 py-1.5 text-gray-500 hover:bg-gray-100 text-xs font-medium rounded-lg cursor-pointer" onClick={() => triggerToast(`Đang lọc toàn bộ thông báo.`)}>Chưa đọc ({notifications.filter(n => !n.isRead).length})</button>
      </div>

      {/* Notification list block */}
      <div className="space-y-4">
        {notifications.map(notif => (
          <div
            key={notif.id}
            onClick={() => {
              if (!notif.isRead) {
                toggleNotifReadState(notif.id);
              }
              setSelectedNotification(notif);
            }}
            className={`bg-white border rounded-xl p-5 flex gap-4 items-start shadow-sm hover:shadow-md hover:border-primary/40 transition-all relative overflow-hidden cursor-pointer ${
              notif.isRead ? 'border-outline-variant opacity-80' : 'border-primary/20 bg-blue-50/5'
            }`}
          >
            {/* Active highlight color ribbon */}
            {!notif.isRead && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>
            )}

            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              notif.type === 'warning'
                ? 'bg-red-50 text-red-600'
                : notif.type === 'update'
                ? 'bg-blue-50 text-primary'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 mb-1">
                <h3 className={`text-sm tracking-tight ${notif.isRead ? 'text-gray-600 line-through' : 'text-gray-900 font-bold'}`}>
                  {notif.title}
                </h3>
                <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">{notif.time}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed truncate-2-lines">{notif.content}</p>

              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-500 font-medium font-sans">
                  Gửi đến: {notif.tagName}
                </span>
                
                {notif.tagType === 'Urgent' && (
                  <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans">Khẩn cấp</span>
                )}

                <span className="text-[10px] text-gray-400 hover:underline cursor-pointer ml-auto font-sans" onClick={(e) => {
                  e.stopPropagation();
                  toggleNotifReadState(notif.id);
                }}>
                  {notif.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
