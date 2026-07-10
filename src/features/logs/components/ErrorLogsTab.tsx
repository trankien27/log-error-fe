import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCopy, Download, Edit2, Eye, FileText, ImagePlus, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { lookupService } from '../../../services/api/lookupService';
import { logsService } from '../../../services/api/logsService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useLogsStore } from '../../../stores/useLogsStore';
import { ErrorGroup, ErrorLog, ErrorLogStatus, ProcessingFlow, Severity } from '../../../types';

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

const processingFlowLabels: Record<ProcessingFlow, string> = {
  1: 'IT Support xử lý',
  2: 'Gửi Dev xử lý',
  3: 'Khác',
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

const processingFlowOptions = Object.entries(processingFlowLabels).map(([value, label]) => ({
  value: Number(value) as ProcessingFlow,
  label,
}));

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toDateTimeInputValue(date: string) {
  if (!date) return '';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date.slice(0, 16);
  }

  const year = parsedDate.getFullYear();
  const month = padDatePart(parsedDate.getMonth() + 1);
  const day = padDatePart(parsedDate.getDate());
  const hours = padDatePart(parsedDate.getHours());
  const minutes = padDatePart(parsedDate.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toApiDateTime(date: string) {
  return date.length === 16 ? `${date}:00` : date;
}

function formatDate(date: string) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
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
  const isAdmin = currentUser?.role === 'Admin';
  console.log('Current user in ErrorLogsTab:', currentUser);
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
    logProcessingFlowFilter,
    logSeverityFilter,
    isLoading,
    setSearchQuery,
    setLogStoreFilter,
    setLogBoothFilter,
    setLogStatusFilter,
    setLogMonthFilter,
    setLogErrorGroupFilter,
    setLogProcessingFlowFilter,
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [selectedLogDetails, setSelectedLogDetails] = useState<ErrorLog | null>(null);
  const [currentEditingLog, setCurrentEditingLog] = useState<ErrorLog | null>(null);
  const [receivedDate, setReceivedDate] = useState(toDateTimeInputValue(new Date().toISOString()));
  const [store, setStore] = useState('CH Quận 1');
  const [storeId, setStoreId] = useState<string | number | undefined>();
  const [booth, setBooth] = useState('');
  const [logStoreFilterId, setLogStoreFilterId] = useState<string | number | undefined>();
  const [description, setDescription] = useState('');
  const [errorGroup, setErrorGroup] = useState<ErrorGroup>(1);
  const [processingFlow, setProcessingFlow] = useState<ProcessingFlow>(1);
  const [status, setStatus] = useState<ErrorLogStatus>(1);
  const [severity, setSeverity] = useState<Severity>(2);
  const [preliminaryCause, setPreliminaryCause] = useState('');
  const [solution, setSolution] = useState('');
  const [note, setNote] = useState('');
  const [uploadTransactionId, setUploadTransactionId] = useState('');
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const filteredLogs = getFilteredLogs();
  const selectedLogIdSet = new Set(selectedLogIds);
  const currentPageLogIds = filteredLogs.map(log => log.id);
  const isAllCurrentPageSelected = currentPageLogIds.length > 0 && currentPageLogIds.every(id => selectedLogIdSet.has(id));
  useEffect(() => {
    fetchLogs({
      store: logStoreFilter || undefined,
      booth: logBoothFilter || undefined,
      status: logStatusFilter || undefined,
      month: logMonthFilter || undefined,
      errorGroup: logErrorGroupFilter || undefined,
      processingFlow: logProcessingFlowFilter || undefined,
      severity: logSeverityFilter || undefined,
      pageIndex: logPageIndex,
      pageSize: logPageSize,
    });
  }, [fetchLogs, logStoreFilter, logBoothFilter, logStatusFilter, logMonthFilter, logErrorGroupFilter, logProcessingFlowFilter, logSeverityFilter, logPageIndex, logPageSize]);

  const getFilterQuery = () => ({
    store: logStoreFilter || undefined,
    booth: logBoothFilter || undefined,
    status: logStatusFilter || undefined,
    month: logMonthFilter || undefined,
    errorGroup: logErrorGroupFilter || undefined,
    processingFlow: logProcessingFlowFilter || undefined,
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
  const loadFilteredBooths = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchBooths({ ...query, storeId: logStoreFilterId });
  }, [logStoreFilterId]);
  const loadFormBooths = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchBooths({ ...query, storeId });
  }, [storeId]);

  const handleOpenModal = (log: ErrorLog | null = null) => {
    if (log) {
      setCurrentEditingLog(log);
      setReceivedDate(toDateTimeInputValue(log.receivedDate));
      setStore(log.store);
      setStoreId(undefined);
      setBooth(log.booth || '');
      setDescription(log.description || '');
      setErrorGroup(log.errorGroup);
      setProcessingFlow(log.processingFlow);
      setStatus(log.status);
      setSeverity(log.severity);
      setPreliminaryCause(log.preliminaryCause || '');
      setSolution(log.solution || '');
      setNote(log.note || '');
    } else {
      setCurrentEditingLog(null);
      setReceivedDate(toDateTimeInputValue(new Date().toISOString()));
      setStore('');
      setStoreId(undefined);
      setBooth('');
      setDescription('');
      setErrorGroup(1);
      setProcessingFlow(1);
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

    if (!currentUser?.name) {
      toast.error('Không tìm thấy user đang đăng nhập để gán IT phụ trách.');
      return;
    }

    const payload = {
      receivedDate: toApiDateTime(receivedDate),
      store: store.trim(),
      booth: booth.trim(),
      errorGroup,
      description: description.trim(),
      processingFlow,
      preliminaryCause: preliminaryCause.trim(),
      solution: solution.trim(),
      severity,
      assignedToId: currentEditingLog
        ? currentEditingLog.assignedToName || currentEditingLog.assignedToId
        : currentUser.name,
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

  const handleSaveShortcut = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const handleToggleLogSelection = (id: string) => {
    setSelectedLogIds(prev => (
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    ));
  };

  const handleToggleCurrentPageSelection = () => {
    setSelectedLogIds(prev => {
      const currentPageIdSet = new Set(currentPageLogIds);

      if (isAllCurrentPageSelected) {
        return prev.filter(id => !currentPageIdSet.has(id));
      }

      return Array.from(new Set([...prev, ...currentPageLogIds]));
    });
  };

  const handleDelete = (log: ErrorLog) => {
    toast.warning(`Xóa log lỗi ${log.errorCode || log.id}?`, {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteLog(log.id);
            setSelectedLogIds(prev => prev.filter(id => id !== log.id));
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

  const handleGenerateReportText = async () => {
    if (selectedLogIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một log lỗi để xuất báo cáo.');
      return;
    }

    setIsReportLoading(true);
    try {
      const text = await logsService.createReport({ ids: selectedLogIds });
      setReportText(text);
      setIsReportModalOpen(true);
      toast.success('Đã xuất báo cáo văn bản.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xuất báo cáo văn bản.');
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleCopyReportText = async () => {
    if (!reportText) {
      toast.error('Chưa có nội dung báo cáo để copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(reportText);
      toast.success('Đã copy báo cáo vào clipboard.');
    } catch {
      toast.error('Không thể copy vào clipboard.');
    }
  };

  const handleUploadTransactionImages = async (event: React.FormEvent) => {
    event.preventDefault();

    const transactionId = uploadTransactionId.trim();

    if (!transactionId) {
      toast.error('Vui lòng nhập mã giao dịch.');
      return;
    }

    if (uploadImages.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ảnh.');
      return;
    }

    setIsUploadingImages(true);
    try {
      const result = await logsService.uploadTransactionImages(transactionId, uploadImages);
      toast.success(`Đã upload ${result.uploadedCount || uploadImages.length} ảnh cho giao dịch.`);
      setUploadTransactionId('');
      setUploadImages([]);
    } catch (err: any) {
      toast.error(err.message || 'Không thể upload ảnh giao dịch.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-sans">Danh sách log lỗi hệ thống</h1>
          <p className="text-xs text-gray-500 mt-1">Theo dõi lỗi theo ngày tiếp nhận, cửa hàng, nhóm lỗi, trạng thái và mức độ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-white text-primary border border-primary/30 hover:bg-blue-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ImagePlus className="w-4 h-4" /> Tải ảnh giao dịch
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSyncGoogleSheet}
              disabled={isSyncingGoogleSheet || isLoading}
              className="bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} /> {isSyncingGoogleSheet ? 'Đang sync...' : 'Sync Google Sheet'}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white text-[#004ac6] border border-[#004ac6]/30 hover:bg-blue-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            type="button"
            onClick={handleGenerateReportText}
            disabled={isReportLoading || selectedLogIds.length === 0}
            className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <FileText className="w-4 h-4" /> {isReportLoading ? 'Đang xuất...' : `Xuất báo cáo (${selectedLogIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-primary text-white hover:brightness-90 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Plus className="w-4 h-4" /> Log lỗi
          </button>
        </div>
      </div>

      {isUploadModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleUploadTransactionImages}
        className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-white p-5 shadow-2xl text-left"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-on-surface">Tải ảnh lỗi giao dịch</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Ảnh sẽ được gắn trực tiếp với mã giao dịch tương ứng.</p>
          </div>
          <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block text-sm font-semibold lg:flex-1">
            Mã giao dịch cần upload ảnh
            <input
              value={uploadTransactionId}
              onChange={event => setUploadTransactionId(event.target.value)}
              placeholder="bf2b4b62-2785-466a-871c-8f41f68ceedb"
              className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          <label className="block text-sm font-semibold lg:flex-1">
            Ảnh lỗi giao dịch
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={event => setUploadImages(Array.from(event.target.files || []))}
              className="mt-1 block w-full cursor-pointer rounded-lg border border-dashed border-primary/40 bg-blue-50/40 p-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={isUploadingImages}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:brightness-90 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {isUploadingImages ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploadingImages ? 'Đang upload...' : 'Upload ảnh'}
          </button>
        </div>

        {uploadImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadImages.map(file => (
              <span
                key={`${file.name}_${file.size}_${file.lastModified}`}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
      </form>
      </div>
      )}

      <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Cửa hàng</label>
            <LazySearchDropdown
              ariaLabel="Lọc log theo cửa hàng"
              value={logStoreFilter}
              placeholder="Tất cả cửa hàng"
              emptyText="Không tìm thấy cửa hàng."
              loadOptions={loadStores}
              pageSize={20}
              onSelect={item => {
                setLogStoreFilter(item.name);
                setLogStoreFilterId(item.id);
                setLogBoothFilter('');
              }}
              onClear={() => {
                setLogStoreFilter('');
                setLogStoreFilterId(undefined);
                setLogBoothFilter('');
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Booth</label>
            <LazySearchDropdown
              ariaLabel="Lọc log theo booth"
              value={logBoothFilter}
              placeholder="Tất cả Booth"
              emptyText="Không tìm thấy Booth."
              loadOptions={loadFilteredBooths}
              onSelect={item => setLogBoothFilter(item.name)}
              onClear={() => setLogBoothFilter('')}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-month-filter">Tháng</label>
            <select
              id="log-month-filter"
              value={logMonthFilter}
              onChange={e => setLogMonthFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                <option key={month} value={month}>Tháng {month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-error-group-filter">Nhóm lỗi</label>
            <select
              id="log-error-group-filter"
              value={logErrorGroupFilter}
              onChange={e => setLogErrorGroupFilter(e.target.value ? Number(e.target.value) as ErrorGroup : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả</option>
              {errorGroupOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-status-filter">Trạng thái</label>
            <select
              id="log-status-filter"
              value={logStatusFilter}
              onChange={e => setLogStatusFilter(e.target.value ? Number(e.target.value) as ErrorLogStatus : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-processing-flow-filter">Luồng xử lý</label>
            <select
              id="log-processing-flow-filter"
              value={logProcessingFlowFilter}
              onChange={e => setLogProcessingFlowFilter(e.target.value ? Number(e.target.value) as ProcessingFlow : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả</option>
              {processingFlowOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-severity-filter">Mức độ</label>
            <select
              id="log-severity-filter"
              value={logSeverityFilter}
              onChange={e => setLogSeverityFilter(e.target.value ? Number(e.target.value) as Severity : '')}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả</option>
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="log-search-input">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="log-search-input"
                placeholder="Mã lỗi, cửa hàng..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 select-none font-sans">
                <th className="py-4 px-5 font-bold w-12">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleCurrentPageSelection}
                    disabled={filteredLogs.length === 0}
                    className="w-6 h-6 accent-[#004ac6] cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Chọn tất cả log lỗi trên trang hiện tại"
                  />
                </th>
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
                  <td colSpan={8} className="py-10 text-center font-bold text-gray-400">
                    Đang tải dữ liệu log lỗi...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-bold text-gray-400">
                    Hệ thống không ghi nhận log lỗi nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#faf8ff] transition-colors">
                    <td className="py-4 px-5">
                      <input
                        type="checkbox"
                        checked={selectedLogIdSet.has(log.id)}
                        onChange={() => handleToggleLogSelection(log.id)}
                        className="w-6 h-6 accent-[#004ac6] cursor-pointer"
                        aria-label={`Chọn log lỗi ${log.errorCode || log.id}`}
                      />
                    </td>
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
                          className="min-h-8 min-w-8 p-1 px-2 border rounded hover:bg-slate-50 hover:text-gray-900 transition-colors hover:border-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết log lỗi ${log.errorCode || log.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(log)}
                          className="min-h-8 min-w-8 p-1 px-2 border rounded hover:bg-blue-50 hover:text-primary transition-colors hover:border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa log lỗi ${log.errorCode || log.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log)}
                          className="min-h-8 min-w-8 p-1 px-2 border rounded hover:bg-red-50 hover:text-red-600 transition-colors hover:border-red-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Xóa lỗi"
                          aria-label={`Xóa log lỗi ${log.errorCode || log.id}`}
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
          <span className="text-xs text-gray-700">
            Hiển thị {filteredLogs.length} của {totalItems} bản ghi lỗi · Đã chọn {selectedLogIds.length}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-gray-700 font-semibold" htmlFor="log-page-size">Số dòng</label>
            <select
              id="log-page-size"
              value={logPageSize}
              onChange={e => setLogPageSize(Number(e.target.value))}
              disabled={isLoading}
              className="px-2 py-1.5 bg-white border border-outline-variant rounded-lg text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-[11px] text-gray-700 font-medium min-w-[72px] text-center">
              Trang {totalPages === 0 ? 0 : logPageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setLogPageIndex(Math.max(logPageIndex - 1, 1))}
              disabled={isLoading || logPageIndex <= 1}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white text-gray-700 hover:bg-blue-50 hover:text-[#004ac6] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogPageIndex(logPageIndex + 1)}
              disabled={isLoading || totalPages === 0 || logPageIndex >= totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white text-gray-700 hover:bg-blue-50 hover:text-[#004ac6] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">Xuất báo cáo văn bản</h3>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
            </div>

            <div className="space-y-4 text-sm text-left">
              <div>
                <label className="block font-medium mb-1">Nội dung báo cáo</label>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  rows={8}
                  placeholder="Nội dung báo cáo sẽ hiển thị sau khi xuất."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] font-mono text-xs resize-y"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  disabled={!reportText}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-gray-600 hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ClipboardCopy className="w-4 h-4" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-container font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingLog ? 'Chỉnh sửa log lỗi' : 'Thêm lỗi mới'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSave} onKeyDown={handleSaveShortcut} className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Ngày tiếp nhận *</label>
                  <input
                    type="datetime-local"
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
                    onSelect={item => {
                      setStore(item.name);
                      setStoreId(item.id);
                      setBooth('');
                    }}
                    onClear={() => {
                      setStore('');
                      setStoreId(undefined);
                      setBooth('');
                    }}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Booth</label>
                  <LazySearchDropdown
                    value={booth}
                    placeholder="Chọn Booth..."
                    emptyText="Không tìm thấy Booth."
                    loadOptions={loadFormBooths}
                    onSelect={item => setBooth(item.name)}
                    onClear={() => setBooth('')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block font-medium mb-1">Luồng xử lý</label>
                  <select
                    value={processingFlow}
                    onChange={e => setProcessingFlow(Number(e.target.value) as ProcessingFlow)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {processingFlowOptions.map(option => (
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

              <div className="lg:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
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
