import React from 'react';
import { Plus } from 'lucide-react';
import { Role } from '../types';

interface RolesTabProps {
  roles: Role[];
  handleOpenRoleModal: (role?: Role | null) => void;
}

export default function RolesTab({ roles, handleOpenRoleModal }: RolesTabProps) {
  return (
    <div className="space-y-6 text-left">
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
    </div>
  );
}
