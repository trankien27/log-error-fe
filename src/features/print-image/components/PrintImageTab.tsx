import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ImageOff,
  Images,
  Loader2,
  MonitorSmartphone,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalBoothInfo,
  LocalTransactionItem,
  NOT_BOOTH_DEVICE_MESSAGE,
  localBoothPrintService,
} from '../../../services/api/localBoothPrintService';
import {
  formatCellValue,
  getTransactionValue,
  toNumberOrDefault,
} from '../utils/transactionValues';

// Trang thai kiem tra may dang mo trang nay co phai booth khong.
type BoothLocalStatus = 'checking' | 'available' | 'unavailable';

type PrintOutcome = {
  ok: boolean;
  message: string;
  raw: unknown;
};

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

const getTransactionTime = (item: LocalTransactionItem) => formatCellValue(
  getTransactionValue(item, 'RecordAt') ?? getTransactionValue(item, 'CreatedTime'),
);

export default function PrintImageTab() {
  const [boothLocalStatus, setBoothLocalStatus] = useState<BoothLocalStatus>('checking');
  const [boothInfo, setBoothInfo] = useState<LocalBoothInfo | null>(null);
  const [boothError, setBoothError] = useState('');
  const [transactions, setTransactions] = useState<LocalTransactionItem[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [layoutId, setLayoutId] = useState(0);
  const [numberOfImage, setNumberOfImage] = useState(1);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [printOutcome, setPrintOutcome] = useState<PrintOutcome | null>(null);

  // Tai thang file SQLite cua booth (D:\Work\PhotoBooth\Data\Funstudio.db) qua app localhost:8088
  // roi doc bang Transactions bang SQLite WASM. Khong can cai agent, khong can backend.
  const transactionsMutation = useMutation({
    mutationFn: () => localBoothPrintService.getTransactions(),
    onSuccess: items => {
      setTransactions(items);
      setBrokenPreviewIds([]);
      const first = items[0];
      setSelectedTransactionId(first?.transactionId ?? '');
      if (first) {
        setLayoutId(toNumberOrDefault(getTransactionValue(first, 'LayoutId'), 0));
        setNumberOfImage(toNumberOrDefault(getTransactionValue(first, 'PrintNumber'), 1));
      }
      setFormError('');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể tải danh sách giao dịch.');
      if (error instanceof Error && error.name === 'NotBoothDeviceError') {
        setBoothLocalStatus('unavailable');
        setBoothError(message);
      }
      setTransactions([]);
      setSelectedTransactionId('');
      setFormError(message);
      toast.error(message);
    },
  });

  const { mutate: loadTransactions } = transactionsMutation;

  // Nhan dien booth: /api/booth/getbooth cua app local vua xac nhan day la booth,
  // vua tra ve boothCode de hien thi - khong quan tam booth online hay khong.
  const detectBooth = useCallback(async () => {
    setBoothLocalStatus('checking');
    setBoothError('');
    try {
      const info = await localBoothPrintService.getBoothInfo();
      setBoothInfo(info);
      setBoothLocalStatus('available');
      return info;
    } catch (error) {
      const message = getErrorMessage(error, NOT_BOOTH_DEVICE_MESSAGE);
      setBoothInfo(null);
      setBoothLocalStatus('unavailable');
      setBoothError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    void detectBooth();
    loadTransactions();
  }, [detectBooth, loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const keyword = transactionSearch.trim().toLowerCase();
    if (!keyword) return transactions;
    return transactions.filter(item => (
      item.code.toLowerCase().includes(keyword)
      || item.transactionId.toLowerCase().includes(keyword)
    ));
  }, [transactions, transactionSearch]);

  const selectedTransaction = transactions.find(item => item.transactionId === selectedTransactionId);

  // Lenh in goi thang toi app booth local, khong di qua backend/agent.
  const printMutation = useMutation({
    mutationFn: (body: { transactionId: string; layoutId: number; numberOfImage: number }) =>
      localBoothPrintService.printImage(body),
    onSuccess: result => {
      setBoothLocalStatus('available');
      setPrintOutcome({
        ok: true,
        message: `Đã gửi lệnh in tới ${BOOTH_LOCAL_BASE_URL} (HTTP ${result.status}).`,
        raw: result.raw,
      });
      setFormError('');
      toast.success('Đã gửi lệnh in ảnh.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi lệnh in ảnh.');
      if (error instanceof Error && error.name === 'NotBoothDeviceError') {
        setBoothLocalStatus('unavailable');
        setBoothError(message);
      }
      setPrintOutcome({ ok: false, message, raw: null });
      setFormError(message);
      toast.error(message);
    },
  });

  const markPreviewBroken = (transactionId: string) => {
    setBrokenPreviewIds(previous => (
      previous.includes(transactionId) ? previous : [...previous, transactionId]
    ));
  };

  const selectTransaction = (item: LocalTransactionItem) => {
    setSelectedTransactionId(item.transactionId);
    setLayoutId(toNumberOrDefault(getTransactionValue(item, 'LayoutId'), 0));
    setNumberOfImage(toNumberOrDefault(getTransactionValue(item, 'PrintNumber'), 1));
    setFormError('');
    setPrintOutcome(null);
  };

  const handleReload = () => {
    setFormError('');
    void detectBooth();
    loadTransactions();
  };

  const handlePrintSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const transactionId = selectedTransactionId.trim();
    if (!transactionId) {
      setFormError('Vui lòng chọn ảnh cần in.');
      return;
    }

    if (!Number.isFinite(layoutId) || layoutId < 0) {
      setFormError('LayoutId phải lớn hơn hoặc bằng 0.');
      return;
    }

    if (!Number.isFinite(numberOfImage) || numberOfImage <= 0) {
      setFormError('Số ảnh in phải lớn hơn 0.');
      return;
    }

    // Chi in duoc khi trang nay dang mo tren chinh may booth.
    if (boothLocalStatus !== 'available') {
      const info = await detectBooth();
      if (!info) {
        setFormError(NOT_BOOTH_DEVICE_MESSAGE);
        setPrintOutcome({ ok: false, message: NOT_BOOTH_DEVICE_MESSAGE, raw: null });
        toast.error(NOT_BOOTH_DEVICE_MESSAGE);
        return;
      }
    }

    printMutation.mutate({ transactionId, layoutId, numberOfImage });
  };

  const boothBanner = boothLocalStatus === 'available'
    ? {
        className: 'border-success/30 bg-success-container text-on-success-container',
        title: `Thiết bị là booth${boothInfo?.boothCode ? ` · ${boothInfo.boothCode}` : ''}`,
        description: `Đã kết nối app booth tại ${BOOTH_LOCAL_BASE_URL}. Ảnh và lệnh in đều lấy từ chính máy này.`,
      }
    : boothLocalStatus === 'checking'
      ? {
          className: 'border-outline-variant bg-surface-2 text-on-surface-variant',
          title: 'Đang kiểm tra thiết bị...',
          description: `Đang thử kết nối ${BOOTH_LOCAL_BASE_URL}.`,
        }
      : {
          className: 'border-error/30 bg-error-container text-on-error-container',
          title: 'Thiết bị không phải booth',
          description: boothError || `Không gọi được ${BOOTH_LOCAL_BASE_URL}. Hãy mở trang này ngay trên máy booth để in ảnh.`,
        };

  const isBusy = boothLocalStatus === 'checking' || transactionsMutation.isPending;

  return (
    <div className="space-y-5 sm:space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">In ảnh</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Ảnh lấy từ giao dịch của chính máy này, chọn ảnh rồi gửi lệnh in trực tiếp tới booth.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          disabled={isBusy}
          className="h-11 sm:h-10 px-4 border border-outline-variant rounded-lg hover:bg-surface-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Tải lại
        </button>
      </div>

      <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${boothBanner.className}`}>
        {boothLocalStatus === 'checking'
          ? <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          : boothLocalStatus === 'unavailable'
            ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <MonitorSmartphone className="w-4 h-4 shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">{boothBanner.title}</p>
          <p className="text-[11px] font-medium mt-0.5 break-words">{boothBanner.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void detectBooth()}
          disabled={boothLocalStatus === 'checking'}
          className="shrink-0 h-8 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {boothLocalStatus === 'checking'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Kiểm tra
        </button>
      </div>

      <form onSubmit={handlePrintSubmit} className="space-y-5">
        <div className="rounded-xl border border-outline-variant bg-surface p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">TransactionId (tự lấy từ DB)</label>
              <input
                readOnly
                value={selectedTransactionId}
                placeholder="Chọn một ảnh bên dưới"
                className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg bg-surface-2 font-mono text-[11px] text-on-surface-variant"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">LayoutId (tự lấy từ DB)</label>
              <input
                type="number"
                min={0}
                value={layoutId}
                onChange={event => setLayoutId(Number(event.target.value))}
                className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Số ảnh in (numberOfImage) *</label>
              <input
                type="number"
                min={1}
                value={numberOfImage}
                onChange={event => setNumberOfImage(Number(event.target.value))}
                className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="border border-outline-variant rounded-xl overflow-hidden">
          <div className="bg-surface-2 border-b border-outline-variant px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-bold text-on-surface">Chọn ảnh để in</p>
              <p className="text-[11px] text-on-surface-variant break-all">
                {transactions.length} giao dịch · ảnh preview từ {BOOTH_LOCAL_BASE_URL}/api/file/image
              </p>
            </div>
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Tìm giao dịch</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                value={transactionSearch}
                onChange={event => setTransactionSearch(event.target.value)}
                placeholder="Tìm theo code / transactionId..."
                className="w-full h-10 sm:h-9 pl-9 pr-9 border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs font-medium"
              />
              {transactionSearch && (
                <button
                  type="button"
                  onClick={() => setTransactionSearch('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
          </div>

          <div className="p-3 max-h-[520px] overflow-auto">
            {isBusy ? (
              <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Đang tải giao dịch từ máy này...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                <Images className="w-6 h-6 mx-auto mb-2" />
                {boothLocalStatus === 'unavailable'
                  ? 'Thiết bị không phải booth nên không có ảnh để hiển thị.'
                  : transactions.length === 0
                    ? 'Không có giao dịch nào trên máy này.'
                    : 'Không có giao dịch nào khớp từ khóa.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredTransactions.map(item => {
                  const selected = selectedTransactionId === item.transactionId;
                  const previewBroken = brokenPreviewIds.includes(item.transactionId);
                  const layoutValue = formatCellValue(getTransactionValue(item, 'LayoutId'));
                  const printNumberValue = formatCellValue(getTransactionValue(item, 'PrintNumber'));
                  const timeValue = getTransactionTime(item);

                  return (
                    <button
                      type="button"
                      key={item.transactionId}
                      onClick={() => selectTransaction(item)}
                      className={`text-left rounded-xl border overflow-hidden transition-colors cursor-pointer ${
                        selected
                          ? 'border-primary ring-2 ring-primary/40 bg-secondary-container'
                          : 'border-outline-variant bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div className="relative aspect-[3/4] bg-surface-2 flex items-center justify-center overflow-hidden">
                        {previewBroken ? (
                          <span className="px-2 text-center text-[10px] font-bold text-on-surface-variant">
                            <ImageOff className="w-5 h-5 mx-auto mb-1" />
                            Không tải được ảnh
                          </span>
                        ) : (
                          <img
                            src={localBoothPrintService.getPreviewImageUrl(item.transactionId)}
                            alt={item.code || item.transactionId}
                            loading="lazy"
                            className="w-full h-full object-contain"
                            onError={() => markPreviewBroken(item.transactionId)}
                          />
                        )}
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-primary text-on-primary px-2 py-0.5 text-[10px] font-bold">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className="p-2 space-y-0.5">
                        <p
                          className="font-mono text-[10px] font-bold text-primary truncate"
                          title={item.code || item.transactionId}
                        >
                          {item.code || item.transactionId}
                        </p>
                        <p className="text-[10px] font-semibold text-on-surface-variant">
                          Layout {layoutValue || 'N/A'}
                          {printNumberValue ? ` · ${printNumberValue} ảnh` : ''}
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate" title={timeValue}>
                          {timeValue || 'N/A'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {formError && (
          <div className="rounded-lg border border-error/30 bg-error-container p-3 text-xs font-medium text-on-error-container flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {printOutcome && (
          <div
            className={`rounded-xl border p-3 text-xs font-medium flex items-start gap-2 ${
              printOutcome.ok
                ? 'border-success/30 bg-success-container text-on-success-container'
                : 'border-error/30 bg-error-container text-on-error-container'
            }`}
          >
            {printOutcome.ok
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{printOutcome.message}</p>
              {printOutcome.raw !== null && printOutcome.raw !== '' && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words bg-surface border border-outline-variant rounded-lg p-2 text-[11px] text-on-surface">
                  {typeof printOutcome.raw === 'string'
                    ? printOutcome.raw
                    : JSON.stringify(printOutcome.raw, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-surface/95 backdrop-blur border-t border-outline-variant sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none z-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-on-surface-variant">
              {selectedTransaction
                ? `Sẽ in ${numberOfImage} ảnh · layout ${layoutId} · ${selectedTransaction.code || selectedTransaction.transactionId}`
                : 'Chưa chọn ảnh nào.'}
            </p>
            <button
              type="submit"
              disabled={printMutation.isPending || boothLocalStatus === 'checking'}
              className="h-12 sm:h-11 px-6 bg-primary text-white rounded-lg hover:bg-primary-hover active:bg-primary-active shadow-brand font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {printMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Printer className="w-4 h-4" />}
              {printMutation.isPending ? 'Đang gửi lệnh in...' : 'In ảnh'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
