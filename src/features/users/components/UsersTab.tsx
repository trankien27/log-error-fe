import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  WifiOff
} from 'lucide-react';
import { useUsersStore } from '../../../stores/useUsersStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { usersService } from '../../../services/api/usersService';
import { User } from '../../../types';

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
      toast.error('Chỉ role 1 mới được tạo người dùng.');
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
        toast.success('Cập nhật người dùng thành công.');
      } else {
        await saveUser(payload);
        toast.success('Thêm người dùng thành công.');
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu người dùng.');
    }
  };

  const handleDeleteUserClick = async (id: string) => {
    toast.warning(`Xóa người dùng ${id}?`, {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteUser(id);
            toast.success('Đã xóa người dùng.');
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa người dùng.');
          }
        },
      },
    });
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
      toast.success('Cập nhật thông tin hồ sơ thành công.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật hồ sơ.');
    }
  };

  return (
    selectedUserProfileUser ? (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="space-y-6 text-on-surface text-left animate-fadeIn"
      >
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold select-none">
          <button
            onClick={() => setSelectedUserProfileUser(null)}
            className="hover:text-primary transition-colors hover:underline flex items-center gap-1 cursor-pointer"
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>Người dùng</span>
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">Hồ sơ chi tiết</span>
        </div>

        {/* Profile Header Block */}
        <div className="card-surface p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full filter blur-3xl opacity-60 pointer-events-none"></div>

          {/* Photo with overlay effect */}
          <div className="relative group cursor-pointer shrink-0">
            {selectedUserProfileUser.avatar ? (
              <img
                src={selectedUserProfileUser.avatar}
                alt="Profile Avatar Large"
                className="w-24 h-24 rounded-full border-4 border-surface-2 object-cover shadow-md group-hover:brightness-90 transition-all"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary-container text-on-secondary-container border-4 border-surface-2 flex items-center justify-center font-bold text-3xl shadow-md group-hover:brightness-95 transition-all">
                {selectedUserProfileUser.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div
              onClick={() => toast.info('Thay đổi ảnh đại diện sẽ được hỗ trợ trong phiên bản kết nối Cloud Storage.')}
              className="absolute inset-0 bg-on-surface/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              Cập nhật
            </div>
          </div>

          {/* Name and badges info */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-on-surface font-sans break-words">{selectedUserProfileUser.name}</h2>
              <span className={selectedUserProfileUser.isOnline ? 'badge-success' : 'badge-info'}>
                <span className={`w-1.5 h-1.5 rounded-full ${selectedUserProfileUser.isOnline ? 'bg-success animate-pulse' : 'bg-on-surface-variant'}`}></span>
                {selectedUserProfileUser.isOnline ? 'Đang online' : 'Offline'}
              </span>
            </div>
            <p className="text-on-surface-variant text-xs font-semibold">
              {getRoleNumber(selectedUserProfileUser.role) === 1 ? 'Hệ thống Quản trị viên cao cấp (SRE/Admin)' :
               getRoleNumber(selectedUserProfileUser.role) === 3 ? 'Quản lý đội ngũ IT support' :
               'Đội ngũ hỗ trợ kỹ thuật hiện trường (IT support)'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-on-surface-variant pt-1">
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg border border-outline-variant">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span className="break-all">{selectedUserProfileUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg border border-outline-variant">
                <Phone className="w-3.5 h-3.5 text-success" />
                <span>{profilePhone}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg border border-outline-variant">
                <MapPin className="w-3.5 h-3.5 text-warning" />
                <span>{profileDept}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Content splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column Editor */}
          <div className="lg:col-span-8 card-surface p-4 sm:p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-on-surface font-sans">Chi tiết Hồ sơ & Liên hệ</h3>
              <p className="text-xs text-on-surface-variant mt-1">Cập nhật thông tin chi tiết và quyền truy cập nghiệp vụ dành cho thành viên.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 cursor-text">
                  <label className="text-xs font-bold text-on-surface-variant">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-surface-2 hover:bg-surface focus:bg-surface focus:outline-primary transition-all font-medium text-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant/70">Quản trị Email</label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={selectedUserProfileUser.email}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-surface-2 cursor-not-allowed font-medium text-on-surface-variant"
                    title="Email được đồng bộ hóa nội bộ và không thể thay thế trực tiếp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 cursor-text">
                  <label className="text-xs font-bold text-on-surface-variant">Số điện thoại</label>
                  <input
                    type="text"
                    required
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-surface-2 hover:bg-surface focus:bg-surface focus:outline-primary transition-all font-medium text-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant">Gán vai trò chức vụ</label>
                  <select
                    value={profileRole}
                    onChange={e => setProfileRole(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-surface-2 hover:bg-surface focus:bg-surface cursor-pointer transition-all font-medium text-on-surface"
                  >
                    {roleOptions.map(option => (
                      <option key={String(option.value)} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 cursor-text">
                <label className="text-xs font-bold text-on-surface-variant">Văn phòng / Phòng ban</label>
                <input
                  type="text"
                  required
                  value={profileDept}
                  onChange={e => setProfileDept(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-surface-2 hover:bg-surface focus:bg-surface focus:outline-primary transition-all font-medium text-on-surface"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setSelectedUserProfileUser(null)}
                  className="btn-secondary px-4 py-2"
                >
                  Quay lại Danh bạ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary px-5 py-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column Bento Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card-surface p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-success" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-on-surface-variant font-sans">Theo dõi đăng nhập</h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2 rounded-xl p-4 border border-outline-variant text-center">
                  <p className="text-2xl font-black text-on-surface font-mono tabular-nums">{selectedUserProfileUser.loginCount ?? 0}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant mt-1">Lượt đăng nhập</p>
                </div>
                <div className="bg-success-container rounded-xl p-3 border border-success/20 text-center">
                  <p className="text-sm font-black text-on-success-container tabular-nums">{formatRelativeTime(selectedUserProfileUser.lastSeenAt)}</p>
                  <p className="text-[10px] font-bold text-success mt-1">Hoạt động cuối</p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-outline-variant bg-surface-2 p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-on-surface-variant">Đăng nhập cuối</span>
                  <span className="text-right font-semibold text-on-surface">{formatDateTime(selectedUserProfileUser.lastLoginAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-on-surface-variant">Online cuối</span>
                  <span className="text-right font-semibold text-on-surface">{formatDateTime(selectedUserProfileUser.lastSeenAt)}</span>
                </div>
              </div>
            </div>

            <div className="card-surface p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-on-surface-variant font-sans">Hoạt động gần đây</h4>
              </div>

              <div className="relative pl-4 border-l-2 border-outline-variant space-y-5 text-xs text-left">
                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-success-container border-2 border-surface rounded-full p-0.5 text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-on-surface">Đã đóng ticket #TKT-2034</p>
                    <p className="text-[10px] text-on-surface-variant">Lỗi máy in bill CH Q1 - 10 phút trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-secondary-container border-2 border-surface rounded-full p-0.5 text-primary">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-on-surface">Bình luận trên #TKT-2041</p>
                    <p className="text-[10px] text-on-surface-variant">"Nhờ quầy khởi động router" - 1 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-secondary-container border-2 border-surface rounded-full p-0.5 text-primary">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-on-surface">Đăng ký nhận ca #TKT-2045</p>
                    <p className="text-[10px] text-on-surface-variant">Màn hình POS Kiosk Q3 - 3 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-error-container border-2 border-surface rounded-full p-0.5 text-error">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-on-surface">Cảnh báo máy chủ Server #03</p>
                    <p className="text-[10px] text-on-surface-variant">Disk usage quá mức 95% - Hôm qua</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ) : (
      <div className="space-y-6 text-left animate-fadeIn">
        {/* Screen header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface font-sans">Danh bạ người dùng & Phân cấp đội ngũ</h2>
            <p className="text-xs text-on-surface-variant mt-1">Quản trị danh sách nhân sự, phân bổ chức vụ và gán trạng thái vận hành.</p>
          </div>
          {canCreateUser && (
            <button
              onClick={() => handleOpenUserModal()}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Tạo người dùng
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="card-surface p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo danh tính hoặc email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-xs focus:outline-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Chức vụ:</span>
            <select
              value={userRoleFilter}
              onChange={e => setUserRoleFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-surface-2 border border-outline-variant rounded-lg select-none cursor-pointer"
            >
              <option value="">Tất cả vai trò</option>
              {roleOptions.map(option => (
                <option key={String(option.value)} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* User table lists */}
        <div className="card-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant font-bold select-none font-sans">
                  <th className="py-4 px-5">Họ và Tên</th>
                  <th className="py-4 px-5">Email</th>
                  <th className="py-4 px-5">Vai trò (Role)</th>
                  <th className="py-4 px-5">Online / đăng nhập</th>
                  <th className="py-4 px-5 text-right font-bold w-24">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-sans font-bold text-on-surface-variant">
                      Đang tải dữ liệu người dùng...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-sans font-bold text-on-surface-variant">
                      Không tìm thấy nhân viên nào khớp với điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-surface-2 transition-colors gap-3">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt="User Avatar"
                              onClick={() => setSelectedUserProfileUser(user)}
                              className="w-10 h-10 rounded-full border border-outline-variant object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            />
                          ) : (
                            <div
                              onClick={() => setSelectedUserProfileUser(user)}
                              className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            >
                              {user.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'US'}
                            </div>
                          )}
                          <div>
                            <p
                              onClick={() => setSelectedUserProfileUser(user)}
                              className="font-bold text-on-surface text-sm hover:text-primary hover:underline cursor-pointer transition-colors"
                            >
                              {user.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-on-surface-variant">{user.email}</td>
                      <td className="py-4 px-5">
                        <span className={
                          getRoleNumber(user.role) === 1
                            ? 'badge-error'
                            : getRoleNumber(user.role) === 3
                            ? 'badge-warning'
                            : 'badge-info'
                        }>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${user.isOnline ? 'bg-success-container text-success' : 'bg-surface-2 text-on-surface-variant border border-outline-variant'}`}>
                            {user.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {user.isOnline ? 'Đang online' : 'Offline'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <Clock className="w-3 h-3" />
                            <span>{user.isOnline ? formatRelativeTime(user.lastSeenAt) : `Cuối: ${formatRelativeTime(user.lastSeenAt)}`}</span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant">
                            {user.loginCount ?? 0} lượt đăng nhập
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right w-24">
                        <div className="flex justify-end gap-1.5">
                          {canCreateUser && (
                            <button
                              onClick={() => handleOpenPasswordModal(user)}
                              className="p-1 px-1.5 border rounded hover:bg-warning-container hover:text-warning transition-colors border-outline-variant cursor-pointer"
                              title="Đổi mật khẩu"
                              aria-label={`Đổi mật khẩu cho ${user.name}`}
                            >
                              <KeyRound className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenUserModal(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-secondary-container text-on-secondary-container shadow-sm transition-[border-color,filter] hover:border-primary/50 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                            title="Chỉnh sửa chi tiết"
                            aria-label={`Chỉnh sửa người dùng ${user.name}`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteUserClick(user.id)}
                            className="p-1 px-1.5 border rounded hover:bg-error-container hover:text-error transition-colors border-outline-variant cursor-pointer"
                            title="Xóa dữ liệu"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-2 border-t border-outline-variant px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
            <span className="text-xs text-on-surface-variant">Hiển thị {filteredUsers.length} tài khoản cấp cao</span>
            <div className="flex gap-1 select-none">
              <button className="px-3 py-1 border border-outline-variant hover:bg-surface text-[11px] rounded transition-all cursor-pointer">Trước</button>
              <button className="px-3 py-1 border border-primary bg-primary text-on-primary text-[11px] rounded font-bold cursor-pointer">1</button>
              <button className="px-3 py-1 border border-outline-variant hover:bg-surface text-[11px] rounded cursor-pointer" onClick={() => toast.info('Tất cả địa chỉ thư mục đã được đồng bộ hóa.')}>Sau</button>
            </div>
          </div>
        </div>

        {/* User CRUD Modal */}
        {isUserModalOpen && (
          <div className="modal-overlay">
            <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
                <h3 className="text-lg font-bold text-on-surface">
                  {currentEditingUser ? 'Cập nhật người dùng' : 'Tạo người dùng mới'}
                </h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
              </div>
              <form onSubmit={handleSaveUserSubmit} className="space-y-4 text-sm text-left">
                <div>
                  <label className="block font-medium mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Thị Mai"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Địa chỉ Email doanh nghiệp *</label>
                  <input
                    type="email"
                    required
                    placeholder="mai.nguyen@company.vn"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  />
                </div>
                {!currentEditingUser && (
                  <div>
                    <label className="block font-medium mb-1">Mật khẩu ban đầu *</label>
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu ban đầu"
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Vai trò quyền hạn</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface"
                    >
                      {roleOptions.map(option => (
                        <option key={String(option.value)} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Trạng thái tài khoản</label>
                    <select
                      value={userStatus}
                      onChange={e => setUserStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface"
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Vô hiệu hóa">Vô hiệu hóa</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="btn-secondary px-4 py-2"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary px-5 py-2"
                  >
                    {isLoading ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {passwordTargetUser && (
          <div className="modal-overlay">
            <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md p-4 sm:p-6 border border-outline-variant text-left">
              <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-outline-variant">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Đổi mật khẩu người dùng</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Đặt mật khẩu mới cho <span className="font-bold text-on-surface">{passwordTargetUser.name}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  disabled={isResettingPassword}
                  className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer disabled:opacity-50"
                  aria-label="Đóng"
                >
                  &#x2715;
                </button>
              </div>

              <form onSubmit={handleResetUserPassword} className="space-y-4 text-sm">
                <div>
                  <label className="block font-medium mb-1">Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newUserPassword}
                    onChange={event => setNewUserPassword(event.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmUserPassword}
                    onChange={event => setConfirmUserPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setPasswordTargetUser(null)}
                    disabled={isResettingPassword}
                    className="btn-secondary px-4 py-2"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="btn-primary px-5 py-2"
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
