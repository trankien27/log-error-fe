import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUsersStore } from '../../../stores/useUsersStore';
import { Role } from '../../../types';

export default function RolesTab() {
  const {
    roles,
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
      alert('Vui lòng điền đủ tên vai trò và mô tả.');
      return;
    }

    const payload: Role = {
      name: roleName.trim(),
      description: roleDesc.trim(),
      securityLevel: roleSecurity,
      userCount: currentEditingRole?.userCount || 0
    };

    await saveRole(payload, !!currentEditingRole);
    setIsRoleModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Bảng phân quyền lực lượng và vai trò hệ thống</h2>
          <p className="text-xs text-gray-500 mt-1">Thiết lập các nhóm quyền hạn, hạn chế rò rỉ dữ liệu máy chủ IT.</p>
        </div>
        <button
          onClick={() => handleOpenRoleModal()}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Bổ sung vai trò
        </button>
      </div>

      {/* Bento informational summaries Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
        <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-[#434655] uppercase tracking-wider">Cấu hình vai trò</span>
            <h3 className="text-2xl font-bold mt-2 text-[#191b23]">{roles.length} Nhóm</h3>
            <p className="text-xs text-gray-500 mt-1">Được thiết lập sẵn trong hệ thống</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-[#434655] uppercase tracking-wider">Tổng nhân sự được gán</span>
            <h3 className="text-2xl font-bold mt-2 text-emerald-700">128 Tài khoản</h3>
            <p className="text-xs text-gray-500 mt-1">Đã đồng bộ thông tin xác thực</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/5 rounded-full"></div>
          <div>
            <span className="text-xs font-bold text-[#434655] uppercase tracking-wider">Mức độ rủi ro</span>
            <h3 className="text-2xl font-bold mt-2 text-red-600">Độ tin cậy Cao</h3>
            <p className="text-xs text-gray-500 mt-1">Giám sát bảo mật tự động đang Kích Hoạt</p>
          </div>
        </div>
      </div>

      {/* Active list table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800">Danh sách các vai trò vận hành</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e2e8f0] text-[11px] uppercase tracking-medium text-gray-500 font-bold select-none font-sans">
                <th className="py-4 px-5">Tên Vai Trò</th>
                <th className="py-4 px-5">Số lượng Người Dùng được gán</th>
                <th className="py-4 px-5">Mô tả tác vụ bảo mật</th>
                <th className="py-4 px-5">Mã bảo mật</th>
                <th className="py-4 px-5 text-right w-24">Phím nóng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {roles.map((r, index) => (
                <tr key={index} className="hover:bg-[#faf8ff] transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#dbe1ff] text-[#004ac6] flex items-center justify-center font-bold">
                        {r.name.substring(0, 2)}
                      </div>
                      <span className="font-bold text-gray-950 text-sm">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono text-[#004ac6] font-bold text-sm">
                    {r.userCount || 3} người dùng
                  </td>
                  <td className="py-4 px-5 text-gray-500 font-sans max-w-sm">{r.description}</td>
                  <td className="py-4 px-5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                      r.securityLevel === 'Cao'
                        ? 'bg-red-100 text-red-700'
                        : r.securityLevel === 'Trung bình'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {r.securityLevel}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right w-24 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenRoleModal(r)}
                      className="px-2.5 py-1 text-xs border rounded-lg hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingRole ? 'Thay đổi thông tin Vai trò' : 'Phát triển nhóm Vai trò hệ thống'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-655 font-bold cursor-pointer">&#x2715;</button>
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mức bảo mật / Độ tin cậy</label>
                <select
                  value={roleSecurity}
                  onChange={e => setRoleSecurity(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="Thấp">Thấp (Low Trust)</option>
                  <option value="Trung bình">Trung bình (Medium Trust)</option>
                  <option value="Cao">Cao (Highly Confidential)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
