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
  AlertCircle
} from 'lucide-react';
import { useUsersStore } from '../../../stores/useUsersStore';
import { User } from '../../../types';

export default function UsersTab() {
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
    getFilteredUsers
  } = useUsersStore();

  // Local Form states for edit user (or create)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<User['role']>('Staff');
  const [userStatus, setUserStatus] = useState<'Hoạt động' | 'Vô hiệu hóa'>('Hoạt động');

  // Detailed profile form states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRole, setProfileRole] = useState<User['role']>('Staff');
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

  const filteredUsers = getFilteredUsers();

  const handleOpenUserModal = (u: User | null = null) => {
    if (u) {
      setCurrentEditingUser(u);
      setUserName(u.name);
      setUserEmail(u.email);
      setUserRole(u.role);
      setUserStatus(u.status);
    } else {
      setCurrentEditingUser(null);
      setUserName('');
      setUserEmail('');
      setUserRole('Staff');
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

    const payload = {
      name: userName.trim(),
      email: userEmail.trim(),
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
        className="space-y-6 text-[#191b23] text-left animate-fadeIn"
      >
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
          <button 
            onClick={() => setSelectedUserProfileUser(null)} 
            className="hover:text-primary transition-colors hover:underline flex items-center gap-1 cursor-pointer"
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>Người dùng</span>
          </button>
          <span>/</span>
          <span className="text-slate-950 font-bold">Hồ sơ chi tiết</span>
        </div>

        {/* Profile Header Block */}
        <div className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#e8f0fe] rounded-full filter blur-3xl opacity-60 pointer-events-none"></div>
          
          {/* Photo with overlay effect */}
          <div className="relative group cursor-pointer shrink-0">
            {selectedUserProfileUser.avatar ? (
              <img 
                src={selectedUserProfileUser.avatar} 
                alt="Profile Avatar Large" 
                className="w-24 h-24 rounded-full border-4 border-slate-50 object-cover shadow-md group-hover:brightness-90 transition-all"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#e0eafc] text-[#002d74] border-4 border-slate-50 flex items-center justify-center font-bold text-3xl shadow-md group-hover:brightness-95 transition-all">
                {selectedUserProfileUser.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div 
              onClick={() => toast.info('Thay đổi ảnh đại diện sẽ được hỗ trợ trong phiên bản kết nối Cloud Storage.')}
              className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              Cập nhật
            </div>
          </div>

          {/* Name and badges info */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-950 font-sans">{selectedUserProfileUser.name}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Hoạt động
              </span>
            </div>
            <p className="text-gray-500 text-xs font-semibold">
              {selectedUserProfileUser.role === 'Admin' ? 'Hệ thống Quản trị viên cao cấp (SRE/Admin)' : 
               selectedUserProfileUser.role === 'Manager' ? 'Quản lý vận hành khu vực (Supervisor)' :
               selectedUserProfileUser.role === 'IT Support' ? 'Đội ngũ hỗ trợ kỹ thuật hiện trường (IT Support Specialist)' :
               'Nhân sự phòng ban nghiệp vụ (End-user Staff)'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-slate-500 pt-1">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>{selectedUserProfileUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{profilePhone}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>{profileDept}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Content splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column Editor */}
          <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 font-sans">Chi tiết Hồ sơ & Liên hệ</h3>
              <p className="text-xs text-gray-500 mt-1">Cập nhật thông tin chi tiết và quyền truy cập nghiệp vụ dành cho thành viên.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 cursor-text">
                  <label className="text-xs font-bold text-slate-700">Họ và tên</label>
                  <input 
                    type="text" 
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Quản trị Email</label>
                  <input 
                    type="email" 
                    readOnly
                    disabled
                    value={selectedUserProfileUser.email}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-slate-100 cursor-not-allowed font-medium text-slate-500"
                    title="Email được đồng bộ hóa nội bộ và không thể thay thế trực tiếp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 cursor-text">
                  <label className="text-xs font-bold text-slate-700">Số điện thoại</label>
                  <input 
                    type="text" 
                    required
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Gán vai trò chức vụ</label>
                  <select 
                    value={profileRole}
                    onChange={e => setProfileRole(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white cursor-pointer transition-all font-medium text-slate-900"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="IT Support">IT Support</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 cursor-text">
                <label className="text-xs font-bold text-slate-700">Văn phòng / Phòng ban</label>
                <input 
                  type="text" 
                  required
                  value={profileDept}
                  onChange={e => setProfileDept(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedUserProfileUser(null)}
                  className="px-4 py-2 border border-outline-variant text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Quay lại Danh bạ
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#004ac6] text-white hover:bg-primary-container rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column Bento Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#434655] font-sans">Thống kê tháng này</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <p className="text-2xl font-black text-slate-900 font-mono">124</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Ticket xử lý</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-2.5xl font-black text-emerald-700 font-mono">98%</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">Đạt SLA</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#004ac6]" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#434655] font-sans">Hoạt động gần đây</h4>
              </div>

              <div className="relative pl-4 border-l-2 border-slate-100 space-y-5 text-xs text-left">
                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-emerald-100 border-2 border-white rounded-full p-0.5 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950">Đã đóng ticket #TKT-2034</p>
                    <p className="text-[10px] text-slate-400">Lỗi máy in bill CH Q1 - 10 phút trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-blue-100 border-2 border-white rounded-full p-0.5 text-blue-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950">Bình luận trên #TKT-2041</p>
                    <p className="text-[10px] text-slate-400">"Nhờ quầy khởi động router" - 1 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-purple-100 border-2 border-white rounded-full p-0.5 text-purple-600">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950">Đăng ký nhận ca #TKT-2045</p>
                    <p className="text-[10px] text-slate-400">Màn hình POS Kiosk Q3 - 3 giờ trước</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-0 bg-red-50 border-2 border-white rounded-full p-0.5 text-red-650">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950">Cảnh báo máy chủ Server #03</p>
                    <p className="text-[10px] text-slate-400">Disk usage quá mức 95% - Hôm qua</p>
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
            <h2 className="text-xl font-bold text-gray-900 font-sans">Danh bạ người dùng & Phân cấp đội ngũ</h2>
            <p className="text-xs text-gray-500 mt-1">Quản trị danh sách nhân sự, phân bổ chức vụ và gán trạng thái vận hành.</p>
          </div>
          <button
            onClick={() => handleOpenUserModal()}
            className="bg-[#004ac6] text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Đăng ký thành viên
          </button>
        </div>

        {/* Filter Row */}
        <div className="bg-white rounded-xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo danh tính hoặc email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs focus:outline-[#004ac6]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Chức vụ:</span>
            <select
              value={userRoleFilter}
              onChange={e => setUserRoleFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg select-none cursor-pointer"
            >
              <option value="">Tất cả vai trò</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="IT Support">IT Support</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
        </div>

        {/* User table lists */}
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold select-none font-sans">
                  <th className="py-4 px-5">Nhân sự</th>
                  <th className="py-4 px-5">Quản trị Email</th>
                  <th className="py-4 px-5">Gán Chức vụ</th>
                  <th className="py-4 px-5">Vận hành hành chính</th>
                  <th className="py-4 px-5 text-right font-bold w-24">Tùy biến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-sans font-bold text-gray-400">
                      Đang tải dữ liệu người dùng...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-sans font-bold text-gray-400">
                      Không tìm thấy nhân viên nào khớp với điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-[#faf8ff] transition-colors gap-3">
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
                              className="font-bold text-gray-950 text-sm hover:text-primary hover:underline cursor-pointer transition-colors"
                            >
                              {user.name}
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono">Mã: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-gray-700">{user.email}</td>
                      <td className="py-4 px-5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.role === 'Admin'
                            ? 'bg-red-100 text-red-700'
                            : user.role === 'Manager'
                            ? 'bg-[#ffebe6] text-[#7d2d00]'
                            : user.role === 'IT Support'
                            ? 'bg-[#dbe1ff] text-[#00174b]'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'Hoạt động'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}></span>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right w-24">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUserModal(user)}
                            className="p-1 px-1.5 border rounded hover:bg-blue-50 hover:text-primary transition-colors border-outline-variant cursor-pointer"
                            title="Chỉnh sửa chi tiết"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteUserClick(user.id)}
                            className="p-1 px-1.5 border rounded hover:bg-red-50 hover:text-red-555 transition-colors border-outline-variant cursor-pointer"
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

          <div className="bg-gray-50 border-t border-[#ededf9] px-5 py-3 flex items-center justify-between font-sans">
            <span className="text-xs text-gray-400">Hiển thị {filteredUsers.length} tài khoản cấp cao</span>
            <div className="flex gap-1 select-none">
              <button className="px-3 py-1 border border-outline-variant hover:bg-white text-[11px] rounded transition-all cursor-pointer">Trước</button>
              <button className="px-3 py-1 border border-primary bg-primary text-white text-[11px] rounded font-bold cursor-pointer">1</button>
              <button className="px-3 py-1 border border-outline-variant hover:bg-white text-[11px] rounded cursor-pointer" onClick={() => toast.info('Tất cả địa chỉ thư mục đã được đồng bộ hóa.')}>Sau</button>
            </div>
          </div>
        </div>

        {/* User CRUD Modal */}
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
                <h3 className="text-lg font-bold text-on-surface">
                  {currentEditingUser ? 'Cập nhật thành viên' : 'Đăng ký thành viên mới'}
                </h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-650 font-bold cursor-pointer">&#x2715;</button>
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Vai trò quyền hạn</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="IT Support">IT Support</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Trạng thái tài khoản</label>
                    <select
                      value={userStatus}
                      onChange={e => setUserStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Vô hiệu hóa">Vô hiệu hóa</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Đang lưu...' : 'Xác nhận'}
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
