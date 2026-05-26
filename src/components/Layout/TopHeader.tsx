import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, Check, Search, Send } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLogsStore } from '../../stores/useLogsStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useBoothsStore } from '../../stores/useBoothsStore';

export default function TopHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand stores
  const { 
    notifications, 
    toggleReadState, 
    setSelectedNotification, 
    setIsNotificationModalOpen 
  } = useNotificationStore();
  const { logout } = useAuthStore();

  // Search queries for all views
  const logSearch = useLogsStore(s => s.searchQuery);
  const userSearch = useUsersStore(s => s.searchQuery);
  const boothSearch = useBoothsStore(s => s.searchQuery);

  // Dynamic active search query based on location
  const getSearchQuery = () => {
    if (location.pathname === '/error-logs') return logSearch;
    if (location.pathname === '/users') return userSearch;
    if (location.pathname === '/booths') return boothSearch;
    return '';
  };

  const setSearchQuery = (query: string) => {
    useLogsStore.getState().setSearchQuery(query);
    useUsersStore.getState().setSearchQuery(query);
    useBoothsStore.getState().setSearchQuery(query);
  };

  // Local UI States for quick notifications panel
  const [isQuickNotifModalOpen, setIsQuickNotifModalOpen] = useState(false);
  const quickNotifRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickNotifRef.current && !quickNotifRef.current.contains(event.target as Node)) {
        setIsQuickNotifModalOpen(false);
      }
    }
    if (isQuickNotifModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickNotifModalOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogoutClick = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="h-[64px] bg-white border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-10 w-full shrink-0">
      {/* Search Input Box */}
      <div className="flex-1 max-w-sm">
        {['/error-logs', '/users', '/booths'].includes(location.pathname) ? (
          <div className="relative animate-fadeIn">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm log lỗi, tài khoản, máy trạm..."
              value={getSearchQuery()}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[#f3f3fe] border border-outline-variant rounded-full text-xs focus:outline-none focus:border-primary focus:bg-white transition-all placeholder:text-[#434655]"
            />
          </div>
        ) : (
          <div className="text-xs text-gray-400 select-none font-medium italic">
            Nhấn đúp chuột hoặc dùng Sidebar để chuyển đổi trang
          </div>
        )}
      </div>

      <div className="hidden lg:block text-sm font-bold text-[#004ac6] tracking-wide mx-4 select-none">
        IT SUPPORT MANAGEMENT PORTAL
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell Dropdown Container */}
        <div className="relative" ref={quickNotifRef}>
          <button
            onClick={() => setIsQuickNotifModalOpen(prev => !prev)}
            className={`relative p-2 rounded-full transition-all duration-200 select-none ${
              isQuickNotifModalOpen ? 'text-primary bg-primary/10' : 'text-[#434655] hover:bg-[#f3f3fe]'
            }`}
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {isQuickNotifModalOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant w-80 sm:w-96 md:w-[420px] z-50 flex flex-col max-h-[460px] transition-all overflow-hidden animate-fadeIn">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-xs text-gray-900">Trung tâm thông báo</h3>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {unreadCount > 0 ? `Bạn có ${unreadCount} tin mới` : 'Không có tin mới chưa đọc'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickNotifModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded hover:bg-gray-200/50 transition-colors cursor-pointer"
                >
                  &#x2715;
                </button>
              </div>

              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-white text-xs select-none">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Danh sách tin nhận được</span>
                {notifications.some(n => !n.isRead) && (
                  <button
                    type="button"
                    onClick={() => {
                      notifications.forEach(n => {
                        if (!n.isRead) toggleReadState(n.id);
                      });
                    }}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Đánh dấu đọc hết
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-xs font-medium">Hộp thư trống</p>
                    <p className="text-[10px] text-gray-400 mt-1">Hệ thống chưa phát thanh thông báo nào.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) {
                          toggleReadState(notif.id);
                        }
                        setSelectedNotification(notif);
                        setIsQuickNotifModalOpen(false);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex gap-3 ${
                        notif.isRead
                          ? 'border-gray-100 bg-white hover:bg-gray-50 opacity-75'
                          : 'border-primary/20 bg-blue-50/10 hover:bg-blue-50/20 shadow-sm'
                      }`}
                    >
                      {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>}

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'warning'
                          ? 'bg-red-50 text-red-600'
                          : notif.type === 'update'
                          ? 'bg-blue-50 text-primary'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs truncate ${notif.isRead ? 'text-gray-500 font-normal' : 'text-gray-900 font-extrabold'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-gray-400 font-mono whitespace-nowrap shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">{notif.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] text-gray-400 font-bold bg-[#f1f5f9] px-1.5 py-0.5 rounded truncate max-w-[180px]">
                            Gửi đến: {notif.tagName}
                          </span>
                          {notif.tagType === 'Urgent' && (
                            <span className="bg-red-100 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono">
                              Khẩn cấp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t bg-slate-50 flex items-center justify-between gap-1.5 select-none">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/notifications');
                    setIsQuickNotifModalOpen(false);
                  }}
                  className="text-[10px] text-gray-600 hover:text-gray-950 font-bold hover:underline text-left shrink-0 cursor-pointer"
                >
                  Trang lưu trữ thông báo
                </button>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickNotifModalOpen(false);
                      setIsNotificationModalOpen(true);
                    }}
                    className="bg-primary text-white hover:bg-primary-container px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> Gửi phát thanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickNotifModalOpen(false)}
                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-outline-variant"></div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant hover:bg-slate-50 text-[#191b23] cursor-pointer"
        >
          Đăng xuất
        </button>

        <div className="flex items-center gap-2 pl-1">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJxIxM-pTaq-TrY6WNyhAKjLFP2Es54BgSU2qI5i13RoIkH50fE93ywO2E0I_7dwtlyIQsfmiEDHmuqhOmO7kf4gXGSOa0RzX8K9DS9IvUvIiJkEdzFPiR_uD5CBuyEy5sZEL_vd-X1B8Jkbk11HNQpa8ORFqQFbZTCAoZClWjZAQcA_G2DP-I4CbQA1Q1fY4oHRK-U-eeSN4dFf35awAUhqzBxKD80S1ZLBAvULgZylMmBhqKrhW-r6NycH9rf2ASb9mVIT2zemA"
            alt="Profile Avatar"
            className="w-8 h-8 rounded-full border border-outline-variant object-cover hover:ring-2 hover:ring-primary transition-all cursor-pointer"
          />
          <span className="text-xs font-semibold text-[#191b23] hidden md:inline">Admin User</span>
        </div>
      </div>
    </header>
  );
}
