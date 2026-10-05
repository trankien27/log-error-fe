import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Users as UsersIcon,
  Camera,
  Mail,
  Phone,
  MapPin,
  Save,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  History,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  AlertCircle,
  KeyRound,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  ChevronRight,
  X
} from 'lucide-react';
import { useUsersStore } from '../../../stores/useUsersStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { usersService } from '../../../services/api/usersService';
import { User } from '../../../types';
import { EmptyState, FilterBar, ListSkeleton, PageHeader, SectionCard, TableSkeletonRows, confirmAction } from '../../../components/ui';

const roleOptions: Array<{ value: User['role']; label: string }> = [
  { value: 'Admin', label: 'Admin' },
  { value: 'ITSupport', label: 'IT support' },
  { value: 'ITSupportManager', label: 'Quản lý IT support' },
];

function getRoleNumber(role: User['role']) {
  if (role === 1 || role === 'Admin') return 1;
  if (role === 2 || role === 'ITSupport' || role === 'IT Support') return 2;
  if (role === 3 || role === 'ITSupportManager' || role === 'Manager') return 3;
  return 2;
}

function getRoleLabel(role: User['role']) {
  const roleNumber = getRoleNumber(role);
  if (roleNumber === 1) return 'Admin';
  if (roleNumber === 3) return 'Quản lý IT support';
  return 'IT support';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa ghi nhận';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa ghi nhận';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Vừa xong';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export default function UsersTab() {
  const canCreateUser = useAuthStore(state => state.hasAnyRole([1]));
  const {
    users,
    searchQuery,
    userRoleFilter,
    isLoading,
    selectedUserProfileUser,
    isUserModalOpen,
    currentEditingUser,
    setSearchQuery,
    setUserRoleFilter,
    setSelectedUserProfileUser,
    setIsUserModalOpen,
    setCurrentEditingUser,
    saveUser,
    deleteUser,
    getFilteredUsers,
    fetchUsersAndRoles
  } = useUsersStore();

  // Local Form states for edit user (or create)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<User['role']>('ITSupport');
  const [userStatus, setUserStatus] = useState<'Hoạt động' | 'Vô hiệu hóa'>('Hoạt động');
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Detailed profile form states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRole, setProfileRole] = useState<User['role']>('ITSupport');
  const [profileDept, setProfileDept] = useState('');

  // Sync profile details if selected profile changes
  useEffect(() => {
    if (selectedUserProfileUser) {
      setProfileName(selectedUserProfileUser.name);
      setProfilePhone(selectedUserProfileUser.phone || '+84 987 654 321');
      setProfileRole(selectedUserProfileUser.role);
      setProfileDept(selectedUserProfileUser.department || 'IT Operations');
    }
  }, [selectedUserProfileUser]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      fetchUsersAndRoles().catch(() => undefined);
    }, 60_000);

    return () => window.clearInterval(refreshTimer);
  }, [fetchUsersAndRoles]);

  const filteredUsers = getFilteredUsers();

  const handleOpenUserModal = (u: User | null = null) => {
    if (!u && !canCreateUser) {
      toast.error('Chỉ Admin mới được tạo người dùng.');
      return;
    }

    if (u) {
      setCurrentEditingUser(u);
      setUserName(u.name);
      setUserEmail(u.email);
      setUserPassword('');
      setUserRole(u.role);
      setUserStatus(u.status);
    } else {
      setCurrentEditingUser(null);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('ITSupport');
      setUserStatus('Hoạt động');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      toast.error('Vui lòng điền đủ tên và địa chỉ email.');
      return;
    }
    if (!currentEditingUser && !userPassword.trim()) {
      toast.error('Vui lòng nhập mật khẩu ban đầu cho người dùng.');
      return;
    }

    const payload = {
      name: userName.trim(),
      email: userEmail.trim(),
      password: userPassword.trim() || undefined,
      role: userRole,
      status: userStatus
    };

    try {
      if (currentEditingUser) {
        await saveUser({ ...payload, id: currentEditingUser.id });
        toast.success('Đã cập nhật người dùng.');
      } else {
        await saveUser(payload);
        toast.success('Đã thêm người dùng.');
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu người dùng.');
    }
  };

  const handleDeleteUserClick = async (id: string) => {
    if (!(await confirmAction({ title: 'Xóa người dùng này?', content: 'Thao tác không thể hoàn tác.' }))) return;
    try {
      await deleteUser(id);
      toast.success('Đã xóa người dùng.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa người dùng.');
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    if (!canCreateUser) {
      toast.error('Chỉ Admin mới được đổi mật khẩu người dùng.');
      return;
    }
    setPasswordTargetUser(user);
    setNewUserPassword('');
    setConfirmUserPassword('');
  };

  const handleResetUserPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTargetUser) return;
    if (newUserPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newUserPassword !== confirmUserPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsResettingPassword(true);
      await usersService.resetPassword(passwordTargetUser.id, newUserPassword);
      toast.success(`Đã đổi mật khẩu cho ${passwordTargetUser.name}.`);
      setPasswordTargetUser(null);
      setNewUserPassword('');
      setConfirmUserPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Không thể đổi mật khẩu người dùng.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserProfileUser) return;
    
    try {
      await saveUser({
        id: selectedUserProfileUser.id,
        name: profileName,
        email: selectedUserProfileUser.email,
        role: profileRole,
        status: selectedUserProfileUser.status,
        phone: profilePhone,
        department: profileDept
      });
      toast.success('Đã lưu thay đổi.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật hồ sơ.');
    }
  };

  const inputClass =
    'w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-on-surface mb-1.5';
  const iconButtonClass =
    'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors cursor-pointer';
  const getInitials = (name: string) => name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'US';
  const getRoleBadgeClass = (role: User['role']) =>
    getRoleNumber(role) === 1 ? 'badge-error' : getRoleNumber(role) === 3 ? 'badge-warning' : 'badge-info';

  const renderAvatar = (user: User, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-24 h-24 text-3xl border-4 border-surface-2' : 'w-10 h-10 text-sm';
    return user.avatar ? (
      <img
        src={user.avatar}
        alt={`Ảnh đại diện của ${user.name}`}
        className={`${sizeClass} rounded-full ${size === 'sm' ? 'border border-outline-variant' : ''} object-cover`}
      />
    ) : (
      <div className={`${sizeClass} rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-semibold`}>
        {getInitials(user.name)}
      </div>
    );
  };

  const renderUserActions = (user: User) => (
    <div className="flex justify-end gap-1.5">
      {canCreateUser && (
        <button
          type="button"
          onClick={() => handleOpenPasswordModal(user)}
          className={`${iconButtonClass} hover:bg-warning-container hover:text-on-warning-container`}
          title="Đổi mật khẩu"
          aria-label={`Đổi mật khẩu cho ${user.name}`}
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => handleOpenUserModal(user)}
        className={`${iconButtonClass} hover:bg-primary-subtle hover:text-primary`}
        title="Sửa"
        aria-label={`Sửa người dùng ${user.name}`}
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleDeleteUserClick(user.id)}
        className={`${iconButtonClass} hover:bg-error-container hover:text-error`}
        title="Xóa"
        aria-label={`Xóa người dùng ${user.name}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderUserIdentity = (user: User) => (
    <button
      type="button"
      onClick={() => setSelectedUserProfileUser(user)}
      className="group flex items-center gap-3 min-w-0 text-left cursor-pointer"
      aria-label={`Xem hồ sơ ${user.name}`}
    >
      <span className="relative shrink-0">
        {renderAvatar(user)}
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface ${user.isOnline ? 'bg-success' : 'bg-outline-variant'}`}
          title={user.isOnline ? 'Đang online' : 'Offline'}
        />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-on-surface text-sm truncate group-hover:text-primary transition-colors">{user.name}</span>
        <span className="block text-xs text-on-surface-variant truncate">{user.email}</span>
      </span>
    </button>
  );

  return (
    selectedUserProfileUser ? (
      <div className="space-y-5 text-on-surface text-left animate-fadeIn">
        <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant select-none" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => setSelectedUserProfileUser(null)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:text-primary hover:bg-primary-subtle transition-colors cursor-pointer"
          >
            <UsersIcon className="w-4 h-4" />
            <span>Người dùng</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-medium text-on-surface">Hồ sơ</span>
        </nav>

        <div className="card-surface p-5 sm:p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative group cursor-pointer shrink-0">
            {renderAvatar(selectedUserProfileUser, 'lg')}
            <div
              onClick={() => toast.info('Tính năng đổi ảnh đại diện sẽ sớm có.')}
              className="absolute inset-0 bg-on-surface/50 rounded-full flex flex-col items-center justify-center text-surface opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              Đổi ảnh
            </div>
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-on-surface break-words">{selectedUserProfileUser.name}</h2>
              <span className={selectedUserProfileUser.isOnline ? 'badge-success' : 'badge-info'}>
                <span className={`w-1.5 h-1.5 rounded-full ${selectedUserProfileUser.isOnline ? 'bg-success animate-pulse' : 'bg-on-surface-variant'}`}></span>
                {selectedUserProfileUser.isOnline ? 'Đang online' : 'Offline'}
              </span>
            </div>
            <p className="text-on-surface-variant text-sm">
              {getRoleNumber(selectedUserProfileUser.role) === 1 ? 'Quản trị viên' :
               getRoleNumber(selectedUserProfileUser.role) === 3 ? 'Quản lý IT support' :
               'IT support'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-on-surface-variant pt-1">
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span className="break-all">{selectedUserProfileUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg">
                <Phone className="w-3.5 h-3.5 text-success" />
                <span>{profilePhone}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-warning" />
                <span>{profileDept}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <SectionCard
            className="lg:col-span-8"
            title="Thông tin hồ sơ"
            description="Cập nhật thông tin liên hệ và vai trò của thành viên."
          >
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={selectedUserProfileUser.email}
                    className={inputClass}
                    title="Email được đồng bộ nội bộ, không sửa trực tiếp được"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Số điện thoại</label>
                  <input
                    type="text"
                    required
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Vai trò</label>
                  <select
                    value={profileRole}
                    onChange={e => setProfileRole(e.target.value as any)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {roleOptions.map(option => (
                      <option key={String(option.value)} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Phòng ban</label>
                <input
                  type="text"
                  required
                  value={profileDept}
                  onChange={e => setProfileDept(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setSelectedUserProfileUser(null)}
                  className="btn-secondary"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="lg:col-span-4 space-y-5">
            <SectionCard title="Đăng nhập" icon={TrendingUp}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-2 rounded-xl p-4 text-center">
                    <p className="text-2xl font-semibold text-on-surface tabular-nums">{selectedUserProfileUser.loginCount ?? 0}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Lượt đăng nhập</p>
                  </div>
                  <div className="bg-success-container rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-on-success-container tabular-nums">{formatRelativeTime(selectedUserProfileUser.lastSeenAt)}</p>
                    <p className="text-xs text-on-success-container/80 mt-1">Hoạt động cuối</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">Đăng nhập cuối</span>
                    <span className="text-right font-medium text-on-surface">{formatDateTime(selectedUserProfileUser.lastLoginAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">Online cuối</span>
                    <span className="text-right font-medium text-on-surface">{formatDateTime(selectedUserProfileUser.lastSeenAt)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Hoạt động gần đây" icon={History}>
              <div className="relative pl-4 border-l-2 border-outline-variant space-y-5 text-xs text-left">
                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-success-container border-2 border-surface rounded-full p-0.5 text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-on-surface text-sm">Đã đóng ticket #TKT-2034</p>
                    <p className="text-[11px] text-on-surface-variant">Lỗi máy in bill CH Q1 · 10 phút trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-secondary-container border-2 border-surface rounded-full p-0.5 text-primary">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-on-surface text-sm">Bình luận trên #TKT-2041</p>
                    <p className="text-[11px] text-on-surface-variant">"Nhờ quầy khởi động router" · 1 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-secondary-container border-2 border-surface rounded-full p-0.5 text-primary">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-on-surface text-sm">Nhận ca #TKT-2045</p>
                    <p className="text-[11px] text-on-surface-variant">Màn hình POS Kiosk Q3 · 3 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-error-container border-2 border-surface rounded-full p-0.5 text-error">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-on-surface text-sm">Cảnh báo máy chủ Server #03</p>
                    <p className="text-[11px] text-on-surface-variant">Ổ đĩa đầy trên 95% · Hôm qua</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-5 text-left animate-fadeIn">
        <PageHeader
          title="Người dùng"
          icon={UsersIcon}
          description="Quản lý tài khoản, vai trò và trạng thái của đội ngũ."
          actions={
            canCreateUser ? (
              <button type="button" onClick={() => handleOpenUserModal()} className="btn-primary">
                <Plus className="w-4 h-4" /> Thêm người dùng
              </button>
            ) : undefined
          }
        />

        <FilterBar>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
              aria-label="Tìm người dùng"
            />
          </div>
          <select
            value={userRoleFilter}
            onChange={e => setUserRoleFilter(e.target.value)}
            className="h-9 px-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface cursor-pointer"
            aria-label="Lọc theo vai trò"
          >
            <option value="">Tất cả vai trò</option>
            {roleOptions.map(option => (
              <option key={String(option.value)} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-outline-variant">
            {isLoading ? (
              <div className="p-4"><ListSkeleton rows={5} /></div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState compact icon={UsersIcon} title="Không tìm thấy người dùng" description="Thử đổi từ khóa hoặc bộ lọc vai trò." />
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {renderUserIdentity(user)}
                    <span className={`${getRoleBadgeClass(user.role)} shrink-0`}>{getRoleLabel(user.role)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Clock className="w-3.5 h-3.5" />
                      {user.isOnline ? 'Đang online' : `Cuối: ${formatRelativeTime(user.lastSeenAt)}`}
                    </span>
                    {renderUserActions(user)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant select-none">
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Người dùng</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Vai trò</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Hoạt động</th>
                  <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 text-right w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <TableSkeletonRows rows={6} columns={4} />
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState compact icon={UsersIcon} title="Không tìm thấy người dùng" description="Thử đổi từ khóa hoặc bộ lọc vai trò." />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 max-w-xs">{renderUserIdentity(user)}</td>
                      <td className="px-4 py-3">
                        <span className={getRoleBadgeClass(user.role)}>{getRoleLabel(user.role)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isOnline ? 'text-success' : 'text-on-surface-variant'}`}>
                            {user.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            {user.isOnline ? `Online · ${formatRelativeTime(user.lastSeenAt)}` : `Cuối: ${formatRelativeTime(user.lastSeenAt)}`}
                          </span>
                          <p className="text-[11px] text-on-surface-variant">
                            {user.loginCount ?? 0} lượt đăng nhập
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right w-32">{renderUserActions(user)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-outline-variant px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm text-on-surface-variant">{filteredUsers.length} tài khoản</span>
            <div className="flex gap-1 select-none">
              <button type="button" className="h-8 px-3 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-2 transition-colors cursor-pointer">Trước</button>
              <button type="button" className="h-8 min-w-8 px-3 rounded-lg bg-primary text-on-primary text-sm font-medium cursor-pointer" aria-current="page">1</button>
              <button type="button" className="h-8 px-3 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-2 transition-colors cursor-pointer" onClick={() => toast.info('Đã hiển thị tất cả người dùng.')}>Sau</button>
            </div>
          </div>
        </SectionCard>

        {isUserModalOpen && (
          <div className="modal-overlay">
            <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto border border-outline-variant">
              <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-outline-variant">
                <h3 className="text-lg font-semibold text-on-surface">
                  {currentEditingUser ? 'Sửa người dùng' : 'Thêm người dùng'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveUserSubmit} className="space-y-4 text-sm text-left p-5">
                <div>
                  <label className={labelClass}>Họ và tên <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Thị Mai"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email <span className="text-error">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="mai.nguyen@company.vn"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {!currentEditingUser && (
                  <div>
                    <label className={labelClass}>Mật khẩu ban đầu <span className="text-error">*</span></label>
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu ban đầu"
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vai trò</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as any)}
                      className={inputClass}
                    >
                      {roleOptions.map(option => (
                        <option key={String(option.value)} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Trạng thái</label>
                    <select
                      value={userStatus}
                      onChange={e => setUserStatus(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Vô hiệu hóa">Vô hiệu hóa</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {passwordTargetUser && (
          <div className="modal-overlay">
            <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md border border-outline-variant text-left">
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-outline-variant">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface">Đổi mật khẩu</h3>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Đặt mật khẩu mới cho <span className="font-medium text-on-surface">{passwordTargetUser.name}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  disabled={isResettingPassword}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer disabled:opacity-50"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetUserPassword} className="space-y-4 text-sm p-5">
                <div>
                  <label className={labelClass}>Mật khẩu mới <span className="text-error">*</span></label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newUserPassword}
                    onChange={event => setNewUserPassword(event.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nhập lại mật khẩu <span className="text-error">*</span></label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmUserPassword}
                    onChange={event => setConfirmUserPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordTargetUser(null)}
                    disabled={isResettingPassword}
                    className="btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="btn-primary"
                  >
                    {isResettingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isResettingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  );
}
