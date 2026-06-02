import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Shield,
  Store,
  Users,
} from 'lucide-react';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { TabType } from '../../types';

const navButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
    isActive
      ? 'bg-secondary-container text-primary border-l-4 border-primary font-bold'
      : 'text-on-surface-variant hover:bg-[#ededf9] hover:text-[#191b23]'
  }`;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Zustand State subscriptions
  const { logs } = useLogsStore();
  const { tasks } = useTasksStore();
  const { notifications } = useNotificationStore();
  const { setSelectedUserProfileUser } = useUsersStore();

  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/overview') return 'overview';
    if (path === '/error-logs') return 'error_logs';
    if (path === '/tasks') return 'tasks';
    if (path === '/users') return 'users';
    if (path === '/roles') return 'roles';
    if (path === '/booths') return 'booths';
    if (path === '/notifications') return 'notifications';
    if (path === '/schedule') return 'schedule';
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
      case 'tasks': navigate('/tasks'); break;
      case 'users': navigate('/users'); break;
      case 'roles': navigate('/roles'); break;
      case 'booths': navigate('/booths'); break;
      case 'notifications': navigate('/notifications'); break;
      case 'schedule': navigate('/schedule'); break;
      case 'settings': navigate('/settings'); break;
      default: navigate('/overview');
    }
  };

  return (
    <aside className="w-[280px] bg-white border-r border-outline-variant flex flex-col fixed left-0 top-0 h-full z-20">
      <div className="h-[64px] flex items-center px-6 border-b border-outline-variant shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-primary tracking-tight">IT Admin System</span>
        </div>
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
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
                <span className="ml-auto bg-red-600 text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
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
                <span className="ml-auto bg-[#2563eb] text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {pendingTasksCount}
                </span>
              )}
            </button>
          </li>
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
          <li>
            <button onClick={() => navigateTo('booths')} className={navButtonClass(activeTab === 'booths')}>
              <Store className="w-4 h-4" />
              <span>Booth</span>
            </button>
          </li>
          <li>
            <button onClick={() => navigateTo('notifications')} className={navButtonClass(activeTab === 'notifications')}>
              <Bell className="w-4 h-4" />
              <span>Thông báo</span>
              {unreadNotificationsCount > 0 && (
                <span className="ml-auto bg-[#ba1a1a] text-white font-sans text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
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
          <li>
            <button onClick={() => navigateTo('settings')} className={navButtonClass(activeTab === 'settings')}>
              <Settings className="w-4 h-4" />
              <span>Cài đặt</span>
            </button>
          </li>
        </ul>

        <div className="p-4 border-t border-outline-variant mx-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#dbe1ff] text-[#00174b] flex items-center justify-center font-bold text-sm">
              IT
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-[#191b23] truncate">IT Support</p>
              <p className="text-[10px] text-[#434655] truncate">Reliable Support Team</p>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
