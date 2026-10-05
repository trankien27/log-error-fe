import React, { useState } from 'react';
import { Layers, Pencil, Plus, Shield, ShieldCheck, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUsersStore } from '../../../stores/useUsersStore';
import { Role } from '../../../types';
import { EmptyState, PageHeader, SectionCard } from '../../../components/ui';

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
      toast.success(currentEditingRole ? 'Đã cập nhật vai trò.' : 'Đã thêm vai trò.');
      setIsRoleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu vai trò.');
    }
  };

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Vai trò"
        icon={Shield}
        description="Nhóm quyền và mức bảo mật cho từng loại tài khoản."
        actions={
          <button type="button" onClick={() => handleOpenRoleModal()} className="btn-primary">
            <Plus className="w-4 h-4" /> Thêm vai trò
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
            <Layers className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface-variant">Số vai trò</p>
            <p className="text-2xl font-semibold mt-1 text-on-surface tabular-nums">{roles.length}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Đã thiết lập trong hệ thống</p>
          </div>
        </div>

        <div className="card-surface p-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-container text-on-success-container">
            <Users className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface-variant">Tài khoản được gán</p>
            <p className="text-2xl font-semibold mt-1 text-on-surface tabular-nums">128</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Đã đồng bộ thông tin đăng nhập</p>
          </div>
        </div>

        <div className="card-surface p-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-container text-on-warning-container">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface-variant">Bảo mật</p>
            <p className="text-2xl font-semibold mt-1 text-on-surface">Cao</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Giám sát tự động đang bật</p>
          </div>
        </div>
      </div>

      <SectionCard title="Danh sách vai trò" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant select-none">
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Vai trò</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Người dùng</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Mô tả</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Mức bảo mật</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 text-right w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState compact icon={Shield} title="Chưa có vai trò nào" description="Nhấn Thêm vai trò để tạo nhóm quyền đầu tiên." />
                  </td>
                </tr>
              ) : (
                roles.map((r, index) => (
                  <tr key={index} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-semibold">
                          {r.name.substring(0, 2)}
                        </div>
                        <span className="font-medium text-on-surface">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface tabular-nums">
                      {r.userCount || 3} người dùng
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-sm">{r.description}</td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-right w-24 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenRoleModal(r)}
                        className="inline-flex h-8 items-center gap-1.5 px-3 text-sm rounded-lg border border-outline-variant text-on-surface hover:border-primary hover:text-primary hover:bg-primary-subtle transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {isRoleModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto border border-outline-variant text-left">
            <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface">
                {currentEditingRole ? 'Sửa vai trò' : 'Thêm vai trò'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                aria-label="Đóng"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRoleSubmit} className="space-y-4 text-sm p-5">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Tên vai trò <span className="text-error">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DevOps, Security officer"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                  disabled={!!currentEditingRole}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Mô tả <span className="text-error">*</span></label>
                <textarea
                  rows={3}
                  required
                  placeholder="Vai trò này được phép làm gì..."
                  value={roleDesc}
                  onChange={e => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Mức bảo mật</label>
                <select
                  value={roleSecurity}
                  onChange={e => setRoleSecurity(e.target.value as any)}
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface"
                >
                  <option value="Thấp">Thấp</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Cao">Cao</option>
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
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
    </div>
  );
}
