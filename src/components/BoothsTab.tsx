import React from 'react';
import { Plus, Search, Copy, Edit2, Trash2 } from 'lucide-react';
import { Booth } from '../types';

interface BoothsTabProps {
  filteredBooths: Booth[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  copyToClipboard: (text: string) => void;
  handleOpenBoothModal: (booth?: Booth | null) => void;
  handleDeleteBooth: (id: string) => void;
}

export default function BoothsTab({
  filteredBooths,
  searchQuery,
  setSearchQuery,
  copyToClipboard,
  handleOpenBoothModal,
  handleDeleteBooth,
}: BoothsTabProps) {
  return (
    <div className="space-y-6 text-left">
      {/* Screen title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Quản trị danh sách Trạm Booth hỗ trợ</h2>
          <p className="text-xs text-gray-500 mt-1">Danh sách điều kiểm mẫu máy tại hiện trường. Đi kèm ID đăng nhập UltraView để nhân viên kỹ thuật kết nối lập tức.</p>
        </div>
        <button
          onClick={() => handleOpenBoothModal()}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Booth
        </button>
      </div>

      {/* Page Filters or search */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm Booth ID, tên trạm hoặc địa điểm..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs"
          />
        </div>
        <span className="text-xs text-gray-400 font-medium">Toàn bộ booth đang vận hành bình thường</span>
      </div>

      {/* Data table booths */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold select-none font-sans">
                <th className="py-4 px-5">Mã Trạm Booth</th>
                <th className="py-4 px-5">Tên Trạm Kỹ Thuật</th>
                <th className="py-4 px-5">ID Kết Nối Từ Xa</th>
                <th className="py-4 px-5">Cửa hàng/Chi nhánh liên quan</th>
                <th className="py-4 px-5 text-right w-24">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredBooths.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-sans font-bold text-gray-400">
                    Không tìm thấy booth nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredBooths.map(b => (
                  <tr key={b.id} className="hover:bg-[#faf8ff] transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-[#004ac6] text-sm">{b.id}</td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-gray-900 text-sm block">{b.name}</span>
                      <span className="text-[10px] text-gray-400">Hỗ trợ UltraView tự động kết nối</span>
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#f0f0fb] px-2.5 py-1 rounded text-xs text-gray-800 font-bold select-all tracking-wider font-mono">
                          {b.ultraviewId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(b.ultraviewId)}
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-[#ededf9] transition-all outline-none cursor-pointer"
                          title="Sao chép ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-600 font-medium">{b.relatedStores}</td>
                    <td className="py-4 px-5 text-right w-24">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenBoothModal(b)}
                          className="p-1 px-1.5 border rounded hover:bg-blue-50 hover:text-primary transition-colors border-outline-variant cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBooth(b.id)}
                          className="p-1 px-1.5 border rounded hover:bg-red-50 hover:text-red-500 transition-colors border-outline-variant cursor-pointer"
                          title="Xóa Booth"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
