import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Palette,
  Search,
  Send,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import { formatNotificationTime, useNotificationStore } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useColorModeStore } from '../../stores/useColorModeStore';
import { getLunarYearName, solarToLunar } from '../../shared/utils/lunarCalendar';
import { findNavEntry } from './navigation';

type TopHeaderProps = {
  onOpenSidebar: () => void;
};

const SOLAR_DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' });
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Re-renders once a minute (aligned to the minute boundary) instead of every second. */
function useCurrentMinute() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return now;
}

function HeaderDate() {
  const now = useCurrentMinute();
  const dayKey = now.toDateString();
  const lunarDate = React.useMemo(() => solarToLunar(now), [dayKey]);
  const lunarText = `${lunarDate.day}/${lunarDate.month}${lunarDate.isLeap ? ' nhuận' : ''}`;
  const title = `${FULL_DATE_FORMAT.format(now)} · Âm lịch ${lunarDate.day}/${lunarDate.month}/${lunarDate.year}${lunarDate.isLeap ? ' nhuận' : ''} (${getLunarYearName(lunarDate.year)})`;

  return (
    <div className="hidden xl:flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-on-surface-variant" title={title}>
      <CalendarDays className="h-4 w-4 shrink-0" />
      <span className="font-medium text-on-surface">{SOLAR_DATE_FORMAT.format(now)}</span>
      <span className="text-on-surface-variant/70">· Âm {lunarText}</span>
    </div>
  );
}

const iconButtonClass = (isActive = false) =>
  `relative h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
    isActive ? 'bg-primary-subtle text-primary' : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
  }`;

export default function TopHeader({ onOpenSidebar }: TopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navEntry = findNavEntry(location.pathname);

  const notifications = useNotificationStore(state => state.notifications);
  const toggleReadState = useNotificationStore(state => state.toggleReadState);
  const markAllRead = useNotificationStore(state => state.markAllRead);
  const setSelectedNotification = useNotificationStore(state => state.setSelectedNotification);
  const setIsNotificationModalOpen = useNotificationStore(state => state.setIsNotificationModalOpen);
  const logout = useAuthStore(state => state.logout);
  const hasAnyRole = useAuthStore(state => state.hasAnyRole);
  const currentUser = useAuthStore(state => state.currentUser);
  const setCommandPaletteOpen = useLayoutStore(state => state.setCommandPaletteOpen);
  const colorMode = useColorModeStore(state => state.resolved);
  const toggleColorMode = useColorModeStore(state => state.toggle);
  const isAdmin = hasAnyRole([1, 'Admin']);
  const canBroadcast = hasAnyRole([1, 3, 'Admin', 'ITSupportManager']);

  const [isQuickNotifOpen, setIsQuickNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const quickNotifRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickNotifRef.current && !quickNotifRef.current.contains(event.target as Node)) {
        setIsQuickNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isQuickNotifOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickNotifOpen, isUserMenuOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const userInitial = (currentUser?.name || '?')[0].toUpperCase();

  const goTo = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/auth');
  };

  return (
    <header className="h-16 bg-surface/85 backdrop-blur-md border-b border-outline-variant flex items-center gap-3 px-3 sm:px-4 lg:px-6 sticky top-0 z-10 w-full shrink-0">
      <button
        type="button"
        onClick={onOpenSidebar}
        className={`lg:hidden shrink-0 ${iconButtonClass()}`}
        aria-label="Mở menu điều hướng"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="min-w-0 flex-1 md:flex-none md:w-64 lg:w-72">
        {navEntry ? (
          <>
            <p className="hidden sm:flex items-center gap-1 text-xs text-on-surface-variant leading-none mb-1">
              <span>{navEntry.group.label}</span>
              <ChevronRight className="h-3 w-3" />
            </p>
            <h1 className="text-base font-semibold text-on-surface truncate leading-tight">{navEntry.item.label}</h1>
          </>
        ) : (
          <h1 className="text-base font-semibold text-on-surface truncate">IT Support</h1>
        )}
      </div>

      <div className="hidden md:flex flex-1 justify-center min-w-0">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full max-w-md h-9 inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-2/60 px-3 text-sm text-on-surface-variant hover:border-primary/40 hover:bg-surface transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Tìm trang, chức năng…</span>
          <kbd className="ml-auto hidden lg:inline-flex items-center whitespace-nowrap shrink-0 rounded-md border border-outline-variant bg-surface px-1.5 py-0.5 font-sans text-[11px] text-on-surface-variant">
            {IS_MAC ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto md:ml-0">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className={`md:hidden ${iconButtonClass()}`}
          aria-label="Tìm kiếm"
        >
          <Search className="h-5 w-5" />
        </button>

        <HeaderDate />

        <button
          type="button"
          onClick={toggleColorMode}
          className={iconButtonClass()}
          aria-label={colorMode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={colorMode === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
        >
          {colorMode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={quickNotifRef}>
          <button
            type="button"
            onClick={() => setIsQuickNotifOpen(prev => !prev)}
            className={iconButtonClass(isQuickNotifOpen)}
            aria-label="Thông báo"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-error text-on-primary text-[11px] font-semibold ring-2 ring-surface tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isQuickNotifOpen && (
            <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 bg-surface rounded-2xl shadow-elevated border border-outline-variant sm:w-[400px] z-50 flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[480px] overflow-hidden animate-fadeIn">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-on-surface">Thông báo</h3>
                  <p className="text-xs text-on-surface-variant">
                    {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead().catch(() => undefined)}
                      className="h-8 px-2 rounded-lg text-xs font-medium text-primary hover:bg-primary-subtle inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Đọc hết
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsQuickNotifOpen(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                    <span className="h-12 w-12 rounded-full bg-surface-2 inline-flex items-center justify-center mb-3">
                      <Bell className="w-5 h-5 text-on-surface-variant" />
                    </span>
                    <p className="text-sm font-medium text-on-surface">Chưa có thông báo nào</p>
                    <p className="text-xs text-on-surface-variant mt-1">Thông báo mới sẽ xuất hiện ở đây.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button
                      type="button"
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) {
                          toggleReadState(notif.id);
                        }
                        setSelectedNotification(notif.isRead ? notif : { ...notif, isRead: true });
                        setIsQuickNotifOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-left transition-colors cursor-pointer flex gap-3 ${
                        notif.isRead ? 'hover:bg-surface-2' : 'bg-primary-subtle/60 hover:bg-primary-subtle'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'warning'
                          ? 'bg-error-container text-on-error-container'
                          : notif.type === 'update'
                          ? 'bg-secondary-container text-primary'
                          : 'bg-success-container text-on-success-container'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm truncate ${notif.isRead ? 'text-on-surface-variant' : 'text-on-surface font-semibold'}`}>
                            {notif.title}
                          </span>
                          <span className="text-xs text-on-surface-variant tabular-nums whitespace-nowrap shrink-0">
                            {formatNotificationTime(notif.time)}
                          </span>
                        </span>
                        <span className="block text-xs text-on-surface-variant line-clamp-2 mt-0.5 whitespace-pre-wrap">{notif.content}</span>
                        <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-on-surface-variant truncate max-w-[200px]">Gửi đến: {notif.tagName}</span>
                          {notif.tagType === 'Urgent' && <span className="badge-error">Khẩn cấp</span>}
                        </span>
                      </span>
                      {!notif.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              <div className="px-3 py-2.5 border-t border-outline-variant flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/notifications');
                    setIsQuickNotifOpen(false);
                  }}
                  className="h-8 px-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-2 cursor-pointer"
                >
                  Xem tất cả
                </button>
                {canBroadcast && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickNotifOpen(false);
                      setIsNotificationModalOpen(true);
                    }}
                    className="h-8 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Gửi thông báo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(current => !current)}
            className="flex items-center gap-2 rounded-lg p-1 sm:pr-2 hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Mở menu tài khoản"
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary-subtle text-primary inline-flex items-center justify-center text-sm font-semibold select-none">
                {userInitial}
              </span>
            )}
            <span className="text-sm font-medium text-on-surface hidden lg:inline max-w-[140px] truncate">{currentUser?.name}</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-elevated z-50 animate-fadeIn">
              <div className="border-b border-outline-variant px-4 py-3">
                <p className="truncate text-sm font-semibold text-on-surface">{currentUser?.name || 'Tài khoản'}</p>
                <p className="truncate text-xs text-on-surface-variant">{currentUser?.email || 'Đang đăng nhập'}</p>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => goTo('/settings')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-2 cursor-pointer"
                >
                  <UserCog className="h-4 w-4 text-on-surface-variant" />
                  <span>Thiết lập tài khoản</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => goTo('/appearance')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-2 cursor-pointer"
                  >
                    <Palette className="h-4 w-4 text-on-surface-variant" />
                    <span>Cài đặt giao diện</span>
                  </button>
                )}
              </div>
              <div className="border-t border-outline-variant p-1.5">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-error-container cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
