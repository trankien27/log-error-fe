import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { useLogsStore } from '../../../stores/useLogsStore';
import { ErrorLog } from '../../../types';

export default function ErrorLogsTab() {
  const {
    logs,
    logStoreFilter,
    logBoothFilter,
    searchQuery,
    setLogStoreFilter,
    setLogBoothFilter,
    setSearchQuery,
    addLog,
    updateLog,
    deleteLog,
    getFilteredLogs
  } = useLogsStore();

  // Local Modal Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingLog, setCurrentEditingLog] = useState<ErrorLog | null>(null);

  const [logTitle, setLogTitle] = useState('');
  const [logReporter, setLogReporter] = useState('');
  const [logStore, setLogStore] = useState('CH Quận 1');
  const [logBooth, setLogBooth] = useState('Quầy Thu Ngân 1');
  const [logStatus, setLogStatus] = useState<'Mới' | 'Đang xử lý' | 'Đã đóng'>('Mới');
  const [logSeverity, setLogSeverity] = useState<'Lỗi nghiêm trọng' | 'Bình thường' | 'Cảnh báo'>('Cảnh báo');

  const filteredLogs = getFilteredLogs();

  const handleOpenModal = (log: ErrorLog | null = null) => {
    if (log) {
      setCurrentEditingLog(log);
      setLogTitle(log.title);
      setLogReporter(log.reporter);
      setLogStore(log.store);
      setLogBooth(log.booth);
      setLogStatus(log.status);
      setLogSeverity(log.severity);
    } else {
      setCurrentEditingLog(null);
      setLogTitle('');
      setLogReporter('');
      setLogStore('CH Quận 1');
      setLogBooth('Quầy Thu Ngân 1');
      setLogStatus('Mới');
      setLogSeverity('Cảnh báo');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() || !logReporter.trim()) {
      alert('Vui lòng điền đủ tên lỗi và người báo.');
      return;
    }

    const payload = {
      title: logTitle.trim(),
      reporter: logReporter.trim(),
      store: logStore,
      booth: logBooth,
      status: logStatus,
      severity: logSeverity,
      attachment: Math.random() > 0.5
    };

    if (currentEditingLog) {
      await updateLog(currentEditingLog.id, payload);
    } else {
      await addLog(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Bạn chắc chắn muốn xóa log lỗi này không? ID: ${id}`)) {
      await deleteLog(id);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Screen title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Danh sách log lỗi hệ thống</h2>
          <p className="text-xs text-gray-500 mt-1">Khai báo, phân tích và theo dõi trạng thái các lỗi kỹ thuật phát sinh tại các trạm booth.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
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
              <option value="Phòng kỹ thuật">Phòng kỹ thuật</option>
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
                          onClick={() => handleOpenModal(log)}
                          className="p-1 px-2 border rounded hover:bg-blue-50 hover:text-primary transition-colors hover:border-blue-200 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
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
          <span className="text-xs text-gray-400">Hiển thị {filteredLogs.length} của {logs.length} bản ghi lỗi</span>
          <div className="flex gap-1 select-none">
            <button className="px-2.5 py-1 border border-outline-variant text-[11px] hover:bg-white rounded disabled:opacity-40 cursor-pointer" disabled>Trước</button>
            <button className="px-3 py-1 border border-[#004ac6] bg-[#dbe1ff] text-[#00174b] text-[11px] font-bold rounded cursor-pointer">1</button>
            <button className="px-3 py-1 border border-outline-variant text-[11px] hover:bg-white rounded cursor-pointer" onClick={() => alert('Dữ liệu chỉ hiển thị trang 1 trong bản demo')}>2</button>
            <button className="px-2.5 py-1 border border-outline-variant text-[11px] hover:bg-white rounded cursor-pointer" onClick={() => alert('Tính năng phân trang sẽ hoạt động khi có nhiều bản ghi lớn.')}>Sau</button>
          </div>
        </div>
      </div>

      {/* Local Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingLog ? `Chỉnh sửa Log lỗi [${currentEditingLog.id}]` : 'Khai báo lỗi hệ thống mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-left">
              <div>
                <label className="block font-medium mb-1">Mô tả sự cố / Tên lỗi *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lỗi kết nối máy in bill"
                  value={logTitle}
                  onChange={e => setLogTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Người báo cáo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên nhân sự"
                    value={logReporter}
                    onChange={e => setLogReporter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Độ nghiêm trọng</label>
                  <select
                    value={logSeverity}
                    onChange={e => setLogSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Lỗi nghiêm trọng">Lỗi nghiêm trọng (Critical)</option>
                    <option value="Cảnh báo">Cảnh báo (Warning)</option>
                    <option value="Bình thường">Bình thường (Normal)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Cửa hàng xảy ra</label>
                  <select
                    value={logStore}
                    onChange={e => setLogStore(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="CH Quận 1">CH Quận 1</option>
                    <option value="CH Quận 3">CH Quận 3</option>
                    <option value="CH Gò Vấp">CH Gò Vấp</option>
                    <option value="CH Quận 10">CH Quận 10</option>
                    <option value="Kho Tổng Bình Dương">Kho Tổng Bình Dương</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Trạm Booth hỗ trợ</label>
                  <select
                    value={logBooth}
                    onChange={e => setLogBooth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Quầy Thu Ngân 1">Quầy Thu Ngân 1</option>
                    <option value="Quầy Thu Ngân 2">Quầy Thu Ngân 2</option>
                    <option value="Kiosk Tự Phục Vụ">Kiosk Tự Phục Vụ</option>
                    <option value="Kho hàng">Kho hàng</option>
                    <option value="Phòng kỹ thuật">Phòng kỹ thuật</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái xử lý</label>
                <div className="flex gap-4">
                  {(['Mới', 'Đang xử lý', 'Đã đóng'] as const).map(st => (
                    <label key={st} className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="logStatusGroup"
                        checked={logStatus === st}
                        onChange={() => setLogStatus(st)}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer animate-pulse-subtle"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
