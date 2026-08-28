import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCopy, Download, Edit2, Eye, FileText, ImagePlus, Mic, MicOff, Paperclip, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { lookupService } from '../../../services/api/lookupService';
import { logsService } from '../../../services/api/logsService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useLogsStore } from '../../../stores/useLogsStore';
import { ErrorGroup, ErrorLog, ErrorLogAttachment, ErrorLogStatus, ProcessingFlow, Severity } from '../../../types';

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_ATTACHMENT_EXTENSIONS = ['.apng', '.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'];

function getAttachmentProvider(attachment: ErrorLogAttachment) {
  return (attachment.storageProvider || '').trim().toLowerCase();
}

function isCloudflareAttachment(attachment: ErrorLogAttachment) {
  const provider = getAttachmentProvider(attachment);
  return provider === 'r2' || provider === 'cloudflare' || provider === 'cloudflarer2';
}

function isImageAttachment(attachment: ErrorLogAttachment) {
  const contentType = (attachment.contentType || '').toLowerCase();

  if (contentType.startsWith('image/')) {
    return true;
  }

  const fileName = (attachment.fileName || '').toLowerCase();
  return IMAGE_ATTACHMENT_EXTENSIONS.some(extension => fileName.endsWith(extension));
}

function canPreviewCloudflareImage(attachment: ErrorLogAttachment) {
  return isCloudflareAttachment(attachment) && isImageAttachment(attachment) && Boolean(attachment.downloadUrl);
}

function getStorageProviderLabel(attachment: ErrorLogAttachment) {
  return isCloudflareAttachment(attachment) ? 'Cloudflare' : (attachment.storageProvider || 'Telegram');
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 48 * 1024 * 1024;
const SPEECH_RECOGNITION_LANGUAGE = 'vi-VN';

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getStatusClass(status: ErrorLogStatus) {
  if (status === 1) return 'badge-info';
  if (status === 2) return 'badge-warning';
  return 'badge-success';
}

function getSeverityClass(severity: Severity) {
  if (severity === 3) return 'badge-error';
  if (severity === 2) return 'badge-warning';
  return 'badge-success';
}

export default function ErrorLogsTab() {
  const currentUser = useAuthStore(s => s.currentUser);
  const isAdmin = currentUser?.role === 'Admin';
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
    logFromDateFilter,
    logToDateFilter,
    logErrorGroupFilter,
    logProcessingFlowFilter,
    logSeverityFilter,
    isLoading,
    setSearchQuery,
    setLogStoreFilter,
    setLogBoothFilter,
    setLogStatusFilter,
    setLogFromDateFilter,
    setLogToDateFilter,
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
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isListeningDescription, setIsListeningDescription] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const filteredLogs = getFilteredLogs();
  const selectedLogIdSet = new Set(selectedLogIds);
  const selectedLogCloudflareImages = selectedLogDetails?.attachments?.filter(canPreviewCloudflareImage) ?? [];
  const currentPageLogIds = filteredLogs.map(log => log.id);
  const isAllCurrentPageSelected = currentPageLogIds.length > 0 && currentPageLogIds.every(id => selectedLogIdSet.has(id));
  useEffect(() => {
    fetchLogs({
      store: logStoreFilter || undefined,
	      booth: logBoothFilter || undefined,
	      status: logStatusFilter || undefined,
	      fromDate: logFromDateFilter || undefined,
	      toDate: logToDateFilter || undefined,
	      errorGroup: logErrorGroupFilter || undefined,
      processingFlow: logProcessingFlowFilter || undefined,
      severity: logSeverityFilter || undefined,
      pageIndex: logPageIndex,
      pageSize: logPageSize,
    });
	  }, [fetchLogs, logStoreFilter, logBoothFilter, logStatusFilter, logFromDateFilter, logToDateFilter, logErrorGroupFilter, logProcessingFlowFilter, logSeverityFilter, logPageIndex, logPageSize]);

  const getFilterQuery = () => ({
    store: logStoreFilter || undefined,
	    booth: logBoothFilter || undefined,
	    status: logStatusFilter || undefined,
	    fromDate: logFromDateFilter || undefined,
	    toDate: logToDateFilter || undefined,
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

  const appendDescriptionTranscript = useCallback((transcript: string) => {
    const normalizedTranscript = transcript.trim();

    if (!normalizedTranscript) {
      return;
    }

    setDescription(currentDescription => {
      const separator = currentDescription.trim().length > 0 ? ' ' : '';
      return `${currentDescription}${separator}${normalizedTranscript}`;
    });
  }, []);

  const stopDescriptionDictation = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListeningDescription(false);
  }, []);

  const toggleDescriptionDictation = useCallback(() => {
    if (isListeningDescription) {
      stopDescriptionDictation();
      return;
    }

    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition
      ?? (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Trình duyệt hiện tại chưa hỗ trợ nhập giọng nói.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = SPEECH_RECOGNITION_LANGUAGE;

    recognition.onresult = event => {
      let finalTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      appendDescriptionTranscript(finalTranscript);
    };

    recognition.onerror = event => {
      setIsListeningDescription(false);
      recognitionRef.current = null;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error('Trình duyệt đang chặn quyền micro.');
        return;
      }

      toast.error('Không thể nhận giọng nói, vui lòng thử lại.');
    };

    recognition.onend = () => {
      setIsListeningDescription(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListeningDescription(true);
      toast.success('Đang nghe mô tả lỗi.');
    } catch {
      setIsListeningDescription(false);
      recognitionRef.current = null;
      toast.error('Không thể bật nhập giọng nói.');
    }
  }, [appendDescriptionTranscript, isListeningDescription, stopDescriptionDictation]);

  useEffect(() => {
    if (!isModalOpen) {
      stopDescriptionDictation();
    }
  }, [isModalOpen, stopDescriptionDictation]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleOpenModal = (log: ErrorLog | null = null) => {
    setAttachmentFiles([]);
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
      let savedLog: ErrorLog;
      if (currentEditingLog) {
        savedLog = await updateLog(currentEditingLog.id, payload);
      } else {
        savedLog = await addLog(payload);
      }

      if (attachmentFiles.length > 0) {
        setIsUploadingAttachments(true);
        try {
          await logsService.uploadAttachments(savedLog.id, attachmentFiles);
        } catch (uploadError: any) {
          if (!currentEditingLog) {
            setCurrentEditingLog(savedLog);
          }
          toast.error(
            `${currentEditingLog ? 'Log lỗi đã được cập nhật' : 'Log lỗi đã được tạo'}, nhưng upload tệp thất bại: ${uploadError.message || 'Lỗi không xác định'}`,
          );
          return;
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      await fetchLogs(getActiveQuery());
      toast.success(
        `${currentEditingLog ? 'Cập nhật' : 'Tạo'} log lỗi thành công${attachmentFiles.length > 0 ? ` và đã tải ${attachmentFiles.length} tệp lên hệ thống lưu trữ` : ''}.`,
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu log lỗi.');
    }
  };

  const handleAttachmentFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const oversizedFile = files.find(file => file.size > MAX_ATTACHMENT_BYTES);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (files.length > 10) {
      toast.error('Mỗi lần chỉ được chọn tối đa 10 tệp.');
      event.target.value = '';
      return;
    }

    if (oversizedFile) {
      toast.error(`Tệp ${oversizedFile.name} vượt quá giới hạn 20 MB.`);
      event.target.value = '';
      return;
    }

    if (totalSize > MAX_TOTAL_ATTACHMENT_BYTES) {
      toast.error('Tổng dung lượng tệp trong một lần upload không được vượt quá 48 MB.');
      event.target.value = '';
      return;
    }

    setAttachmentFiles(files);
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
          <h1 className="text-xl font-bold text-on-surface font-sans">Danh sách log lỗi hệ thống</h1>
          <p className="text-xs text-on-surface-variant mt-1">Theo dõi lỗi theo ngày tiếp nhận, cửa hàng, nhóm lỗi, trạng thái và mức độ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-secondary h-10 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ImagePlus className="h-4 w-4 shrink-0" />
            <span>Tải ảnh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSyncGoogleSheet}
              disabled={isSyncingGoogleSheet || isLoading}
              className="bg-surface text-success border border-success/30 hover:bg-success-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} /> {isSyncingGoogleSheet ? 'Đang sync...' : 'Sync Google Sheet'}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary h-10 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateReportText}
            disabled={isReportLoading || selectedLogIds.length === 0}
            title={selectedLogIds.length === 0 ? 'Chọn ít nhất một log lỗi để xuất báo cáo.' : 'Xuất báo cáo văn bản từ các log đã chọn.'}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3.5 text-xs font-semibold text-on-surface-variant transition-all hover:bg-surface-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>{isReportLoading ? 'Đang xuất...' : `Xuất báo cáo (${selectedLogIds.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="btn-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Plus className="w-4 h-4" /> Log lỗi
          </button>
        </div>
      </div>

      {isUploadModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleUploadTransactionImages}
        className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface p-5 shadow-2xl text-left"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-on-surface">Tải ảnh lỗi giao dịch</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Ảnh sẽ được gắn trực tiếp với mã giao dịch tương ứng.</p>
          </div>
          <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="Đóng">
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
              className="mt-1 block w-full cursor-pointer rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={isUploadingImages}
            className="btn-primary h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="rounded border border-outline-variant bg-surface-2 px-2 py-1 text-xs font-semibold text-on-surface-variant"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
      </form>
      </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant select-none font-sans">
                <th className="py-3 px-4 font-bold w-12">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleCurrentPageSelection}
                    disabled={filteredLogs.length === 0}
                    className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Chọn tất cả log lỗi trên trang hiện tại"
                  />
                </th>
                <th className="py-3 px-4 font-bold min-w-[220px]">Ngày tiếp nhận</th>
                <th className="py-3 px-4 font-bold min-w-[220px]">Cửa hàng</th>
                <th className="py-3 px-4 font-bold min-w-[180px]">Booth</th>
                <th className="py-3 px-4 font-bold min-w-[240px]">Mô tả lỗi</th>
                <th className="py-3 px-4 font-bold min-w-[140px]">Nhóm lỗi</th>
                <th className="py-3 px-4 font-bold min-w-[150px]">Trạng thái</th>
                <th className="py-3 px-4 font-bold min-w-[160px]">Luồng xử lý</th>
                <th className="py-3 px-4 font-bold min-w-[130px]">Mức độ</th>
                <th className="py-3 px-4 font-bold text-center w-20">Tệp</th>
                <th className="py-3 px-4 font-bold text-right w-32">Tùy biến</th>
              </tr>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="py-3 px-4" />
                <th className="py-3 px-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      id="log-from-date-filter"
                      value={logFromDateFilter}
                      max={logToDateFilter || undefined}
                      onChange={e => setLogFromDateFilter(e.target.value)}
                      aria-label="Lọc từ ngày tiếp nhận"
                      className="h-9 min-w-0 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <input
                      type="date"
                      id="log-to-date-filter"
                      value={logToDateFilter}
                      min={logFromDateFilter || undefined}
                      onChange={e => setLogToDateFilter(e.target.value)}
                      aria-label="Lọc đến ngày tiếp nhận"
                      className="h-9 min-w-0 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </th>
                <th className="py-3 px-4">
                  <LazySearchDropdown
                    ariaLabel="Lọc log theo cửa hàng"
                    value={logStoreFilter}
                    placeholder="Tất cả"
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
                </th>
                <th className="py-3 px-4">
                  <LazySearchDropdown
                    ariaLabel="Lọc log theo booth"
                    value={logBoothFilter}
                    placeholder="Tất cả"
                    emptyText="Không tìm thấy Booth."
                    loadOptions={loadFilteredBooths}
                    onSelect={item => setLogBoothFilter(item.name)}
                    onClear={() => setLogBoothFilter('')}
                  />
                </th>
                <th className="py-3 px-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    <input
                      type="text"
                      id="log-search-input"
                      placeholder="Mã lỗi, mô tả..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </th>
                <th className="py-3 px-4">
                  <select
                    id="log-error-group-filter"
                    value={logErrorGroupFilter}
                    onChange={e => setLogErrorGroupFilter(e.target.value ? Number(e.target.value) as ErrorGroup : '')}
                    aria-label="Lọc theo nhóm lỗi"
                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    <option value="">Tất cả</option>
                    {errorGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th className="py-3 px-4">
                  <select
                    id="log-status-filter"
                    value={logStatusFilter}
                    onChange={e => setLogStatusFilter(e.target.value ? Number(e.target.value) as ErrorLogStatus : '')}
                    aria-label="Lọc theo trạng thái"
                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    <option value="">Tất cả</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th className="py-3 px-4">
                  <select
                    id="log-processing-flow-filter"
                    value={logProcessingFlowFilter}
                    onChange={e => setLogProcessingFlowFilter(e.target.value ? Number(e.target.value) as ProcessingFlow : '')}
                    aria-label="Lọc theo luồng xử lý"
                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    <option value="">Tất cả</option>
                    {processingFlowOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th className="py-3 px-4">
                  <select
                    id="log-severity-filter"
                    value={logSeverityFilter}
                    onChange={e => setLogSeverityFilter(e.target.value ? Number(e.target.value) as Severity : '')}
                    aria-label="Lọc theo mức độ"
                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    <option value="">Tất cả</option>
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th className="py-3 px-4" />
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center font-bold text-on-surface-variant">
                    Đang tải dữ liệu log lỗi...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center font-bold text-on-surface-variant">
                    Hệ thống không ghi nhận log lỗi nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-4 px-5">
                      <input
                        type="checkbox"
                        checked={selectedLogIdSet.has(log.id)}
                        onChange={() => handleToggleLogSelection(log.id)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                        aria-label={`Chọn log lỗi ${log.errorCode || log.id}`}
                      />
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant font-semibold whitespace-nowrap">{formatDate(log.receivedDate)}</td>
                    <td className="py-4 px-4 font-semibold text-on-surface">{log.store}</td>
                    <td className="py-4 px-4 text-on-surface-variant">{log.booth || 'N/A'}</td>
                    <td className="py-4 px-4 text-on-surface-variant max-w-xs">
                      <span className="line-clamp-2">{log.description || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant">{errorGroupLabels[log.errorGroup]}</td>
                    <td className="py-4 px-4">
                      <span className={getStatusClass(log.status)}>
                        {statusLabels[log.status]}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant">{processingFlowLabels[log.processingFlow]}</td>
                    <td className="py-4 px-4">
                      <span className={getSeverityClass(log.severity)}>
                        {severityLabels[log.severity]}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(log.attachments?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-1 font-bold text-on-secondary-container transition-[filter] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Xem tệp đính kèm"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {log.attachments.length}
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/60">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-secondary-container text-on-secondary-container shadow-sm transition-[border-color,filter] hover:border-primary/50 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết log lỗi ${log.errorCode || log.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(log)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa log lỗi ${log.errorCode || log.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error/30 bg-error-container text-on-error-container shadow-sm transition-colors hover:border-error/50 hover:bg-error hover:text-white focus:outline-none focus:ring-2 focus:ring-error/30"
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

        <div className="bg-surface-2 border-t border-outline-variant px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <span className="text-xs text-on-surface-variant">
            Hiển thị {filteredLogs.length} của {totalItems} bản ghi lỗi · Đã chọn {selectedLogIds.length}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-on-surface-variant font-semibold" htmlFor="log-page-size">Số dòng</label>
            <select
              id="log-page-size"
              value={logPageSize}
              onChange={e => setLogPageSize(Number(e.target.value))}
              disabled={isLoading}
              className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-on-surface-variant font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-[11px] text-on-surface-variant font-medium min-w-[72px] text-center">
              Trang {totalPages === 0 ? 0 : logPageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setLogPageIndex(Math.max(logPageIndex - 1, 1))}
              disabled={isLoading || logPageIndex <= 1}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogPageIndex(logPageIndex + 1)}
              disabled={isLoading || totalPages === 0 || logPageIndex >= totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">Xuất báo cáo văn bản</h3>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>

            <div className="space-y-4 text-sm text-left">
              <div>
                <label className="block font-medium mb-1">Nội dung báo cáo</label>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  rows={8}
                  placeholder="Nội dung báo cáo sẽ hiển thị sau khi xuất."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary font-mono text-xs resize-y"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  disabled={!reportText}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ClipboardCopy className="w-4 h-4" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="btn-primary"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingLog ? 'Chỉnh sửa log lỗi' : 'Thêm lỗi mới'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-primary"
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
                    className="w-full px-3 py-2 border rounded-lg bg-surface"
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
                    className="w-full px-3 py-2 border rounded-lg bg-surface"
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
                    className="w-full px-3 py-2 border rounded-lg bg-surface"
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
                    className="w-full px-3 py-2 border rounded-lg bg-surface"
                  >
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-medium">Mô tả lỗi *</label>
                  <button
                    type="button"
                    onClick={toggleDescriptionDictation}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${
                      isListeningDescription
                        ? 'border-error bg-error/10 text-error'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-2'
                    }`}
                    title={isListeningDescription ? 'Dừng nhập giọng nói' : 'Nhập mô tả bằng giọng nói'}
                    aria-pressed={isListeningDescription}
                  >
                    {isListeningDescription ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isListeningDescription ? 'Đang nghe' : 'Voice'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nhập mô tả lỗi chi tiết..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Nguyên nhân sơ bộ</label>
                <textarea
                  rows={3}
                  value={preliminaryCause}
                  onChange={e => setPreliminaryCause(e.target.value)}
                  placeholder="Nhập nguyên nhân sơ bộ nếu có..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Cách xử lý</label>
                <textarea
                  rows={3}
                  value={solution}
                  onChange={e => setSolution(e.target.value)}
                  placeholder="Nhập cách xử lý nếu có..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary resize-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Nhập ghi chú thêm..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary resize-none"
                />
              </div>

              <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-surface-2 p-4">
                <label className="flex items-center gap-2 font-semibold text-on-surface">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Tệp đính kèm
                </label>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Tối đa 10 tệp, 20 MB mỗi tệp và 48 MB cho một lần upload. Backend không lưu file lâu dài.
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentFilesChange}
                  className="mt-3 block w-full cursor-pointer rounded-lg border border-dashed border-primary/40 bg-surface p-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {attachmentFiles.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {attachmentFiles.map(file => (
                      <div key={`${file.name}_${file.size}_${file.lastModified}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate font-semibold" title={file.name}>{file.name}</span>
                        <span className="shrink-0 text-on-surface-variant">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(currentEditingLog?.attachments?.length ?? 0) > 0 && (
                  <div className="mt-4 border-t border-outline-variant pt-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tệp đã lưu</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentEditingLog!.attachments.map(attachment => {
                        const canPreview = canPreviewCloudflareImage(attachment);

                        return (
                          <a
                            key={attachment.id}
                            href={attachment.downloadUrl}
                            download={attachment.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className={canPreview
                              ? 'block min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface text-xs transition-colors hover:border-primary/40 hover:text-primary'
                              : 'flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:text-primary'}
                          >
                            {canPreview ? (
                              <>
                                <div className="aspect-video w-full bg-surface-2">
                                  <img
                                    src={attachment.downloadUrl}
                                    alt={attachment.fileName}
                                    loading="lazy"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                                  <Download className="h-4 w-4 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate font-semibold" title={attachment.fileName}>{attachment.fileName}</span>
                                  <span className="shrink-0 text-on-surface-variant">{formatFileSize(attachment.fileSize)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate font-semibold" title={attachment.fileName}>{attachment.fileName}</span>
                                <span className="shrink-0 text-on-surface-variant">{formatFileSize(attachment.fileSize)}</span>
                              </>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploadingAttachments}
                  className="btn-primary"
                >
                  {isUploadingAttachments ? 'Đang tải tệp...' : isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLogDetails && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Chi tiết log lỗi</h3>
                <p className="text-xs text-on-surface-variant mt-1">{selectedLogDetails.errorCode || selectedLogDetails.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedLogDetails(null)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Ngày tiếp nhận</span>
                <p className="font-semibold text-on-surface">{formatDate(selectedLogDetails.receivedDate)}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Cửa hàng</span>
                <p className="font-semibold text-on-surface">{selectedLogDetails.store}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Booth</span>
                <p className="font-semibold text-on-surface">{selectedLogDetails.booth || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nhóm lỗi</span>
                <p className="font-semibold text-on-surface">{errorGroupLabels[selectedLogDetails.errorGroup]}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">IT phụ trách</span>
                <p className="font-semibold text-on-surface">{selectedLogDetails.assignedToName || selectedLogDetails.assignedToId || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Trạng thái</span>
                <span className={getStatusClass(selectedLogDetails.status)}>
                  {statusLabels[selectedLogDetails.status]}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mức độ</span>
                <span className={getSeverityClass(selectedLogDetails.severity)}>
                  {severityLabels[selectedLogDetails.severity]}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-5 text-sm">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mô tả lỗi</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface-variant whitespace-pre-wrap">{selectedLogDetails.description || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nguyên nhân sơ bộ</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface-variant whitespace-pre-wrap">{selectedLogDetails.preliminaryCause || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Cách xử lý</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface-variant whitespace-pre-wrap">{selectedLogDetails.solution || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Ghi chú</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface-variant whitespace-pre-wrap">{selectedLogDetails.note || 'N/A'}</p>
              </div>
              {selectedLogCloudflareImages.length > 0 && (
                <div>
                  <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ảnh Cloudflare</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedLogCloudflareImages.map(attachment => (
                      <a
                        key={attachment.id}
                        href={attachment.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-lg border border-outline-variant bg-surface-2 transition-colors hover:border-primary/40"
                        title="Mở ảnh Cloudflare"
                      >
                        <div className="aspect-video w-full bg-surface">
                          <img
                            src={attachment.downloadUrl}
                            alt={attachment.fileName}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-semibold text-on-surface group-hover:text-primary" title={attachment.fileName}>{attachment.fileName}</span>
                          <span className="shrink-0 text-on-surface-variant">{formatFileSize(attachment.fileSize)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tệp đính kèm</span>
                {(selectedLogDetails.attachments?.length ?? 0) === 0 ? (
                  <p className="rounded-lg border border-dashed border-outline-variant bg-surface-2 p-3 text-on-surface-variant">Chưa có tệp đính kèm.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedLogDetails.attachments.map(attachment => {
                      const canPreview = canPreviewCloudflareImage(attachment);

                      return (
                        <a
                          key={attachment.id}
                          href={attachment.downloadUrl}
                          download={attachment.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className={canPreview
                            ? 'block min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-2 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                            : 'flex min-w-0 items-center gap-3 rounded-lg border border-outline-variant bg-surface-2 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary'}
                          title="Mở và tải trực tiếp"
                        >
                          {canPreview ? (
                            <>
                              <div className="aspect-video w-full bg-surface">
                                <img
                                  src={attachment.downloadUrl}
                                  alt={attachment.fileName}
                                  loading="lazy"
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <span className="flex min-w-0 items-center gap-3 p-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Download className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-semibold" title={attachment.fileName}>{attachment.fileName}</span>
                                  <span className="block text-xs text-on-surface-variant">{formatFileSize(attachment.fileSize)} · {getStorageProviderLabel(attachment)}</span>
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Download className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold" title={attachment.fileName}>{attachment.fileName}</span>
                                <span className="block text-xs text-on-surface-variant">{formatFileSize(attachment.fileSize)} · {getStorageProviderLabel(attachment)}</span>
                              </span>
                            </>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-5 mt-5 border-t">
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="btn-secondary px-5 py-2 text-xs"
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
