import React from 'react';
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
import { ErrorLog, SystemNotification, TabType, Task, User } from '../types';

interface SidebarProps {
  activeTab: TabType;
  errorLogs: ErrorLog[];
  tasks: Task[];
  notifications: SystemNotification[];
  setActiveTab: (tab: TabType) => void;
  setSearchQuery: (value: string) => void;
  setSelectedUserProfileUser: (user: User | null) => void;
}

const navButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
    isActive
      ? 'bg-secondary-container text-primary border-l-4 border-primary'
      : 'text-on-surface-variant hover:bg-[#ededf9] hover:text-[#191b23]'
  }`;

export default function Sidebar({
  activeTab,
  errorLogs,
  tasks,
  notifications,
  setActiveTab,
  setSearchQuery,
  setSelectedUserProfileUser,
}: SidebarProps) {
  const newLogsCount = errorLogs.filter(l => l.status === 'Má»›i').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const navigateTo = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    if (tab === 'users') {
      setSelectedUserProfileUser(null);
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
              <span>Tá»•ng quan</span>
            </button>
          </li>
          <li>
            <button onClick={() => navigateTo('error_logs')} className={navButtonClass(activeTab === 'error_logs')}>
              <AlertTriangle className="w-4 h-4" />
              <span>Log lá»—i</span>
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
              <span>CÃ´ng viá»‡c</span>
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
              <span>NgÆ°á»i dÃ¹ng</span>
            </button>
          </li>
          <li>
            <button onClick={() => navigateTo('roles')} className={navButtonClass(activeTab === 'roles')}>
              <Shield className="w-4 h-4" />
              <span>Vai trÃ²</span>
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
              <span>ThÃ´ng bÃ¡o</span>
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
              <span>Lá»‹ch lÃ m viá»‡c</span>
            </button>
          </li>
          <li>
            <button onClick={() => navigateTo('settings')} className={navButtonClass(activeTab === 'settings')}>
              <Settings className="w-4 h-4" />
              <span>CÃ i Ä‘áº·t</span>
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
