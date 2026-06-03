import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit2, Eye, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { lookupService } from '../../../services/api/lookupService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useLogsStore } from '../../../stores/useLogsStore';
import { ErrorGroup, ErrorLog, ErrorLogStatus, Severity } from '../../../types';

const errorGroupLabels: Record<ErrorGroup, string> = {
  1: 'Phần cứng',
  2: 'Phần mềm',
  3: 'Khác',
};

const statusLabels: Record<ErrorLogStatus, string> = {
  1: 'Đang xử lý',
  2: 'Đã gửi Dev',
  3: 'Theo dõi sau xử lý',
};

const severityLabels: Record<Severity, string> = {
  1: 'Thấp',
  2: 'Trung bình',
  3: 'Cao',
};

const errorGroupOptions = Object.entries(errorGroupLabels).map(([value, label]) => ({
  value: Number(value) as ErrorGroup,
  label,
}));

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value: Number(value) as ErrorLogStatus,
  label,
}));

const severityOptions = Object.entries(severityLabels).map(([value, label]) => ({
  value: Number(value) as Severity,
  label,
}));

function toDateInputValue(date: string) {
  if (!date) return '';
  return date.slice(0, 10);
}

function toApiDate(date: string) {
  return `${date}T00:00:00`;
}

function formatDate(date: string) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
}

function getStatusClass(status: ErrorLogStatus) {
  if (status === 1) return 'bg-blue-50 text-blue-700 border-blue-100';
  if (status === 2) return 'bg-orange-50 text-orange-700 border-orange-100';
  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
}

function getSeverityClass(severity: Severity) {
  if (severity === 3) return 'bg-red-50 text-red-700 border-red-100';
  if (severity === 2) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
}

export default function ErrorLogsTab() {
  const currentUser = useAuthStore(s => s.currentUser);
  const {
    logs,
    totalItems,
    totalPages,
    logPageIndex,
    logPageSize,
    searchQuery,
    logStoreFilter,
    logBoothFilter,
    logStatusFilter,
    logMonthFilter,
    logErrorGroupFilter,
    logSeverityFilter,
    isLoading,
    setSearchQuery,
    setLogStoreFilter,
    setLogBoothFilter,
    setLogStatusFilter,
    setLogMonthFilter,
    setLogErrorGroupFilter,
    setLogSeverityFilter,
    setLogPageIndex,
    setLogPageSize,
    addLog,
    updateLog,
    deleteLog,
    fetchLogs,
    syncGoogleSheet,
    exportLogs,
    getFilteredLogs,
    isExporting,
    isSyncingGoogleSheet,
  } = useLogsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<ErrorLog | null>(null);
  const [currentEditingLog, setCurrentEditingLog] = useState<ErrorLog | null>(null);
  const [receivedDate, setReceivedDate] = useState(toDateInputValue(new Date().toISOString()));
  const [store, setStore] = useState('CH Quận 1');
  const [booth, setBooth] = useState('');
  const [description, setDescription] = useState('');
  const [errorGroup, setErrorGroup] = useState<ErrorGroup>(1);
  const [status, setStatus] = useState<ErrorLogStatus>(1);
  const [severity, setSeverity] = useState<Severity>(2);
  const [preliminaryCause, setPreliminaryCause] = useState('');
  const [solution, setSolution] = useState('');
  const [note, setNote] = useState('');

  const filteredLogs = getFilteredLogs();
  useEffect(() => {
    fetchLogs({
      store: logStoreFilter || undefined,
      booth: logBoothFilter || undefined,
      status: logStatusFilter || undefined,
      month: logMonthFilter || undefined,
      errorGroup: logErrorGroupFilter || undefined,
      severity: logSeverityFilter || undefined,
      pageIndex: logPageIndex,
      pageSize: logPageSize,
    });
  }, [fetchLogs, logStoreFilter, logBoothFilter, logStatusFilter, logMonthFilter, logErrorGroupFilter, logSeverityFilter, logPageIndex, logPageSize]);

  const getFilterQuery = () => ({
    store: logStoreFilter || undefined,
    booth: logBoothFilter || undefined,
    status: logStatusFilter || undefined,
    month: logMonthFilter || undefined,
    errorGroup: logErrorGroupFilter || undefined,
    severity: logSeverityFilter || undefined,
  });

  const getActiveQuery = () => ({
    ...getFilterQuery(),
    pageIndex: logPageIndex,
    pageSize: logPageSize,
  });

  const loadStores = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchStores(query);
  }, []);
  const loadBooths = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchBooths(query);
  }, []);

  const handleOpenModal = (log: ErrorLog | null = null) => {
    if (log) {
      setCurrentEditingLog(log);
      setReceivedDate(toDateInputValue(log.receivedDate));
      setStore(log.store);
      setBooth(log.booth || '');
      setDescription(log.description || '');
      setErrorGroup(log.errorGroup);
      setStatus(log.status);
      setSeverity(log.severity);
      setPreliminaryCause(log.preliminaryCause || '');
      setSolution(log.solution || '');
      setNote(log.note || '');
    } else {
      setCurrentEditingLog(null);
      setReceivedDate(toDateInputValue(new Date().toISOString()));
      setStore('CH Quận 1');
      setBooth('');
      setDescription('');
      setErrorGroup(1);
      setStatus(1);
      setSeverity(2);
      setPreliminaryCause('');
      setSolution('');
      setNote('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receivedDate || !store.trim() || !description.trim()) {
      toast.error('Vui lòng nhập ngày tiếp nhận, cửa hàng và mô tả lỗi.');
      return;
    }

    if (!currentUser?.id) {
      toast.error('Không tìm thấy user đang đăng nhập để gán IT phụ trách.');
      return;
    }

    const payload = {
      receivedDate: toApiDate(receivedDate),
      store: store.trim(),
      booth: booth.trim(),
      errorGroup,
      description: description.trim(),
      processingFlow: 1 as const,
      preliminaryCause: preliminaryCause.trim(),
      solution: solution.trim(),
      severity,
      assignedToId: currentEditingLog?.assignedToId || currentUser.id,
      note: note.trim(),
      status,
    };

    try {
      if (currentEditingLog) {
        await updateLog(currentEditingLog.id, payload);
        toast.success('Cập nhật log lỗi thành công.');
      } else {
        await addLog(payload);
        toast.success('Tạo log lỗi thành công.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu log lỗi.');
    }
  };

  const handleDelete = (log: ErrorLog) => {
    toast.warning(`Xóa log lỗi ${log.errorCode || log.id}?`, {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteLog(log.id);
            toast.success('Đã xóa log lỗi.');
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa log lỗi.');
          }
        },
      },
    });
  };

  const handleExport = async () => {
    try {
      await exportLogs(getFilterQuery());
      toast.success('Đã xuất file Excel.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xuất file Excel.');
    }
  };

  const handleSyncGoogleSheet = async () => {
    try {
      await syncGoogleSheet();
      await fetchLogs(getActiveQuery());
      toast.success('Đã sync dữ liệu từ Google Sheet.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể sync dữ liệu từ Google Sheet.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Danh sách log lỗi hệ thống</h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi lỗi theo ngày tiếp nhận, cửa hàng, nhóm lỗi, trạng thái và mức độ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncGoogleSheet}
            disabled={isSyncingGoogleSheet || isLoading}
            className="bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} /> {isSyncingGoogleSheet ? 'Đang sync...' : 'Sync Google Sheet'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white text-[#004ac6] border border-[#004ac6]/30 hover:bg-blue-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log lỗi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cửa hàng</label>
            <LazySearchDropdown
              value={logStoreFilter}
              placeholder="Tất cả cửa hàng"
              emptyText="Không tìm thấy cửa hàng."
              loadOptions={loadStores}
              pageSize={20}
              onSelect={item => setLogStoreFilter(item.name)}
              onClear={() => setLogStoreFilter('')}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Booth</label>
            <LazySearchDropdown
              value={logBoothFilter}
              placeholder="Tất cả Booth"
              emptyText="Không tìm thấy Booth."
              loadOptions={loadBooths}
              onSelect={item => setLogBoothFilter(item.name)}
              onClear={() => setLogBoothFilter('')}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tháng</label>
            <select
              value={logMonthFilter}
              onChange={e => setLogMonthFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">Tất cả</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                <option key={month} value={month}>Tháng {month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nhóm lỗi</label>
            <select
              value={logErrorGroupFilter}
              onChange={e => setLogErrorGroupFilter(e.target.value ? Number(e.target.value) as ErrorGroup : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">Tất cả</option>
              {errorGroupOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Trạng thái</label>
            <select
              value={logStatusFilter}
              onChange={e => setLogStatusFilter(e.target.value ? Number(e.target.value) as ErrorLogStatus : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">Tất cả</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Mức độ</label>
            <select
              value={logSeverityFilter}
              onChange={e => setLogSeverityFilter(e.target.value ? Number(e.target.value) as Severity : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              <option value="">Tất cả</option>
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Mã lỗi, cửa hàng..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 select-none font-sans">
                <th className="py-4 px-5 font-bold">Ngày tiếp nhận</th>
                <th className="py-4 px-5 font-bold">Cửa hàng</th>
                <th className="py-4 px-5 font-bold">Mô tả lỗi</th>
                <th className="py-4 px-5 font-bold">Nhóm lỗi</th>
                <th className="py-4 px-5 font-bold">Trạng thái</th>
                <th className="py-4 px-5 font-bold">Mức độ</th>
                <th className="py-4 px-5 font-bold text-right">Tùy biến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-bold text-gray-400">
                    Đang tải dữ liệu log lỗi...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-bold text-gray-400">
                    Hệ thống không ghi nhận log lỗi nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#faf8ff] transition-colors">
                    <td className="py-4 px-5 text-gray-700 font-semibold whitespace-nowrap">{formatDate(log.receivedDate)}</td>
                    <td className="py-4 px-5 font-semibold text-gray-900">{log.store}</td>
                    <td className="py-4 px-5 text-gray-700 max-w-xs">
                      <span className="line-clamp-2">{log.description || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-5 text-gray-700">{errorGroupLabels[log.errorGroup]}</td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusClass(log.status)}`}>
                        {statusLabels[log.status]}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${getSeverityClass(log.severity)}`}>
                        {severityLabels[log.severity]}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="p-1 px-2 border rounded hover:bg-slate-50 hover:text-gray-900 transition-colors hover:border-slate-300 cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(log)}
                          className="p-1 px-2 border rounded hover:bg-blue-50 hover:text-primary transition-colors hover:border-blue-200 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log)}
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

        <div className="bg-gray-50 border-t border-outline-variant px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <span className="text-xs text-gray-400">
            Hiển thị {filteredLogs.length} của {totalItems} bản ghi lỗi
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-gray-500 font-semibold" htmlFor="log-page-size">Số dòng</label>
            <select
              id="log-page-size"
              value={logPageSize}
              onChange={e => setLogPageSize(Number(e.target.value))}
              disabled={isLoading}
              className="px-2 py-1.5 bg-white border border-outline-variant rounded-lg text-gray-700 font-semibold focus:outline-[#004ac6] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-[11px] text-gray-400 font-medium min-w-[72px] text-center">
              Trang {totalPages === 0 ? 0 : logPageIndex + 1}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setLogPageIndex(Math.max(logPageIndex - 1, 0))}
              disabled={isLoading || logPageIndex <= 0}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white text-gray-600 hover:bg-blue-50 hover:text-[#004ac6] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogPageIndex(logPageIndex + 1)}
              disabled={isLoading || totalPages === 0 || logPageIndex + 1 >= totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white text-gray-600 hover:bg-blue-50 hover:text-[#004ac6] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingLog ? 'Chỉnh sửa log lỗi' : 'Khai báo log lỗi mới'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Ngày tiếp nhận *</label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Cửa hàng *</label>
                  <LazySearchDropdown
                    value={store}
                    placeholder="Chọn cửa hàng..."
                    emptyText="Không tìm thấy cửa hàng."
                    loadOptions={loadStores}
                    pageSize={20}
                    onSelect={item => setStore(item.name)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Booth</label>
                  <LazySearchDropdown
                    value={booth}
                    placeholder="Chọn Booth..."
                    emptyText="Không tìm thấy Booth."
                    loadOptions={loadBooths}
                    onSelect={item => setBooth(item.name)}
                    onClear={() => setBooth('')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1">Nhóm lỗi</label>
                  <select
                    value={errorGroup}
                    onChange={e => setErrorGroup(Number(e.target.value) as ErrorGroup)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {errorGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Trạng thái</label>
                  <select
                    value={status}
                    onChange={e => setStatus(Number(e.target.value) as ErrorLogStatus)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Mức độ</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(Number(e.target.value) as Severity)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Mô tả lỗi *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nhập mô tả lỗi chi tiết..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Nguyên nhân sơ bộ</label>
                <textarea
                  rows={3}
                  value={preliminaryCause}
                  onChange={e => setPreliminaryCause(e.target.value)}
                  placeholder="Nhập nguyên nhân sơ bộ nếu có..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Cách xử lý</label>
                <textarea
                  rows={3}
                  value={solution}
                  onChange={e => setSolution(e.target.value)}
                  placeholder="Nhập cách xử lý nếu có..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Nhập ghi chú thêm..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLogDetails && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Chi tiết log lỗi</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedLogDetails.errorCode || selectedLogDetails.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedLogDetails(null)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ngày tiếp nhận</span>
                <p className="font-semibold text-gray-900">{formatDate(selectedLogDetails.receivedDate)}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cửa hàng</span>
                <p className="font-semibold text-gray-900">{selectedLogDetails.store}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Booth</span>
                <p className="font-semibold text-gray-900">{selectedLogDetails.booth || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nhóm lỗi</span>
                <p className="font-semibold text-gray-900">{errorGroupLabels[selectedLogDetails.errorGroup]}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">IT phụ trách</span>
                <p className="font-semibold text-gray-900">{selectedLogDetails.assignedToName || selectedLogDetails.assignedToId || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Trạng thái</span>
                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusClass(selectedLogDetails.status)}`}>
                  {statusLabels[selectedLogDetails.status]}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mức độ</span>
                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${getSeverityClass(selectedLogDetails.severity)}`}>
                  {severityLabels[selectedLogDetails.severity]}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-5 text-sm">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mô tả lỗi</span>
                <p className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">{selectedLogDetails.description || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nguyên nhân sơ bộ</span>
                <p className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">{selectedLogDetails.preliminaryCause || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cách xử lý</span>
                <p className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">{selectedLogDetails.solution || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ghi chú</span>
                <p className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">{selectedLogDetails.note || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-5 mt-5 border-t">
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
