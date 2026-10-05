import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Clock3,
  ClipboardList,
  Database,
  History,
  Images,
  LayoutDashboard,
  ListX,
  MessageSquare,
  NotebookTabs,
  Palette,
  Printer,
  RadioTower,
  ScrollText,
  Shield,
  Store,
  TimerReset,
  UserCog,
  Users,
  Wand2,
} from 'lucide-react';

export type NavPermissions = {
  isAdmin: boolean;
  canApproveOvertime: boolean;
  canViewR2Usage: boolean;
  canViewShifts: boolean;
};

export type NavBadgeKey = 'newLogs' | 'pendingTasks' | 'unreadNotifications';

export type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Extra words used by the command palette search. */
  keywords?: string;
  badge?: NavBadgeKey;
  isVisible?: (permissions: NavPermissions) => boolean;
  /** Hidden from the sidebar but still reachable from header/palette. */
  hideInSidebar?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { path: '/overview', label: 'Tổng quan', icon: LayoutDashboard, keywords: 'dashboard trang chu' },
      { path: '/error-logs', label: 'Log lỗi', icon: AlertTriangle, badge: 'newLogs', keywords: 'error log loi' },
      { path: '/transaction-error-queue', label: 'Hàng đợi lỗi', icon: ListX, keywords: 'queue giao dich transaction' },
      { path: '/tasks', label: 'Công việc', icon: ClipboardList, badge: 'pendingTasks', keywords: 'task kanban viec' },
    ],
  },
  {
    label: 'Booth & cửa hàng',
    items: [
      { path: '/stores', label: 'Cửa hàng', icon: Building2, keywords: 'store' },
      { path: '/booths', label: 'Booth', icon: Store, keywords: 'tram may' },
      { path: '/remote-booth', label: 'Điều khiển từ xa', icon: RadioTower, keywords: 'remote booth deploy' },
    ],
  },
  {
    label: 'Hình ảnh',
    items: [
      { path: '/print-image', label: 'In ảnh', icon: Printer, keywords: 'print' },
      { path: '/recreate-image', label: 'Tạo lại ảnh', icon: Wand2, keywords: 'recreate' },
      { path: '/up-frame', label: 'Tải khung ảnh', icon: Images, keywords: 'up frame theme khung' },
    ],
  },
  {
    label: 'Nhân sự & lịch',
    items: [
      { path: '/schedule', label: 'Lịch làm việc', icon: Calendar, keywords: 'schedule lich truc' },
      { path: '/shifts', label: 'Ca làm việc', icon: Clock3, keywords: 'shift ca', isVisible: p => p.canViewShifts },
      { path: '/overtime-approval', label: 'Duyệt tăng ca', icon: TimerReset, keywords: 'ot overtime tang ca', isVisible: p => p.canApproveOvertime },
    ],
  },
  {
    label: 'Trao đổi',
    items: [
      { path: '/chat', label: 'Trò chuyện', icon: MessageSquare, keywords: 'chat tin nhan' },
      { path: '/notifications', label: 'Thông báo', icon: Bell, badge: 'unreadNotifications', keywords: 'notification' },
      { path: '/documents', label: 'Tài liệu', icon: NotebookTabs, keywords: 'document huong dan' },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { path: '/users', label: 'Người dùng', icon: Users, keywords: 'user nhan vien', isVisible: p => p.isAdmin },
      { path: '/roles', label: 'Vai trò', icon: Shield, keywords: 'role phan quyen', isVisible: p => p.isAdmin },
      { path: '/recent-activities', label: 'Hoạt động gần đây', icon: History, keywords: 'activity lich su', isVisible: p => p.isAdmin },
      { path: '/api-audit-logs', label: 'Nhật ký API', icon: ScrollText, keywords: 'audit api', isVisible: p => p.isAdmin },
      { path: '/r2-usage', label: 'Dung lượng lưu trữ', icon: Database, keywords: 'r2 storage han muc', isVisible: p => p.canViewR2Usage },
      { path: '/settings', label: 'Thiết lập tài khoản', icon: UserCog, keywords: 'settings account mat khau', hideInSidebar: true },
      { path: '/appearance', label: 'Cài đặt giao diện', icon: Palette, keywords: 'appearance theme mau', isVisible: p => p.isAdmin, hideInSidebar: true },
    ],
  },
];

export function getVisibleNavGroups(permissions: NavPermissions, options: { sidebar?: boolean } = {}): NavGroup[] {
  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        (item.isVisible ? item.isVisible(permissions) : true) && !(options.sidebar && item.hideInSidebar),
      ),
    }))
    .filter(group => group.items.length > 0);
}

export function findNavEntry(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    const item = group.items.find(entry => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
    if (item) return { group, item };
  }
  return null;
}
