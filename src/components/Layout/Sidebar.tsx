import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock3,
  ClipboardList,
  History,
  LayoutDashboard,
  MessageSquare,
  Printer,
  RadioTower,
  Shield,
  Store,
  TimerReset,
  Users,
  X,
} from 'lucide-react';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { TabType } from '../../types';

const navButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
    isActive
      ? 'bg-secondary-container text-primary border-l-4 border-primary font-bold'
      : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
  }`;

type SidebarProps = {
  variant?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ variant = 'desktop', open = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = variant === 'mobile';

  // Zustand State subscriptions
  const { logs } = useLogsStore();
  const { tasks } = useTasksStore();
  const { notifications } = useNotificationStore();
  const { setSelectedUserProfileUser } = useUsersStore();
  const { hasAnyRole, getCurrentRoleNumber } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const canApproveOvertime = hasAnyRole([1, 3, 'Admin', 'ITSupportManager']);
  const canViewShifts = getCurrentRoleNumber() !== 2;

  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/overview') return 'overview';
    if (path === '/error-logs') return 'error_logs';
    if (path === '/transaction-error-queue') return 'transaction_error_queue';
    if (path === '/tasks') return 'tasks';
    if (path === '/recent-activities') return 'recent_activities';
    if (path === '/chat') return 'chat';
    if (path === '/users') return 'users';
    if (path === '/roles') return 'roles';
    if (path === '/booths') return 'booths';
    if (path === '/remote-booth') return 'remote_booth';
    if (path === '/print-image') return 'print_image';
    if (path === '/shifts') return 'shifts';
    if (path === '/notifications') return 'notifications';
    if (path === '/schedule') return 'schedule';
    if (path === '/overtime-approval') return 'overtime_approval';
    if (path === '/settings') return 'settings';
    return 'overview';
  };

  const activeTab = getActiveTab();
  const newLogsCount = logs.filter(l => l.status === 1).length;
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const navigateTo = (tab: TabType) => {
    if (tab === 'users') {
      setSelectedUserProfileUser(null);
    }
    
    // Router navigation instead of simple state toggle
    switch (tab) {
      case 'overview': navigate('/overview'); break;
      case 'error_logs': navigate('/error-logs'); break;
      case 'transaction_error_queue': navigate('/transaction-error-queue'); break;
      case 'tasks': navigate('/tasks'); break;
      case 'recent_activities': navigate('/recent-activities'); break;
      case 'chat': navigate('/chat'); break;
      case 'users': navigate('/users'); break;
      case 'roles': navigate('/roles'); break;
      case 'booths': navigate('/booths'); break;
      case 'remote_booth': navigate('/remote-booth'); break;
      case 'print_image': navigate('/print-image'); break;
      case 'shifts': navigate('/shifts'); break;
      case 'notifications': navigate('/notifications'); break;
      case 'schedule': navigate('/schedule'); break;
      case 'overtime_approval': navigate('/overtime-approval'); break;
      case 'settings': navigate('/settings'); break;
      default: navigate('/overview');
    }

    if (isMobile) {
      onClose?.();
    }
  };

  return (
    <>
      {isMobile && open && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-on-surface/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-hidden={isMobile && !open}
        className={`w-[280px] bg-surface border-r border-outline-variant flex-col fixed left-0 top-0 h-full transition-transform duration-200 ${
          isMobile
            ? `z-50 flex lg:hidden shadow-2xl ${open ? 'translate-x-0' : '-translate-x-full'}`
            : 'z-20 hidden lg:flex'
        }`}
      >
        <div className="h-[64px] flex items-center px-6 border-b border-outline-variant shrink-0 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary tracking-tight">IT Support</span>
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-2 cursor-pointer"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-2.5 h-2.5 bg-success rounded-full animate-ping"></span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 flex flex-col justify-between">
          <ul className="space-y-1 px-2">
            <li>
              <button onClick={() => navigateTo('overview')} className={navButtonClass(activeTab === 'overview')}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan</span>
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('error_logs')} className={navButtonClass(activeTab === 'error_logs')}>
                <AlertTriangle className="w-4 h-4" />
                <span>Log lỗi</span>
                {newLogsCount > 0 && (
                  <span className="ml-auto bg-error text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {newLogsCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('tasks')} className={navButtonClass(activeTab === 'tasks')}>
                <ClipboardList className="w-4 h-4" />
                <span>Công việc</span>
                {pendingTasksCount > 0 && (
                  <span className="ml-auto bg-primary text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {pendingTasksCount}
                  </span>
                )}
              </button>
            </li>
            {isAdmin && (
              <li>
                <button onClick={() => navigateTo('recent_activities')} className={navButtonClass(activeTab === 'recent_activities')}>
                  <History className="w-4 h-4" />
                  <span>Hoạt động gần đây</span>
                </button>
              </li>
            )}
            <li>
              <button onClick={() => navigateTo('chat')} className={navButtonClass(activeTab === 'chat')}>
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
            </li>
            {isAdmin && (
              <>
                <li>
                  <button onClick={() => navigateTo('users')} className={navButtonClass(activeTab === 'users')}>
                    <Users className="w-4 h-4" />
                    <span>Người dùng</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('roles')} className={navButtonClass(activeTab === 'roles')}>
                    <Shield className="w-4 h-4" />
                    <span>Vai trò</span>
                  </button>
                </li>
              </>
            )}
            <li>
              <button onClick={() => navigateTo('booths')} className={navButtonClass(activeTab === 'booths')}>
                <Store className="w-4 h-4" />
                <span>Booth</span>
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('transaction_error_queue')} className={navButtonClass(activeTab === 'transaction_error_queue')}>
                <AlertTriangle className="w-4 h-4" />
                <span>Queue lỗi</span>
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('remote_booth')} className={navButtonClass(activeTab === 'remote_booth')}>
                <RadioTower className="w-4 h-4" />
                <span>Remote Booth</span>
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('print_image')} className={navButtonClass(activeTab === 'print_image')}>
                <Printer className="w-4 h-4" />
                <span>In ảnh</span>
              </button>
            </li>
            {canViewShifts && (
              <li>
                <button onClick={() => navigateTo('shifts')} className={navButtonClass(activeTab === 'shifts')}>
                  <Clock3 className="w-4 h-4" />
                  <span>Ca làm việc</span>
                </button>
              </li>
            )}
            <li>
              <button onClick={() => navigateTo('notifications')} className={navButtonClass(activeTab === 'notifications')}>
                <Bell className="w-4 h-4" />
                <span>Thông báo</span>
                {unreadNotificationsCount > 0 && (
                  <span className="ml-auto bg-error text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('schedule')} className={navButtonClass(activeTab === 'schedule')}>
                <Calendar className="w-4 h-4" />
                <span>Lịch làm việc</span>
              </button>
            </li>
            {canApproveOvertime && (
              <li>
                <button onClick={() => navigateTo('overtime_approval')} className={navButtonClass(activeTab === 'overtime_approval')}>
                  <TimerReset className="w-4 h-4" />
                  <span>Duyệt OT</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
