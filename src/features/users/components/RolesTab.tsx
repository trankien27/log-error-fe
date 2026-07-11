import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useUsersStore } from '../../../stores/useUsersStore';
import { Role } from '../../../types';

export default function RolesTab() {
  const {
    roles,
    isLoading,
    isRoleModalOpen,
    setIsRoleModalOpen,
    currentEditingRole,
    setCurrentEditingRole,
    saveRole
  } = useUsersStore();

  // Local Form states for edit/create role
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleSecurity, setRoleSecurity] = useState<'Cao' | 'Trung bình' | 'Thấp'>('Thấp');

  const handleOpenRoleModal = (r: Role | null = null) => {
    if (r) {
      setCurrentEditingRole(r);
      setRoleName(r.name);
      setRoleDesc(r.description);
      setRoleSecurity(r.securityLevel);
    } else {
      setCurrentEditingRole(null);
      setRoleName('');
      setRoleDesc('');
      setRoleSecurity('Thấp');
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !roleDesc.trim()) {
      toast.error('Vui lòng điền đủ tên vai trò và mô tả.');
      return;
    }

    const payload: Role = {
      name: roleName.trim(),
      description: roleDesc.trim(),
      securityLevel: roleSecurity,
      userCount: currentEditingRole?.userCount || 0
    };

    try {
      await saveRole(payload, !!currentEditingRole);
      toast.success(currentEditingRole ? 'Cập nhật vai trò thành công.' : 'Thêm vai trò thành công.');
      setIsRoleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu vai trò.');
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Bảng phân quyền lực lượng và vai trò hệ thống</h2>
          <p className="text-xs text-on-surface-variant mt-1">Thiết lập các nhóm quyền hạn, hạn chế rò rỉ dữ liệu máy chủ IT.</p>
        </div>
        <button
          onClick={() => handleOpenRoleModal()}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Bổ sung vai trò
        </button>
      </div>

      {/* Bento informational summaries Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shadow-sm">
        <div className="card-surface p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cấu hình vai trò</span>
            <h3 className="text-2xl font-bold mt-2 text-on-surface">{roles.length} Nhóm</h3>
            <p className="text-xs text-on-surface-variant mt-1">Được thiết lập sẵn trong hệ thống</p>
          </div>
        </div>

        <div className="card-surface p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-success/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tổng nhân sự được gán</span>
            <h3 className="text-2xl font-bold mt-2 text-success">128 Tài khoản</h3>
            <p className="text-xs text-on-surface-variant mt-1">Đã đồng bộ thông tin xác thực</p>
          </div>
        </div>

        <div className="card-surface p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-error/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mức độ rủi ro</span>
            <h3 className="text-2xl font-bold mt-2 text-error">Độ tin cậy Cao</h3>
            <p className="text-xs text-on-surface-variant mt-1">Giám sát bảo mật tự động đang Kích Hoạt</p>
          </div>
        </div>
      </div>

      {/* Active list table */}
      <div className="card-surface overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-2">
          <h3 className="text-sm font-bold text-on-surface">Danh sách các vai trò vận hành</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-medium text-on-surface-variant font-bold select-none font-sans">
                <th className="py-4 px-5">Tên Vai Trò</th>
                <th className="py-4 px-5">Số lượng Người Dùng được gán</th>
                <th className="py-4 px-5">Mô tả tác vụ bảo mật</th>
                <th className="py-4 px-5">Mã bảo mật</th>
                <th className="py-4 px-5 text-right w-24">Phím nóng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {roles.map((r, index) => (
                <tr key={index} className="hover:bg-surface-2 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary-container text-primary flex items-center justify-center font-bold">
                        {r.name.substring(0, 2)}
                      </div>
                      <span className="font-bold text-on-surface text-sm">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono text-primary font-bold text-sm tabular-nums">
                    {r.userCount || 3} người dùng
                  </td>
                  <td className="py-4 px-5 text-on-surface-variant font-sans max-w-sm">{r.description}</td>
                  <td className="py-4 px-5">
                    <span className={
                      r.securityLevel === 'Cao'
                        ? 'badge-error'
                        : r.securityLevel === 'Trung bình'
                        ? 'badge-warning'
                        : 'badge-info'
                    }>
                      {r.securityLevel}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right w-24 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenRoleModal(r)}
                      className="px-2.5 py-1 text-xs border border-outline-variant rounded-lg hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role CRUD Modal */}
      {isRoleModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingRole ? 'Thay đổi thông tin Vai trò' : 'Phát triển nhóm Vai trò hệ thống'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveRoleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Tên nhóm vai trò *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Devops, Security officer"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  disabled={!!currentEditingRole}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mô tả tác vụ & phân quyền *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Quy định quyền truy cập bảng thông tin..."
                  value={roleDesc}
                  onChange={e => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mức bảo mật / Độ tin cậy</label>
                <select
                  value={roleSecurity}
                  onChange={e => setRoleSecurity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface"
                >
                  <option value="Thấp">Thấp (Low Trust)</option>
                  <option value="Trung bình">Trung bình (Medium Trust)</option>
                  <option value="Cao">Cao (Highly Confidential)</option>
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary px-5 py-2"
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
