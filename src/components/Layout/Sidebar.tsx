import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';
import { ChevronsLeft, ChevronsRight, Headset, X } from 'lucide-react';
import { useLogsStore } from '../../stores/useLogsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { getVisibleNavGroups, type NavBadgeKey, type NavItem } from './navigation';
import { useNavPermissions } from './useNavPermissions';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

type SidebarProps = {
  variant?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
};

function useBadgeCounts(): Record<NavBadgeKey, number> {
  const newLogs = useLogsStore(state => state.logs.filter(log => log.status === 1).length);
  const pendingTasks = useTasksStore(state => state.tasks.filter(task => task.status === 'pending').length);
  const unreadNotifications = useNotificationStore(state => state.notifications.filter(n => !n.isRead).length);
  return { newLogs, pendingTasks, unreadNotifications };
}

function formatBadge(count: number) {
  return count > 99 ? '99+' : String(count);
}

export default function Sidebar({ variant = 'desktop', open = false, onClose }: SidebarProps) {
  const isMobile = variant === 'mobile';
  const isCollapsedSetting = useLayoutStore(state => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useLayoutStore(state => state.toggleSidebarCollapsed);
  const setSelectedUserProfileUser = useUsersStore(state => state.setSelectedUserProfileUser);
  const permissions = useNavPermissions();
  const badgeCounts = useBadgeCounts();
  const groups = getVisibleNavGroups(permissions, { sidebar: true });
  const isCollapsed = !isMobile && isCollapsedSetting;

  const handleNavigate = (item: NavItem) => {
    if (item.path === '/users') {
      setSelectedUserProfileUser(null);
    }
    if (isMobile) {
      onClose?.();
    }
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const badgeCount = item.badge ? badgeCounts[item.badge] : 0;
    const badgeTone = item.badge === 'pendingTasks' ? 'bg-primary text-on-primary' : 'bg-error text-on-primary';

    const link = (
      <NavLink
        to={item.path}
        onClick={() => handleNavigate(item)}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-xl text-sm transition-colors duration-150 ${
            isCollapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-10 px-3'
          } ${
            isActive
              ? 'bg-primary-subtle text-primary font-semibold'
              : 'text-on-surface-variant font-medium hover:bg-surface-2 hover:text-on-surface'
          }`
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {badgeCount > 0 && (
          isCollapsed ? (
            <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-surface ${badgeTone}`} />
          ) : (
            <span className={`ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${badgeTone}`}>
              {formatBadge(badgeCount)}
            </span>
          )
        )}
      </NavLink>
    );

    return (
      <li key={item.path}>
        {isCollapsed ? (
          <Tooltip title={badgeCount > 0 ? `${item.label} (${formatBadge(badgeCount)})` : item.label} placement="right">
            {link}
          </Tooltip>
        ) : (
          link
        )}
      </li>
    );
  };

  return (
    <>
      {isMobile && open && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-hidden={isMobile && !open}
        style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        className={`bg-surface border-r border-outline-variant flex-col fixed left-0 top-0 h-full transition-[width,transform] duration-200 ${
          isMobile
            ? `z-50 flex lg:hidden shadow-elevated ${open ? 'translate-x-0' : '-translate-x-full'}`
            : 'z-20 hidden lg:flex'
        }`}
      >
        <div className={`h-16 flex items-center shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 shrink-0 rounded-xl bg-primary text-on-primary inline-flex items-center justify-center shadow-brand">
              <Headset className="h-5 w-5" />
            </span>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-[15px] font-bold text-on-surface truncate">IT Support</p>
                <p className="text-xs text-on-surface-variant truncate">Hệ thống quản trị nội bộ</p>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 cursor-pointer"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-1">
          {groups.map((group, index) => (
            <div key={group.label} className={index === 0 ? '' : 'mt-5'}>
              {isCollapsed ? (
                index > 0 && <div className="mx-auto mb-3 h-px w-8 bg-outline-variant" />
              ) : (
                <p className="px-3 mb-1.5 text-xs font-medium text-on-surface-variant/80">{group.label}</p>
              )}
              <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
            </div>
          ))}
        </nav>

        {!isMobile && (
          <div className="border-t border-outline-variant p-3 shrink-0">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className={`h-9 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer ${
                isCollapsed ? 'w-10 justify-center mx-auto flex' : 'w-full px-3'
              }`}
              aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {!isCollapsed && <span>Thu gọn</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
