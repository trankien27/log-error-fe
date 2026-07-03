import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorGroup, ProcessingFlow, Severity, TransactionErrorQueueItem, TransactionErrorQueueStatus } from '../../../types';
import {
  ConvertTransactionErrorQueuePayload,
  transactionErrorQueueService,
} from '../../../services/api/transactionErrorQueueService';

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
      toast.error(error instanceof Error ? error.message : 'Không thể tải queue giao dịch lỗi.');
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
      toast.success('Đã tạo log lỗi từ queue.');
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

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Log Error Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">Giao dịch booth hôm nay có status khác 4, chờ IT kiểm tra và tạo log lỗi.</p>
        </div>
        <button
          type="button"
          onClick={fetchItems}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-outline-variant rounded-xl p-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-gray-500">Trạng thái queue</span>
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value ? Number(event.target.value) as TransactionErrorQueueStatus : '');
              setPageIndex(1);
            }}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value={1}>Đang chờ</option>
            <option value={2}>Đã tạo log</option>
            <option value={3}>Đã bỏ qua</option>
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-bold text-gray-500">Tìm booth</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={boothCode}
              onChange={event => {
                setBoothCode(event.target.value);
                setPageIndex(1);
              }}
              placeholder="Nhập mã booth"
              className="w-full rounded-lg border border-outline-variant pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold text-gray-500">Status transaction</span>
          <input
            value={transactionStatus}
            onChange={event => {
              setTransactionStatus(event.target.value);
              setPageIndex(1);
            }}
            placeholder="VD: 1"
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Booth</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Transaction</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Detected</th>
                <th className="px-4 py-3 text-left">Last seen</th>
                <th className="px-4 py-3 text-left">Queue</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Đang tải queue
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Không có giao dịch lỗi trong queue.</td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{item.boothCode}</p>
                    <p className="text-xs text-gray-500">{item.boothName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.storeName}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-[#004ac6]">{item.transactionCode || item.transactionId}</p>
                    <p className="font-mono text-xs text-gray-500 break-all">{item.transactionId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
                      {item.transactionStatus ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.detectedAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                      {queueStatusLabels[item.queueStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#004ac6] px-3 py-2 text-xs font-bold text-white hover:bg-[#003a99]"
                    >
                      <Eye className="w-4 h-4" />
                      Check
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant px-4 py-3 text-sm text-gray-600">
          <span>{totalItems} giao dịch</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageIndex <= 1}
              onClick={() => setPageIndex(prev => Math.max(1, prev - 1))}
              className="rounded-lg border border-outline-variant px-3 py-1.5 disabled:opacity-50"
            >
              Trước
            </button>
            <span className="font-bold">Trang {pageIndex}/{totalPages}</span>
            <button
              type="button"
              disabled={pageIndex >= totalPages}
              onClick={() => setPageIndex(prev => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-outline-variant px-3 py-1.5 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {selectedItem && form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={handleConvert} className="bg-white w-full sm:max-w-5xl max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-outline-variant p-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedItem.transactionCode || selectedItem.transactionId}</h2>
                <p className="text-xs text-gray-500">{selectedItem.boothCode} · Status {selectedItem.transactionStatus ?? 'N/A'}</p>
              </div>
              <button type="button" onClick={closeDetail} className="h-9 w-9 rounded-lg border border-outline-variant inline-flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 p-4">
              <section className="space-y-3">
                <h3 className="font-bold text-gray-900">Raw transaction</h3>
                <div className="border border-outline-variant rounded-xl overflow-auto max-h-[420px]">
                  <table className="min-w-[620px] w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      {selectedRows.length === 0 ? (
                        <tr><td className="px-3 py-4 text-gray-500">Không có raw values.</td></tr>
                      ) : selectedRows.map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-3 py-2 font-bold text-gray-600 bg-gray-50 w-48">{key}</td>
                          <td className="px-3 py-2 font-mono text-gray-800 break-all">{formatCellValue(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-gray-900">Tạo log lỗi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Ngày tiếp nhận</span>
                    <input type="datetime-local" value={form.receivedDate} onChange={e => updateForm('receivedDate', e.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Cửa hàng</span>
                    <input value={form.store} onChange={e => updateForm('store', e.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Booth</span>
                    <input value={form.booth ?? ''} onChange={e => updateForm('booth', e.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Nhóm lỗi</span>
                    <select value={form.errorGroup} onChange={e => updateForm('errorGroup', Number(e.target.value) as ErrorGroup)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm">
                      {errorGroupOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Luồng xử lý</span>
                    <select value={form.processingFlow} onChange={e => updateForm('processingFlow', Number(e.target.value) as ProcessingFlow)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm">
                      {processingFlowOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-500">Mức độ</span>
                    <select value={form.severity} onChange={e => updateForm('severity', Number(e.target.value) as Severity)} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm">
                      {severityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="space-y-1 block">
                  <span className="text-xs font-bold text-gray-500">Mô tả lỗi</span>
                  <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs font-bold text-gray-500">Nguyên nhân sơ bộ</span>
                  <textarea value={form.preliminaryCause ?? ''} onChange={e => updateForm('preliminaryCause', e.target.value)} rows={2} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs font-bold text-gray-500">Cách xử lý</span>
                  <textarea value={form.solution ?? ''} onChange={e => updateForm('solution', e.target.value)} rows={2} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs font-bold text-gray-500">Ghi chú</span>
                  <textarea value={form.note ?? ''} onChange={e => updateForm('note', e.target.value)} rows={2} className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" />
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-outline-variant p-4 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleIgnore(selectedItem)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" />
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-bold text-white hover:bg-[#003a99] disabled:opacity-60"
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
