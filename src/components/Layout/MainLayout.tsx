import React, { useEffect, useState } from 'react';
/// <reference types="react" />
import { Outlet } from 'react-router-dom';
import { Bell, Clock, CheckCircle, Check, Trash2, Users, Send } from 'lucide-react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useBoothsStore } from '../../stores/useBoothsStore';
import { useScheduleStore } from '../../stores/useScheduleStore';

export default function MainLayout() {
  const { 
    isNotificationModalOpen, 
    setIsNotificationModalOpen, 
    selectedNotification, 
    setSelectedNotification,
    toggleReadState,
    deleteNotification,
    sendBroadcast 
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
      alert('Vui lòng nhập tối thiểu Tiêu đề và Nội dung thông báo.');
      return;
    }

    if (!notifAllUsers && notifSelectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một người nhận hoặc chọn Thông báo toàn thể.');
      return;
    }

    const audience = notifAllUsers ? 'Toàn thể user' : notifSelectedUsers.join(', ');
    await sendBroadcast(notifTitle, notifContent, notifClass, notifTag, audience);
    
    setIsNotificationModalOpen(false);
    setNotifTitle('');
    setNotifContent('');
    setNotifAllUsers(true);
    setNotifSelectedUsers([]);
  };

  return (
    <div className="bg-[#faf8ff] text-[#191b23] min-h-screen flex font-sans antialiased">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col pl-[280px] min-h-screen">
        {/* Top Header Component */}
        <TopHeader />

        {/* View Contents */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Overlay Modals */}

      {/* Modal: Xem chi tiết thông báo phát thanh */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${
                  selectedNotification.type === 'warning'
                    ? 'bg-red-50 text-red-600'
                    : selectedNotification.type === 'update'
                    ? 'bg-blue-50 text-primary'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Bell className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedNotification.id}
                </span>
                <span className="text-xs text-gray-500 font-medium">Chi tiết thông báo</span>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#191b23]">
              <div>
                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                  selectedNotification.type === 'warning'
                    ? 'bg-red-100 text-red-800'
                    : selectedNotification.type === 'update'
                    ? 'bg-blue-100 text-primary'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedNotification.type === 'warning'
                    ? 'Cảnh báo khẩn'
                    : selectedNotification.type === 'update'
                    ? 'Bản cập nhật mới'
                    : 'Đã giải quyết'}
                </span>
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {selectedNotification.title}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Gửi lúc: {selectedNotification.time}
                </p>
              </div>

              <div className="bg-[#f8fafc] border border-outline-variant p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" /> Đối tượng nhận
                </div>
                <p className="text-xs font-bold text-[#00174b] break-words">
                  {selectedNotification.tagName}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nội dung chi tiết</div>
                <div className="bg-slate-50 border border-[#f1f5f9] p-4 rounded-xl text-xs text-gray-700 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedNotification.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
                <button
                  onClick={() => toggleReadState(selectedNotification.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all select-none cursor-pointer ${
                    selectedNotification.isRead
                      ? 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-slate-300 text-gray-600 bg-white hover:bg-gray-50'
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
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xóa thông báo này khỏi lịch sử hệ thống?')) {
                        deleteNotification(selectedNotification.id);
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa bản tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-transform active:scale-95 text-xs cursor-pointer"
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
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">Kênh phát thanh & Cảnh báo khẩn</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="text-gray-400 hover:text-gray-650 font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSendNotification} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Chủ đề phát hành *</label>
                <input
                  type="text"
                  required
                  placeholder="Chủ đề cảnh báo hạ tầng hoặc nâng cấp..."
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Chi tiết nội dung thông báo *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Viết hướng dẫn chi tiết cho đội kỹ thuật xử lý..."
                  value={notifContent}
                  onChange={e => setNotifContent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>

              <div className="border border-outline-variant rounded-xl p-4 bg-[#f8fafc] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-gray-800">Cấu hình đối tượng nhận</span>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-primary bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={notifAllUsers}
                      onChange={(e) => {
                        setNotifAllUsers(e.target.checked);
                        if (e.target.checked) setNotifSelectedUsers([]);
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Thông báo toàn thể user</span>
                  </label>
                </div>

                {!notifAllUsers && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-200 text-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chọn người nhận ({notifSelectedUsers.length})</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers(users.map(u => u.name))}
                          className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers([])}
                          className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                        >
                          Bỏ chọn hết
                        </button>
                      </div>
                    </div>
                    {users.length === 0 ? (
                      <p className="text-gray-400 text-xs text-center py-2">Không có người dùng nào trong hệ thống</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {users.map(u => {
                          const isChecked = notifSelectedUsers.includes(u.name);
                          return (
                            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-primary/5 border-primary/40 text-[#00174b]' : 'bg-white border-outline-variant hover:bg-gray-50'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNotifSelectedUsers([...notifSelectedUsers, u.name]);
                                  } else {
                                    setNotifSelectedUsers(notifSelectedUsers.filter(name => name !== u.name));
                                  }
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <div className="truncate flex-1">
                                <p className="font-bold text-gray-900 truncate">{u.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{u.role}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {notifAllUsers && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200/50 p-2.5 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="font-medium">Hệ thống sẽ phát thông báo này cho <strong>tất cả người dùng</strong>.</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Phân loại & Cấp độ</label>
                  <select
                    value={notifClass}
                    onChange={e => setNotifClass(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
                  >
                    <option value="warning">Cảnh báo khẩn (Warning)</option>
                    <option value="update">Bản cập nhật mới (Update)</option>
                    <option value="success">Thông tin giải quyết (Resolved)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Gán Thẻ quản trị viên (Tag)</label>
                  <input
                    type="text"
                    value={notifTag}
                    onChange={e => setNotifTag(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Gửi thông báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
