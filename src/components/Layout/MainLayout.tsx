import React, { useEffect, useState } from 'react';
/// <reference types="react" />
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Clock, CheckCircle, Check, Trash2, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { formatNotificationTime, useNotificationStore } from '../../stores/useNotificationStore';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useBoothsStore } from '../../stores/useBoothsStore';
import { useScheduleStore } from '../../stores/useScheduleStore';

export default function MainLayout() {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { 
    isNotificationModalOpen, 
    setIsNotificationModalOpen, 
    selectedNotification, 
    setSelectedNotification,
    toggleReadState,
    deleteNotification,
    sendBroadcast,
    isLoading,
    fetchNotifications,
    startConnection,
    stopConnection,
  } = useNotificationStore();

  const { users, fetchUsersAndRoles } = useUsersStore();
  const { fetchLogs } = useLogsStore();
  const { fetchTasks } = useTasksStore();
  const { fetchBooths } = useBoothsStore();
  const { fetchShifts } = useScheduleStore();

  // Load baseline data on app load
  useEffect(() => {
    fetchUsersAndRoles();
    fetchLogs();
    fetchTasks();
    fetchBooths();
    fetchShifts();
    fetchNotifications().catch(() => undefined);
    startConnection().catch(() => undefined);

    return () => {
      stopConnection().catch(() => undefined);
    };
  }, []);

  // Form states for broadcasting warning/alert
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifClass, setNotifClass] = useState<'warning' | 'update' | 'success'>('warning');
  const [notifTag, setNotifTag] = useState('IT Admin');
  const [notifAllUsers, setNotifAllUsers] = useState(true);
  const [notifSelectedUsers, setNotifSelectedUsers] = useState<string[]>([]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifContent.trim()) {
      toast.error('Vui lòng nhập tối thiểu Tiêu đề và Nội dung thông báo.');
      return;
    }

    if (!notifAllUsers && notifSelectedUsers.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người nhận hoặc chọn Thông báo toàn thể.');
      return;
    }

    try {
      await sendBroadcast(
        notifTitle,
        notifContent,
        notifClass,
        notifTag,
        notifAllUsers ? null : notifSelectedUsers,
      );
      toast.success('Đã gửi thông báo.');
      setIsNotificationModalOpen(false);
      setNotifTitle('');
      setNotifContent('');
      setNotifAllUsers(true);
      setNotifSelectedUsers([]);
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi thông báo.');
    }
  };

  const handleToggleReadState = async (id: string) => {
    try {
      await toggleReadState(id);
      toast.success('Đã cập nhật trạng thái đọc.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật thông báo.');
    }
  };

  const handleDeleteNotification = (id: string) => {
    toast.warning('Xóa thông báo này khỏi lịch sử hệ thống?', {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteNotification(id);
            toast.success('Đã xóa thông báo.');
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa thông báo.');
          }
        },
      },
    });
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex font-sans antialiased">
      {/* Sidebar Component */}
      <Sidebar variant="desktop" />
      <Sidebar
        variant="mobile"
        open={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col pl-0 lg:pl-[280px] min-h-screen min-w-0">
        {/* Top Header Component */}
        <TopHeader onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        {/* View Contents */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Global Overlay Modals */}

      {/* Modal: Xem chi tiết thông báo phát thanh */}
      {selectedNotification && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${
                  selectedNotification.type === 'warning'
                    ? 'bg-error-container text-on-error-container'
                    : selectedNotification.type === 'update'
                    ? 'bg-secondary-container text-primary'
                    : 'bg-success-container text-on-success-container'
                }`}>
                  <Bell className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-on-surface-variant bg-surface-2 px-2 py-0.5 rounded">
                  {selectedNotification.id}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">Chi tiết thông báo</span>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-on-surface-variant hover:text-on-surface font-bold px-2 py-1 rounded hover:bg-surface-2 transition-colors cursor-pointer"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-4 text-sm text-on-surface">
              <div>
                <span className={
                  selectedNotification.type === 'warning'
                    ? 'badge-error mb-2'
                    : selectedNotification.type === 'update'
                    ? 'badge-info mb-2'
                    : 'badge-success mb-2'
                }>
                  {selectedNotification.type === 'warning'
                    ? 'Cảnh báo khẩn'
                    : selectedNotification.type === 'update'
                    ? 'Bản cập nhật mới'
                    : 'Đã giải quyết'}
                </span>
                <h3 className="text-base font-bold text-on-surface leading-snug">
                  {selectedNotification.title}
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Gửi lúc: {formatNotificationTime(selectedNotification.time)}
                </p>
              </div>

              <div className="bg-surface-2 border border-outline-variant p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" /> Đối tượng nhận
                </div>
                <p className="text-xs font-bold text-on-primary-container break-words">
                  {selectedNotification.tagName}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Nội dung chi tiết</div>
                <div className="bg-surface-2 border border-outline-variant/60 p-4 rounded-xl text-xs text-on-surface-variant leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedNotification.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/60">
                <button
                  onClick={() => handleToggleReadState(selectedNotification.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all select-none cursor-pointer active:scale-[0.97] ${
                    selectedNotification.isRead
                      ? 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-2'
                  }`}
                >
                  {selectedNotification.isRead ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Đánh dấu chưa đọc
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Đánh dấu đã đọc
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  {selectedNotification.actionUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(selectedNotification.actionUrl!);
                        setSelectedNotification(null);
                      }}
                      className="btn-primary"
                    >
                      Xem mục liên quan
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(selectedNotification.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-xs font-bold text-error hover:bg-error-container px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa bản tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="btn-secondary"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gửi thông báo phát thanh mới */}
      {isNotificationModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-elevated w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <h3 className="text-lg font-bold text-on-surface">Kênh phát thanh & Cảnh báo khẩn</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSendNotification} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1 text-on-surface">Chủ đề phát hành *</label>
                <input
                  type="text"
                  required
                  placeholder="Chủ đề cảnh báo hạ tầng hoặc nâng cấp..."
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-on-surface">Chi tiết nội dung thông báo *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Viết hướng dẫn chi tiết cho đội kỹ thuật xử lý..."
                  value={notifContent}
                  onChange={e => setNotifContent(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="border border-outline-variant rounded-xl p-4 bg-surface-2 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-on-surface">Cấu hình đối tượng nhận</span>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-primary bg-surface border border-outline-variant px-3 py-1.5 rounded-lg shadow-sm hover:bg-surface-2 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={notifAllUsers}
                      onChange={(e) => {
                        setNotifAllUsers(e.target.checked);
                        if (e.target.checked) setNotifSelectedUsers([]);
                      }}
                      className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Thông báo toàn thể user</span>
                  </label>
                </div>

                {!notifAllUsers && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/60 text-xs">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Chọn người nhận ({notifSelectedUsers.length})</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers(users.map(u => u.id))}
                          className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-outline-variant">|</span>
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers([])}
                          className="text-[10px] text-error hover:underline font-bold cursor-pointer"
                        >
                          Bỏ chọn hết
                        </button>
                      </div>
                    </div>
                    {users.length === 0 ? (
                      <p className="text-on-surface-variant text-xs text-center py-2">Không có người dùng nào trong hệ thống</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {users.map(u => {
                          const isChecked = notifSelectedUsers.includes(u.id);
                          return (
                            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-primary/5 border-primary/40 text-on-primary-container' : 'bg-surface border-outline-variant hover:bg-surface-2'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNotifSelectedUsers([...notifSelectedUsers, u.id]);
                                  } else {
                                    setNotifSelectedUsers(notifSelectedUsers.filter(id => id !== u.id));
                                  }
                                }}
                                className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <div className="truncate flex-1">
                                <p className="font-bold text-on-surface truncate">{u.name}</p>
                                <p className="text-[10px] text-on-surface-variant truncate">{u.role}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {notifAllUsers && (
                  <div className="text-xs text-on-success-container bg-success-container border border-success/20 p-2.5 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></div>
                    <span className="font-medium">Hệ thống sẽ phát thông báo này cho <strong>tất cả người dùng</strong>.</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1 text-on-surface">Phân loại & Cấp độ</label>
                  <select
                    value={notifClass}
                    onChange={e => setNotifClass(e.target.value as any)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="warning">Cảnh báo khẩn (Warning)</option>
                    <option value="update">Bản cập nhật mới (Update)</option>
                    <option value="success">Thông tin giải quyết (Resolved)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-on-surface">Gán Thẻ quản trị viên (Tag)</label>
                  <input
                    type="text"
                    value={notifTag}
                    onChange={e => setNotifTag(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  <Send className="w-4 h-4" /> {isLoading ? 'Đang gửi...' : 'Gửi thông báo ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
