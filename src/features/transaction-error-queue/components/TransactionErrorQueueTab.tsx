import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, ListX, Loader2, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorGroup, ProcessingFlow, Severity, TransactionErrorQueueItem, TransactionErrorQueueStatus } from '../../../types';
import {
  ConvertTransactionErrorQueuePayload,
  transactionErrorQueueService,
} from '../../../services/api/transactionErrorQueueService';
import { EmptyState, FilterBar, ListSkeleton, PageHeader, TableSkeletonRows } from '../../../components/ui';

const queueStatusLabels: Record<TransactionErrorQueueStatus, string> = {
  1: 'Đang chờ',
  2: 'Đã tạo log',
  3: 'Đã bỏ qua',
};

const errorGroupOptions: Array<{ value: ErrorGroup; label: string }> = [
  { value: 1, label: 'Phần cứng' },
  { value: 2, label: 'Phần mềm' },
  { value: 3, label: 'Khác' },
];

const processingFlowOptions: Array<{ value: ProcessingFlow; label: string }> = [
  { value: 1, label: 'IT Support xử lý' },
  { value: 2, label: 'Gửi Dev xử lý' },
  { value: 3, label: 'Khác' },
];

const severityOptions: Array<{ value: Severity; label: string }> = [
  { value: 1, label: 'Thấp' },
  { value: 2, label: 'Trung bình' },
  { value: 3, label: 'Cao' },
];

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

function formatDate(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getDefaultForm(item: TransactionErrorQueueItem): ConvertTransactionErrorQueuePayload {
  const code = item.transactionCode || item.transactionId;
  return {
    receivedDate: toDateTimeInputValue(new Date()),
    store: item.storeName || '',
    booth: item.boothCode || item.boothName || '',
    errorGroup: 2,
    description: `Transaction lỗi: ${code} - Status ${item.transactionStatus ?? ''}`.trim(),
    processingFlow: 1,
    preliminaryCause: '',
    solution: '',
    severity: 2,
    assignedToId: '',
    note: '',
  };
}

export default function TransactionErrorQueueTab() {
  const [items, setItems] = useState<TransactionErrorQueueItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<TransactionErrorQueueStatus | ''>(1);
  const [boothCode, setBoothCode] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TransactionErrorQueueItem | null>(null);
  const [form, setForm] = useState<ConvertTransactionErrorQueuePayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const selectedValues = selectedItem?.values ?? {};
  const selectedRows = useMemo(() => Object.entries(selectedValues), [selectedValues]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await transactionErrorQueueService.getAll({
        status: status || undefined,
        boothCode: boothCode.trim() || undefined,
        transactionStatus: transactionStatus.trim() || undefined,
        pageIndex,
        pageSize,
      });
      setItems(result.items);
      setTotalItems(result.totalItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải hàng đợi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [boothCode, pageIndex, pageSize, status, transactionStatus]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openDetail = (item: TransactionErrorQueueItem) => {
    setSelectedItem(item);
    setForm(getDefaultForm(item));
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setForm(null);
  };

  const handleConvert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedItem || !form) return;

    if (!form.store.trim() || !form.description.trim()) {
      toast.error('Vui lòng nhập cửa hàng và mô tả lỗi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await transactionErrorQueueService.convertToErrorLog(selectedItem.id, {
        ...form,
        receivedDate: toApiDateTime(form.receivedDate),
      });
      toast.success('Đã tạo log lỗi.');
      closeDetail();
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo log lỗi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = async (item: TransactionErrorQueueItem) => {
    setIsSubmitting(true);
    try {
      await transactionErrorQueueService.ignore(item.id);
      toast.success('Đã bỏ qua giao dịch lỗi.');
      closeDetail();
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể bỏ qua giao dịch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = <K extends keyof ConvertTransactionErrorQueuePayload>(
    key: K,
    value: ConvertTransactionErrorQueuePayload[K],
  ) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const fieldClass =
    'w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
  const textareaClass =
    'w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
  const labelClass = 'text-sm font-medium text-on-surface-variant';
  const filterInputClass =
    'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
  const hasFilters = status !== 1 || Boolean(boothCode) || Boolean(transactionStatus);
  const resetFilters = () => {
    setStatus(1);
    setBoothCode('');
    setTransactionStatus('');
    setPageIndex(1);
  };

  return (
    <div className="max-w-[1600px] mx-auto text-left">
      <PageHeader
        title="Hàng đợi lỗi"
        description="Giao dịch booth hôm nay chưa hoàn tất, chờ IT kiểm tra và tạo log lỗi."
        icon={ListX}
        actions={(
          <button
            type="button"
            onClick={fetchItems}
            disabled={isLoading}
            className="btn-secondary"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Làm mới
          </button>
        )}
      />

      <FilterBar onReset={hasFilters ? resetFilters : undefined}>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            aria-label="Tìm booth"
            value={boothCode}
            onChange={event => {
              setBoothCode(event.target.value);
              setPageIndex(1);
            }}
            placeholder="Tìm theo mã booth"
            className={`${filterInputClass} w-full pl-9`}
          />
        </div>
        <select
          aria-label="Trạng thái hàng đợi"
          value={status}
          onChange={event => {
            setStatus(event.target.value ? Number(event.target.value) as TransactionErrorQueueStatus : '');
            setPageIndex(1);
          }}
          className={`${filterInputClass} w-40`}
        >
          <option value="">Mọi trạng thái</option>
          <option value={1}>Đang chờ</option>
          <option value={2}>Đã tạo log</option>
          <option value={3}>Đã bỏ qua</option>
        </select>
        <input
          aria-label="Mã trạng thái giao dịch"
          value={transactionStatus}
          onChange={event => {
            setTransactionStatus(event.target.value);
            setPageIndex(1);
          }}
          placeholder="Mã trạng thái GD (vd: 1)"
          className={`${filterInputClass} w-48`}
        />
      </FilterBar>

      <section className="card-surface overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-outline-variant">
          {isLoading ? (
            <ListSkeleton rows={5} className="p-4" />
          ) : items.length === 0 ? (
            <EmptyState compact icon={ListX} title="Hàng đợi đang trống" description="Không có giao dịch lỗi nào cần kiểm tra." />
          ) : items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className="w-full text-left p-4 hover:bg-surface-2/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-primary truncate">{item.transactionCode || item.transactionId}</p>
                  <p className="mt-0.5 text-sm text-on-surface">{item.boothCode} <span className="text-on-surface-variant">· {item.storeName}</span></p>
                </div>
                <span className="badge-warning shrink-0">{queueStatusLabels[item.queueStatus]}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span className="badge-error">Mã {item.transactionStatus ?? 'N/A'}</span>
                <span>Phát hiện {formatDate(item.detectedAt)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-surface-2/60 text-xs text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Booth</th>
                <th className="px-4 py-3 text-left font-medium">Cửa hàng</th>
                <th className="px-4 py-3 text-left font-medium">Giao dịch</th>
                <th className="px-4 py-3 text-left font-medium">Mã trạng thái</th>
                <th className="px-4 py-3 text-left font-medium">Phát hiện</th>
                <th className="px-4 py-3 text-left font-medium">Lần cuối</th>
                <th className="px-4 py-3 text-left font-medium">Hàng đợi</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <TableSkeletonRows columns={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState compact icon={ListX} title="Hàng đợi đang trống" description="Không có giao dịch lỗi nào cần kiểm tra." />
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{item.boothCode}</p>
                    <p className="text-xs text-on-surface-variant">{item.boothName}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{item.storeName}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-primary">{item.transactionCode || item.transactionId}</p>
                    <p className="font-mono text-xs text-on-surface-variant break-all">{item.transactionId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-error">
                      {item.transactionStatus ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDate(item.detectedAt)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDate(item.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    <span className="badge-warning">
                      {queueStatusLabels[item.queueStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg bg-primary-subtle text-primary hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Kiểm tra
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant bg-surface-2/60 px-4 py-3 text-sm text-on-surface-variant">
          <span>{totalItems} giao dịch</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageIndex <= 1}
              onClick={() => setPageIndex(prev => Math.max(1, prev - 1))}
              aria-label="Trang trước"
              title="Trang trước"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[72px] text-center text-xs font-medium">Trang {pageIndex}/{totalPages}</span>
            <button
              type="button"
              disabled={pageIndex >= totalPages}
              onClick={() => setPageIndex(prev => Math.min(totalPages, prev + 1))}
              aria-label="Trang sau"
              title="Trang sau"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {selectedItem && form && (
        <div className="modal-overlay items-end sm:items-center p-0 sm:p-4">
          <form onSubmit={handleConvert} className="bg-surface w-full sm:max-w-5xl max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-elevated border border-outline-variant">
            <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-on-surface truncate">{selectedItem.transactionCode || selectedItem.transactionId}</h2>
                <p className="text-sm text-on-surface-variant">{selectedItem.boothCode} · Mã trạng thái {selectedItem.transactionStatus ?? 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="Đóng"
                title="Đóng"
                className="h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 p-5">
              <section className="space-y-3">
                <h3 className="text-[15px] font-semibold text-on-surface">Dữ liệu giao dịch gốc</h3>
                <div className="border border-outline-variant rounded-xl overflow-auto max-h-[420px]">
                  <table className="min-w-[620px] w-full text-xs">
                    <tbody className="divide-y divide-outline-variant">
                      {selectedRows.length === 0 ? (
                        <tr><td className="px-3 py-4 text-sm text-on-surface-variant">Không có dữ liệu gốc.</td></tr>
                      ) : selectedRows.map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-3 py-2 font-medium text-on-surface-variant bg-surface-2/60 w-48">{key}</td>
                          <td className="px-3 py-2 font-mono text-on-surface break-all">{formatCellValue(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[15px] font-semibold text-on-surface">Tạo log lỗi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className={labelClass}>Ngày tiếp nhận</span>
                    <input type="datetime-local" value={form.receivedDate} onChange={e => updateForm('receivedDate', e.target.value)} className={fieldClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Cửa hàng</span>
                    <input value={form.store} onChange={e => updateForm('store', e.target.value)} className={fieldClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Booth</span>
                    <input value={form.booth ?? ''} onChange={e => updateForm('booth', e.target.value)} className={fieldClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Nhóm lỗi</span>
                    <select value={form.errorGroup} onChange={e => updateForm('errorGroup', Number(e.target.value) as ErrorGroup)} className={fieldClass}>
                      {errorGroupOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Luồng xử lý</span>
                    <select value={form.processingFlow} onChange={e => updateForm('processingFlow', Number(e.target.value) as ProcessingFlow)} className={fieldClass}>
                      {processingFlowOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Mức độ</span>
                    <select value={form.severity} onChange={e => updateForm('severity', Number(e.target.value) as Severity)} className={fieldClass}>
                      {severityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Mô tả lỗi</span>
                  <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} className={textareaClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Nguyên nhân sơ bộ</span>
                  <textarea value={form.preliminaryCause ?? ''} onChange={e => updateForm('preliminaryCause', e.target.value)} rows={2} className={textareaClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Cách xử lý</span>
                  <textarea value={form.solution ?? ''} onChange={e => updateForm('solution', e.target.value)} rows={2} className={textareaClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Ghi chú</span>
                  <textarea value={form.note ?? ''} onChange={e => updateForm('note', e.target.value)} rows={2} className={textareaClass} />
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 bg-surface border-t border-outline-variant px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleIgnore(selectedItem)}
                disabled={isSubmitting}
                className="btn-secondary"
              >
                <XCircle className="w-4 h-4" />
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Tạo log lỗi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
