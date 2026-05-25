import React from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { ErrorLog } from '../types';

interface ErrorLogsTabProps {
  filteredLogs: ErrorLog[];
  errorLogs: ErrorLog[];
  logStoreFilter: string;
  setLogStoreFilter: (val: string) => void;
  logBoothFilter: string;
  setLogBoothFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleOpenLogModal: (log?: ErrorLog | null) => void;
  handleDeleteLog: (id: string) => void;
  triggerToast: (msg: string) => void;
}

export default function ErrorLogsTab({
  filteredLogs,
  errorLogs,
  logStoreFilter,
  setLogStoreFilter,
  logBoothFilter,
  setLogBoothFilter,
  searchQuery,
  setSearchQuery,
  handleOpenLogModal,
  handleDeleteLog,
  triggerToast,
}: ErrorLogsTabProps) {
  return (
    <div className="space-y-6">
      {/* Screen title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Danh sách log lỗi hệ thống</h2>
          <p className="text-xs text-gray-500 mt-1">Khai báo, phân tích và theo dõi trạng thái các lỗi kỹ thuật phát sinh tại các trạm booth.</p>
        </div>
        <button
          onClick={() => handleOpenLogModal()}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Đăng ký log lỗi
        </button>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Filter store */}
          <div>
            <label className="block text-[11px] font-sans font-bold text-gray-500 uppercase tracking-wider mb-1">Cửa hàng</label>
            <select
              value={logStoreFilter}
              onChange={e => setLogStoreFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">-- Tất cả cửa hàng --</option>
              <option value="CH Quận 1">CH Quận 1</option>
              <option value="CH Quận 3">CH Quận 3</option>
              <option value="CH Gò Vấp">CH Gò Vấp</option>
              <option value="CH Quận 10">CH Quận 10</option>
            </select>
          </div>

          {/* Filter booth */}
          <div>
            <label className="block text-[11px] font-sans font-bold text-gray-500 uppercase tracking-wider mb-1">Trạm Booth</label>
            <select
              value={logBoothFilter}
              onChange={e => setLogBoothFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">-- Tất cả trạm --</option>
              <option value="Quầy Thu Ngân 1">Quầy Thu Ngân 1</option>
              <option value="Quầy Thu Ngân 2">Quầy Thu Ngân 2</option>
              <option value="Kiosk Tự Phục Vụ">Kiosk Tự Phục Vụ</option>
              <option value="Kho hàng">Kho hàng</option>
            </select>
          </div>

          {/* Free search info */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-sans font-bold text-gray-500 uppercase tracking-wider mb-1">Tìm ID, chi tiết tên lỗi, người báo...</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm nhanh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data table container */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 select-none font-sans">
                <th className="py-4 px-5 font-bold">Mã lỗi (ID)</th>
                <th className="py-4 px-5 font-bold">Chi tiết lỗi phát sinh</th>
                <th className="py-4 px-5 font-bold">Người báo cáo</th>
                <th className="py-4 px-5 font-bold">Thời gian</th>
                <th className="py-4 px-5 font-bold">Nơi hoạt động</th>
                <th className="py-4 px-5 font-bold">Độ nghiêm trọng</th>
                <th className="py-4 px-5 font-bold">Trạng thái</th>
                <th className="py-4 px-5 font-bold text-right">Tùy biến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-sans font-bold text-gray-400">
                    Hệ thống không ghi nhận log lỗi nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#faf8ff] transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-gray-500">{log.id}</td>
                    <td className="py-4 px-5">
                    <span className="font-semibold text-gray-900 line-clamp-1">{log.title}</span>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-sans">
                        <span>Có file đính kèm:</span> 
                        <span className={log.attachment ? 'text-blue-600 font-bold' : 'text-gray-400'}>
                          {log.attachment ? 'Đã tải lên' : 'Không có'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-medium text-gray-800">{log.reporter}</td>
                    <td className="py-4 px-5 text-gray-500 font-sans whitespace-nowrap">{log.reportTime}</td>
                    <td className="py-4 px-5">
                      <span className="font-semibold text-gray-700">{log.store}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{log.booth}</p>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        log.severity === 'Lỗi nghiêm trọng'
                          ? 'bg-red-100 text-red-600'
                          : log.severity === 'Cảnh báo'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'Mới'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : log.status === 'Đang xử lý'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenLogModal(log)}
                          className="p-1 px-2 border rounded hover:bg-blue-50 hover:text-primary transition-colors hover:border-blue-200 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 px-2 border rounded hover:bg-red-50 hover:text-red-600 transition-colors hover:border-red-200 cursor-pointer"
                          title="Xóa lỗi"
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

        {/* Table Footer with information density */}
        <div className="bg-gray-50 border-t border-outline-variant px-5 py-3 flex items-center justify-between font-sans">
          <span className="text-xs text-gray-400">Hiển thị {filteredLogs.length} của {errorLogs.length} bản ghi lỗi</span>
          <div className="flex gap-1">
            <button className="px-2.5 py-1 border border-outline-variant text-[11px] hover:bg-white rounded disabled:opacity-40 cursor-pointer" disabled>Trước</button>
            <button className="px-3 py-1 border border-[#004ac6] bg-[#dbe1ff] text-[#00174b] text-[11px] font-bold rounded cursor-pointer">1</button>
            <button className="px-3 py-1 border border-outline-variant text-[11px] hover:bg-white rounded cursor-pointer" onClick={() => triggerToast('Dữ liệu chỉ hiển thị trang 1 trong bản demo')}>2</button>
            <button className="px-2.5 py-1 border border-outline-variant text-[11px] hover:bg-white rounded cursor-pointer" onClick={() => triggerToast('Tính năng phân trang sẽ hoạt động khi có nhiều bản ghi lớn.')}>Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
}
