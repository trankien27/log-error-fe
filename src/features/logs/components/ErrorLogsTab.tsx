import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, ClipboardCopy, Download, Edit2, Eye, FileText, ImagePlus, Mic, MicOff, Paperclip, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { lookupService } from '../../../services/api/lookupService';
import { logsService } from '../../../services/api/logsService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useLogsStore } from '../../../stores/useLogsStore';
import { ErrorGroup, ErrorLog, ErrorLogAttachment, ErrorLogStatus, ProcessingFlow, Severity } from '../../../types';
import { EmptyState, FilterBar, ListSkeleton, PageHeader, TableSkeletonRows, confirmAction } from '../../../components/ui';

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

function formatDateFilterLabel(date: string) {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
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
  const [isReceivedDateFilterOpen, setIsReceivedDateFilterOpen] = useState(false);
  const [pendingFromDateFilter, setPendingFromDateFilter] = useState(logFromDateFilter);
  const [pendingToDateFilter, setPendingToDateFilter] = useState(logToDateFilter);
  const [receivedDateFilterPosition, setReceivedDateFilterPosition] = useState({ left: 0, top: 0 });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const receivedDateFilterRef = useRef<HTMLDivElement | null>(null);
  const receivedDateFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  const filteredLogs = getFilteredLogs();
  const selectedLogIdSet = new Set(selectedLogIds);
  const selectedLogCloudflareImages = selectedLogDetails?.attachments?.filter(canPreviewCloudflareImage) ?? [];
  const currentPageLogIds = filteredLogs.map(log => log.id);
  const isAllCurrentPageSelected = currentPageLogIds.length > 0 && currentPageLogIds.every(id => selectedLogIdSet.has(id));
  const receivedDateFilterLabel = logFromDateFilter || logToDateFilter
    ? `${formatDateFilterLabel(logFromDateFilter) || '...'} - ${formatDateFilterLabel(logToDateFilter) || '...'}`
    : 'Chọn ngày';

  const updateReceivedDateFilterPosition = useCallback(() => {
    const rect = receivedDateFilterButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setReceivedDateFilterPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
      top: rect.bottom + 8,
    });
  }, []);

  useEffect(() => {
    if (!isReceivedDateFilterOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!receivedDateFilterRef.current?.contains(event.target as Node)) {
        setIsReceivedDateFilterOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReceivedDateFilterOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateReceivedDateFilterPosition);
    window.addEventListener('scroll', updateReceivedDateFilterPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateReceivedDateFilterPosition);
      window.removeEventListener('scroll', updateReceivedDateFilterPosition, true);
    };
  }, [isReceivedDateFilterOpen, updateReceivedDateFilterPosition]);
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

  const handleDelete = async (log: ErrorLog) => {
    const confirmed = await confirmAction({
      title: `Xóa log lỗi ${log.errorCode || log.id}?`,
      content: 'Thao tác không thể hoàn tác.',
    });
    if (!confirmed) return;

    try {
      await deleteLog(log.id);
      setSelectedLogIds(prev => prev.filter(id => id !== log.id));
      toast.success('Đã xóa log lỗi.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa log lỗi.');
    }
  };

  const handleApplyReceivedDateFilter = () => {
    setLogFromDateFilter(pendingFromDateFilter);
    setLogToDateFilter(pendingToDateFilter);
    setIsReceivedDateFilterOpen(false);
  };

  const handleClearReceivedDateFilter = () => {
    setPendingFromDateFilter('');
    setPendingToDateFilter('');
    setLogFromDateFilter('');
    setLogToDateFilter('');
    setIsReceivedDateFilterOpen(false);
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
      toast.success('Đã đồng bộ dữ liệu từ Google Sheet.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể đồng bộ Google Sheet. Vui lòng thử lại.');
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
      toast.error('Chưa có nội dung để sao chép.');
      return;
    }

    try {
      await navigator.clipboard.writeText(reportText);
      toast.success('Đã sao chép báo cáo.');
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.');
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

  const filterSelectClass =
    'h-9 rounded-lg border border-outline-variant bg-surface px-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer';
  const hasActiveFilters = Boolean(
    searchQuery
    || logStoreFilter
    || logBoothFilter
    || logStatusFilter
    || logFromDateFilter
    || logToDateFilter
    || logErrorGroupFilter
    || logProcessingFlowFilter
    || logSeverityFilter,
  );
  const handleResetFilters = () => {
    setSearchQuery('');
    setLogStoreFilter('');
    setLogStoreFilterId(undefined);
    setLogBoothFilter('');
    setLogStatusFilter('');
    setLogErrorGroupFilter('');
    setLogProcessingFlowFilter('');
    setLogSeverityFilter('');
    handleClearReceivedDateFilter();
  };
  const iconButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer';

  return (
    <div className="animate-fadeIn text-left">
      <PageHeader
        title="Log lỗi"
        description="Theo dõi và xử lý các lỗi được ghi nhận tại booth."
        icon={AlertTriangle}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-secondary"
            >
              <ImagePlus className="h-4 w-4 shrink-0" />
              <span>Tải ảnh</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleSyncGoogleSheet}
                disabled={isSyncingGoogleSheet || isLoading}
                className="btn-secondary"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
                {isSyncingGoogleSheet ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheet'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-secondary"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateReportText}
              disabled={isReportLoading || selectedLogIds.length === 0}
              title={selectedLogIds.length === 0 ? 'Chọn ít nhất một log lỗi để xuất báo cáo.' : 'Xuất báo cáo văn bản từ các log đã chọn.'}
              className="btn-secondary"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>{isReportLoading ? 'Đang xuất...' : `Báo cáo (${selectedLogIds.length})`}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Thêm log lỗi
            </button>
          </>
        )}
      />

      <FilterBar onReset={hasActiveFilters ? handleResetFilters : undefined}>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            id="log-search-input"
            aria-label="Tìm log lỗi"
            placeholder="Tìm mã lỗi, mô tả..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div ref={receivedDateFilterRef} className="relative w-full sm:w-56">
          <button
            type="button"
            ref={receivedDateFilterButtonRef}
            onClick={() => {
              setPendingFromDateFilter(logFromDateFilter);
              setPendingToDateFilter(logToDateFilter);
              updateReceivedDateFilterPosition();
              setIsReceivedDateFilterOpen(current => !current);
            }}
            className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              logFromDateFilter || logToDateFilter
                ? 'border-primary/50 bg-primary-subtle text-primary font-medium'
                : 'border-outline-variant bg-surface text-on-surface-variant'
            }`}
            aria-label="Lọc theo ngày tiếp nhận"
            aria-expanded={isReceivedDateFilterOpen}
            aria-controls="received-date-filter-panel"
          >
            <span className="truncate">{logFromDateFilter || logToDateFilter ? receivedDateFilterLabel : 'Ngày tiếp nhận'}</span>
            <Calendar className="h-4 w-4 shrink-0" />
          </button>

          {isReceivedDateFilterOpen && (
            <div
              id="received-date-filter-panel"
              style={{
                left: receivedDateFilterPosition.left,
                top: receivedDateFilterPosition.top,
              }}
              className="fixed z-50 w-72 space-y-3 rounded-xl border border-outline-variant bg-surface p-3 shadow-elevated"
            >
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-on-surface-variant">
                <span>Từ ngày</span>
                <span>Đến ngày</span>
              </div>
              <div className="grid grid-cols-2 gap-2 -mt-1">
                <input
                  type="date"
                  id="log-from-date-filter"
                  value={pendingFromDateFilter}
                  max={pendingToDateFilter || undefined}
                  onChange={e => setPendingFromDateFilter(e.target.value)}
                  aria-label="Lọc từ ngày tiếp nhận"
                  className="h-9 w-full rounded-lg border border-outline-variant bg-surface-2 px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="date"
                  id="log-to-date-filter"
                  value={pendingToDateFilter}
                  min={pendingFromDateFilter || undefined}
                  onChange={e => setPendingToDateFilter(e.target.value)}
                  aria-label="Lọc đến ngày tiếp nhận"
                  className="h-9 w-full rounded-lg border border-outline-variant bg-surface-2 px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleClearReceivedDateFilter}
                  className="h-8 rounded-lg border border-outline-variant bg-surface text-sm font-medium text-on-surface-variant hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={handleApplyReceivedDateFilter}
                  className="h-8 rounded-lg bg-primary text-sm font-medium text-on-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full sm:w-48">
          <LazySearchDropdown
            ariaLabel="Lọc log theo cửa hàng"
            value={logStoreFilter}
            placeholder="Mọi cửa hàng"
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
        <div className="w-full sm:w-44">
          <LazySearchDropdown
            ariaLabel="Lọc log theo booth"
            value={logBoothFilter}
            placeholder="Mọi booth"
            emptyText="Không tìm thấy Booth."
            loadOptions={loadFilteredBooths}
            onSelect={item => setLogBoothFilter(item.name)}
            onClear={() => setLogBoothFilter('')}
          />
        </div>

        <select
          id="log-error-group-filter"
          value={logErrorGroupFilter}
          onChange={e => setLogErrorGroupFilter(e.target.value ? Number(e.target.value) as ErrorGroup : '')}
          aria-label="Lọc theo nhóm lỗi"
          className={filterSelectClass}
        >
          <option value="">Mọi nhóm lỗi</option>
          {errorGroupOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          id="log-status-filter"
          value={logStatusFilter}
          onChange={e => setLogStatusFilter(e.target.value ? Number(e.target.value) as ErrorLogStatus : '')}
          aria-label="Lọc theo trạng thái"
          className={filterSelectClass}
        >
          <option value="">Mọi trạng thái</option>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          id="log-processing-flow-filter"
          value={logProcessingFlowFilter}
          onChange={e => setLogProcessingFlowFilter(e.target.value ? Number(e.target.value) as ProcessingFlow : '')}
          aria-label="Lọc theo luồng xử lý"
          className={filterSelectClass}
        >
          <option value="">Mọi luồng xử lý</option>
          {processingFlowOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          id="log-severity-filter"
          value={logSeverityFilter}
          onChange={e => setLogSeverityFilter(e.target.value ? Number(e.target.value) as Severity : '')}
          aria-label="Lọc theo mức độ"
          className={filterSelectClass}
        >
          <option value="">Mọi mức độ</option>
          {severityOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FilterBar>

      {isUploadModalOpen && (
      <div className="modal-overlay">
      <form
        onSubmit={handleUploadTransactionImages}
        className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface p-5 shadow-elevated text-left"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Tải ảnh lỗi giao dịch</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Ảnh sẽ được gắn với mã giao dịch tương ứng.</p>
          </div>
          <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" aria-label="Đóng" title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block text-sm font-medium text-on-surface-variant lg:flex-1">
            Mã giao dịch
            <input
              value={uploadTransactionId}
              onChange={event => setUploadTransactionId(event.target.value)}
              placeholder="bf2b4b62-2785-466a-871c-8f41f68ceedb"
              className="mt-1.5 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          <label className="block text-sm font-medium text-on-surface-variant lg:flex-1">
            Ảnh lỗi
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={event => setUploadImages(Array.from(event.target.files || []))}
              className="mt-1.5 block w-full cursor-pointer rounded-lg border border-dashed border-primary/40 bg-primary-subtle/50 p-1.5 text-sm text-on-surface file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={isUploadingImages}
            className="btn-primary"
          >
            {isUploadingImages ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploadingImages ? 'Đang tải lên...' : 'Tải lên'}
          </button>
        </div>

        {uploadImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadImages.map(file => (
              <span
                key={`${file.name}_${file.size}_${file.lastModified}`}
                className="rounded-md border border-outline-variant bg-surface-2 px-2 py-1 text-xs font-medium text-on-surface-variant"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
      </form>
      </div>
      )}

      <section className="card-surface overflow-hidden">
        {/* Mobile card list */}
        <div className="md:hidden">
          {filteredLogs.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-2/60 px-4 py-2.5">
              <input
                type="checkbox"
                id="log-select-all-mobile"
                checked={isAllCurrentPageSelected}
                onChange={handleToggleCurrentPageSelection}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <label htmlFor="log-select-all-mobile" className="text-xs font-medium text-on-surface-variant cursor-pointer">
                Chọn tất cả trên trang
              </label>
            </div>
          )}
          {isLoading ? (
            <ListSkeleton rows={5} className="p-4" />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              compact
              icon={AlertTriangle}
              title="Không có log lỗi nào"
              description={hasActiveFilters ? 'Thử đổi hoặc xóa bộ lọc.' : 'Log lỗi mới sẽ xuất hiện ở đây.'}
            />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {filteredLogs.map(log => (
                <li key={log.id} className="flex gap-3 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedLogIdSet.has(log.id)}
                    onChange={() => handleToggleLogSelection(log.id)}
                    className="mt-1 w-4 h-4 shrink-0 accent-primary cursor-pointer"
                    aria-label={`Chọn log lỗi ${log.errorCode || log.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedLogDetails(log)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                    aria-label={`Xem chi tiết log lỗi ${log.errorCode || log.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-medium text-primary">{log.errorCode || 'N/A'}</span>
                      <span className={`${getStatusClass(log.status)} shrink-0`}>{statusLabels[log.status]}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface">{log.description || 'Không có mô tả'}</p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">
                      {log.store}{log.booth ? ` · ${log.booth}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span>{formatDate(log.receivedDate)}</span>
                      <span>{log.assignedToName || log.assignedToId || 'Chưa phân công'}</span>
                      {(log.attachments?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {log.attachments.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(log)}
                      className={`${iconButtonClass} hover:bg-primary-subtle hover:text-primary`}
                      title="Chỉnh sửa"
                      aria-label={`Chỉnh sửa log lỗi ${log.errorCode || log.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log)}
                      className={`${iconButtonClass} hover:bg-error-container hover:text-error`}
                      title="Xóa"
                      aria-label={`Xóa log lỗi ${log.errorCode || log.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2/60 border-b border-outline-variant text-xs text-on-surface-variant select-none">
                <th className="py-3 px-4 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleCurrentPageSelection}
                    disabled={filteredLogs.length === 0}
                    className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Chọn tất cả log lỗi trên trang hiện tại"
                  />
                </th>
                <th className="py-3 px-4 font-medium min-w-[140px]">Ngày tiếp nhận</th>
                <th className="py-3 px-4 font-medium min-w-[130px]">Mã lỗi</th>
                <th className="py-3 px-4 font-medium min-w-[180px]">Cửa hàng</th>
                <th className="py-3 px-4 font-medium min-w-[140px]">Booth</th>
                <th className="py-3 px-4 font-medium min-w-[240px]">Mô tả lỗi</th>
                <th className="py-3 px-4 font-medium min-w-[110px]">Nhóm lỗi</th>
                <th className="py-3 px-4 font-medium min-w-[150px]">Trạng thái</th>
                <th className="py-3 px-4 font-medium min-w-[140px]">Luồng xử lý</th>
                <th className="py-3 px-4 font-medium min-w-[110px]">Mức độ</th>
                <th className="py-3 px-4 font-medium text-center w-20">Tệp</th>
                <th className="py-3 px-4 font-medium text-right w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <TableSkeletonRows columns={12} />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <EmptyState
                      compact
                      icon={AlertTriangle}
                      title="Không có log lỗi nào"
                      description={hasActiveFilters ? 'Thử đổi hoặc xóa bộ lọc.' : 'Log lỗi mới sẽ xuất hiện ở đây.'}
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedLogIdSet.has(log.id)}
                        onChange={() => handleToggleLogSelection(log.id)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                        aria-label={`Chọn log lỗi ${log.errorCode || log.id}`}
                      />
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{formatDate(log.receivedDate)}</td>
                    <td className="py-3 px-4 font-mono text-[13px] font-medium text-primary whitespace-nowrap">{log.errorCode || 'N/A'}</td>
                    <td className="py-3 px-4 font-medium text-on-surface">{log.store}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{log.booth || 'N/A'}</td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-xs">
                      <span className="line-clamp-2">{log.description || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{errorGroupLabels[log.errorGroup]}</td>
                    <td className="py-3 px-4">
                      <span className={getStatusClass(log.status)}>
                        {statusLabels[log.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{processingFlowLabels[log.processingFlow]}</td>
                    <td className="py-3 px-4">
                      <span className={getSeverityClass(log.severity)}>
                        {severityLabels[log.severity]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(log.attachments?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                          title="Xem tệp đính kèm"
                          aria-label={`Xem ${log.attachments.length} tệp đính kèm`}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {log.attachments.length}
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/60">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className={`${iconButtonClass} hover:bg-surface-2 hover:text-on-surface`}
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết log lỗi ${log.errorCode || log.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(log)}
                          className={`${iconButtonClass} hover:bg-primary-subtle hover:text-primary`}
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa log lỗi ${log.errorCode || log.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log)}
                          className={`${iconButtonClass} hover:bg-error-container hover:text-error focus:ring-error/30`}
                          title="Xóa"
                          aria-label={`Xóa log lỗi ${log.errorCode || log.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-2/60 border-t border-outline-variant px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm text-on-surface-variant">
            Hiển thị {filteredLogs.length} / {totalItems} log · Đã chọn {selectedLogIds.length}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-xs font-medium text-on-surface-variant" htmlFor="log-page-size">Số dòng</label>
            <select
              id="log-page-size"
              value={logPageSize}
              onChange={e => setLogPageSize(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 px-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-xs text-on-surface-variant font-medium min-w-[72px] text-center">
              Trang {totalPages === 0 ? 0 : logPageIndex}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setLogPageIndex(Math.max(logPageIndex - 1, 1))}
              disabled={isLoading || logPageIndex <= 1}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang trước"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLogPageIndex(logPageIndex + 1)}
              disabled={isLoading || totalPages === 0 || logPageIndex >= totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Trang sau"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {isReportModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface">Xuất báo cáo văn bản</h3>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer" aria-label="Đóng" title="Đóng"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4 text-sm text-left">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Nội dung báo cáo</label>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  rows={8}
                  placeholder="Nội dung báo cáo sẽ hiển thị sau khi xuất."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-xs resize-y"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  disabled={!reportText}
                  className="btn-secondary"
                >
                  <ClipboardCopy className="w-4 h-4" /> Sao chép
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
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant">
            <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface">
                {currentEditingLog ? 'Chỉnh sửa log lỗi' : 'Thêm log lỗi'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer" aria-label="Đóng" title="Đóng"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} onKeyDown={handleSaveShortcut} className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Ngày tiếp nhận *</label>
                  <input
                    type="datetime-local"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Cửa hàng *</label>
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
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Booth</label>
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
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Nhóm lỗi</label>
                  <select
                    value={errorGroup}
                    onChange={e => setErrorGroup(Number(e.target.value) as ErrorGroup)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {errorGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Luồng xử lý</label>
                  <select
                    value={processingFlow}
                    onChange={e => setProcessingFlow(Number(e.target.value) as ProcessingFlow)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {processingFlowOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Trạng thái</label>
                  <select
                    value={status}
                    onChange={e => setStatus(Number(e.target.value) as ErrorLogStatus)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Mức độ</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(Number(e.target.value) as Severity)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-on-surface-variant">Mô tả lỗi *</label>
                  <button
                    type="button"
                    onClick={toggleDescriptionDictation}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                      isListeningDescription
                        ? 'border-error bg-error-container text-on-error-container'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-2'
                    }`}
                    title={isListeningDescription ? 'Dừng nhập giọng nói' : 'Nhập mô tả bằng giọng nói'}
                    aria-pressed={isListeningDescription}
                  >
                    {isListeningDescription ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isListeningDescription ? 'Đang nghe' : 'Giọng nói'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nhập mô tả lỗi chi tiết..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Nguyên nhân sơ bộ</label>
                <textarea
                  rows={3}
                  value={preliminaryCause}
                  onChange={e => setPreliminaryCause(e.target.value)}
                  placeholder="Nhập nguyên nhân sơ bộ nếu có..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Cách xử lý</label>
                <textarea
                  rows={3}
                  value={solution}
                  onChange={e => setSolution(e.target.value)}
                  placeholder="Nhập cách xử lý nếu có..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Ghi chú</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Nhập ghi chú thêm..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-surface-2 p-4">
                <label className="flex items-center gap-2 font-semibold text-on-surface">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Tệp đính kèm
                </label>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Tối đa 10 tệp, mỗi tệp 20 MB, tổng 48 MB mỗi lần tải lên.
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentFilesChange}
                  className="mt-3 block w-full cursor-pointer rounded-lg border border-dashed border-primary/40 bg-surface p-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    <p className="mb-2 text-xs font-medium text-on-surface-variant">Tệp đã lưu</p>
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

              <div className="lg:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-outline-variant">
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
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-outline-variant">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Chi tiết log lỗi</h3>
                <p className="text-xs text-on-surface-variant mt-1">{selectedLogDetails.errorCode || selectedLogDetails.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedLogDetails(null)} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer" aria-label="Đóng" title="Đóng"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Ngày tiếp nhận</span>
                <p className="font-medium text-on-surface">{formatDate(selectedLogDetails.receivedDate)}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Cửa hàng</span>
                <p className="font-medium text-on-surface">{selectedLogDetails.store}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Booth</span>
                <p className="font-medium text-on-surface">{selectedLogDetails.booth || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Nhóm lỗi</span>
                <p className="font-medium text-on-surface">{errorGroupLabels[selectedLogDetails.errorGroup]}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">IT phụ trách</span>
                <p className="font-medium text-on-surface">{selectedLogDetails.assignedToName || selectedLogDetails.assignedToId || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Trạng thái</span>
                <span className={getStatusClass(selectedLogDetails.status)}>
                  {statusLabels[selectedLogDetails.status]}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Mức độ</span>
                <span className={getSeverityClass(selectedLogDetails.severity)}>
                  {severityLabels[selectedLogDetails.severity]}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-5 text-sm">
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Mô tả lỗi</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface whitespace-pre-wrap">{selectedLogDetails.description || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Nguyên nhân sơ bộ</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface whitespace-pre-wrap">{selectedLogDetails.preliminaryCause || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Cách xử lý</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface whitespace-pre-wrap">{selectedLogDetails.solution || 'N/A'}</p>
              </div>
              <div>
                <span className="block text-xs font-medium text-on-surface-variant mb-1">Ghi chú</span>
                <p className="bg-surface-2 border border-outline-variant rounded-lg p-3 text-on-surface whitespace-pre-wrap">{selectedLogDetails.note || 'N/A'}</p>
              </div>
              {selectedLogCloudflareImages.length > 0 && (
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant mb-2">Ảnh Cloudflare</span>
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
                <span className="block text-xs font-medium text-on-surface-variant mb-2">Tệp đính kèm</span>
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
                            ? 'block min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-2 transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary'
                            : 'flex min-w-0 items-center gap-3 rounded-lg border border-outline-variant bg-surface-2 p-3 transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary'}
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
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
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
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
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

            <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="btn-secondary"
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
