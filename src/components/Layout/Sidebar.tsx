import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock3,
  ClipboardList,
  Database,
  History,
  LayoutDashboard,
  LibraryBig,
  NotebookTabs,
  MessageSquare,
  Printer,
  RadioTower,
  ScrollText,
  Shield,
  Store,
  TimerReset,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { listDictionariesService } from '../../services/api/listDictionariesService';
import { ListDictionarySidebarDto, TabType } from '../../types';

const navButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
    isActive
      ? 'bg-secondary-container text-on-secondary-container border-l-4 border-primary font-bold'
      : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
  }`;

const dictionaryNavButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${
    isActive
      ? 'bg-secondary-container text-on-secondary-container ring-1 ring-primary/30'
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
  const [sidebarDictionaries, setSidebarDictionaries] = useState<ListDictionarySidebarDto[]>([]);
  const [isOtherDictionariesOpen, setIsOtherDictionariesOpen] = useState(
    location.pathname.startsWith('/list-dictionaries'),
  );

  // Zustand State subscriptions
  const { logs } = useLogsStore();
  const { tasks } = useTasksStore();
  const { notifications } = useNotificationStore();
  const { setSelectedUserProfileUser } = useUsersStore();
  const { hasAnyRole, getCurrentRoleNumber } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const canApproveOvertime = hasAnyRole([1, 3, 'Admin', 'ITSupportManager']);
  const canViewR2Usage = hasAnyRole([1, 3, 'Admin', 'ITSupportManager']);
  const canViewShifts = getCurrentRoleNumber() !== 2;

  useEffect(() => {
    let isMounted = true;
    const loadSidebarDictionaries = async () => {
      try {
        const data = await listDictionariesService.getSidebar();
        if (isMounted) setSidebarDictionaries(data);
      } catch {
        if (isMounted) setSidebarDictionaries([]);
      }
    };

    const handleSidebarUpdated = () => void loadSidebarDictionaries();
    void loadSidebarDictionaries();
    window.addEventListener('list-dictionaries:sidebar-updated', handleSidebarUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('list-dictionaries:sidebar-updated', handleSidebarUpdated);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/list-dictionaries')) {
      setIsOtherDictionariesOpen(true);
    }
  }, [location.pathname]);

  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/overview') return 'overview';
    if (path === '/error-logs') return 'error_logs';
    if (path === '/transaction-error-queue') return 'transaction_error_queue';
    if (path === '/tasks') return 'tasks';
    if (path === '/recent-activities') return 'recent_activities';
    if (path === '/api-audit-logs') return 'api_audit_logs';
    if (path === '/chat') return 'chat';
    if (path === '/users') return 'users';
    if (path === '/roles') return 'roles';
    if (path === '/stores') return 'stores';
    if (path === '/booths') return 'booths';
    if (path === '/remote-booth') return 'remote_booth';
    if (path === '/print-image') return 'print_image';
    if (path === '/recreate-image') return 'recreate_image';
    if (path === '/shifts') return 'shifts';
    if (path.startsWith('/list-dictionaries')) return 'list_dictionaries';
    if (path === '/documents') return 'documents';
    if (path === '/notifications') return 'notifications';
    if (path === '/schedule') return 'schedule';
    if (path === '/overtime-approval') return 'overtime_approval';
    if (path === '/r2-usage') return 'r2_usage';
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
      case 'api_audit_logs': navigate('/api-audit-logs'); break;
      case 'chat': navigate('/chat'); break;
      case 'users': navigate('/users'); break;
      case 'roles': navigate('/roles'); break;
      case 'stores': navigate('/stores'); break;
      case 'booths': navigate('/booths'); break;
      case 'remote_booth': navigate('/remote-booth'); break;
      case 'print_image': navigate('/print-image'); break;
      case 'recreate_image': navigate('/recreate-image'); break;
      case 'shifts': navigate('/shifts'); break;
      case 'list_dictionaries': navigate('/list-dictionaries'); break;
      case 'documents': navigate('/documents'); break;
      case 'notifications': navigate('/notifications'); break;
      case 'schedule': navigate('/schedule'); break;
      case 'overtime_approval': navigate('/overtime-approval'); break;
      case 'r2_usage': navigate('/r2-usage'); break;
      case 'settings': navigate('/settings'); break;
      default: navigate('/overview');
    }

    if (isMobile) {
      onClose?.();
    }
  };

  const navigateToDictionary = (code: string) => {
    navigate(`/list-dictionaries/${encodeURIComponent(code)}`);
    if (isMobile) onClose?.();
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
            {isAdmin && (
              <li>
                <button onClick={() => navigateTo('api_audit_logs')} className={navButtonClass(activeTab === 'api_audit_logs')}>
                  <ScrollText className="w-4 h-4" />
                  <span>Audit API</span>
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
              <button onClick={() => navigateTo('stores')} className={navButtonClass(activeTab === 'stores')}>
                <Building2 className="w-4 h-4" />
                <span>Cửa hàng</span>
              </button>
            </li>
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
            <li>
              <button onClick={() => navigateTo('recreate_image')} className={navButtonClass(activeTab === 'recreate_image')}>
                <Wand2 className="w-4 h-4" />
                <span>Tạo lại ảnh</span>
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
              <button
                type="button"
                onClick={() => setIsOtherDictionariesOpen(current => !current)}
                className={navButtonClass(activeTab === 'list_dictionaries')}
                aria-expanded={isOtherDictionariesOpen}
                aria-controls="other-dictionaries-menu"
                title={isOtherDictionariesOpen ? 'Thu gọn danh mục khác' : 'Mở rộng danh mục khác'}
              >
                <LibraryBig className="w-4 h-4" />
                <span>Danh mục khác</span>
                {sidebarDictionaries.length > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary">
                    {sidebarDictionaries.length}
                  </span>
                )}
                <ChevronDown className={`${sidebarDictionaries.length === 0 ? 'ml-auto' : ''} h-4 w-4 transition-transform duration-200 ${isOtherDictionariesOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                id="other-dictionaries-menu"
                aria-hidden={!isOtherDictionariesOpen}
                inert={!isOtherDictionariesOpen}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOtherDictionariesOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-5 mt-1 space-y-1 border-l border-outline-variant pl-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => navigateTo('list_dictionaries')}
                        className={dictionaryNavButtonClass(location.pathname === '/list-dictionaries')}
                      >
                        Quản lý danh mục
                      </button>
                    )}
                    {sidebarDictionaries.map(dictionary => (
                      <button
                        key={dictionary.id}
                        type="button"
                        onClick={() => navigateToDictionary(dictionary.code)}
                        className={dictionaryNavButtonClass(
                          location.pathname === `/list-dictionaries/${encodeURIComponent(dictionary.code)}`,
                        )}
                        title={dictionary.name}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="truncate">{dictionary.name}</span>
                      </button>
                    ))}
                    {sidebarDictionaries.length === 0 && !isAdmin && (
                      <p className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant">
                        Chưa có danh mục hiển thị
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
            <li>
              <button onClick={() => navigateTo('documents')} className={navButtonClass(activeTab === 'documents')}>
                <NotebookTabs className="w-4 h-4" />
                <span>Tài liệu</span>
              </button>
            </li>
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
            {canViewR2Usage && (
              <li>
                <button onClick={() => navigateTo('r2_usage')} className={navButtonClass(activeTab === 'r2_usage')}>
                  <Database className="w-4 h-4" />
                  <span>Hạn mức R2</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
