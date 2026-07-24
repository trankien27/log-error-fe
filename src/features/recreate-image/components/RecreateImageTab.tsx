import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ClipboardList, Loader2, RefreshCw, Search, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalTransactionItem,
  localBoothPrintService,
} from '../../../services/api/localBoothPrintService';
import BoothActionResult from '../../booth-local/BoothActionResult';
import BoothStatusBanner from '../../booth-local/BoothStatusBanner';
import {
  BoothActionOutcome,
  getErrorMessage,
  isNotBoothDeviceError,
  useBoothLocal,
} from '../../booth-local/useBoothLocal';
import { formatCellValue, getTransactionValue } from '../../booth-local/transactionValues';

const getCreatedTime = (item: LocalTransactionItem) => formatCellValue(
  getTransactionValue(item, 'CreatedTime') ?? getTransactionValue(item, 'RecordAt'),
);

export default function RecreateImageTab() {
  const booth = useBoothLocal();
  const {
    boothLocalStatus,
    setBoothLocalStatus,
    setBoothError,
    detectBooth,
    ensureBooth,
    loadTransactions,
    selectedTransaction,
    setSelectedTransactionId,
    formError,
    setFormError,
  } = booth;

  const [outcome, setOutcome] = useState<BoothActionOutcome | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Payload dung nguyen tu dong Transactions; listImages lay tu cot Images.
  const payload = useMemo(() => (
    selectedTransaction ? localBoothPrintService.buildProcessImagePayload(selectedTransaction) : null
  ), [selectedTransaction]);

  const listImages = payload?.listImages ?? [];

  const processMutation = useMutation({
    mutationFn: (item: LocalTransactionItem) =>
      localBoothPrintService.processImage(localBoothPrintService.buildProcessImagePayload(item)),
    onSuccess: result => {
      setBoothLocalStatus('available');
      setOutcome({
        ok: true,
        message: `Đã tạo lại ảnh tại ${BOOTH_LOCAL_BASE_URL} (HTTP ${result.status}).`,
        raw: result.raw,
      });
      setFormError('');
      toast.success('Đã tạo lại ảnh xong.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể tạo lại ảnh.');
      if (isNotBoothDeviceError(error)) {
        setBoothLocalStatus('unavailable');
        setBoothError(message);
      }
      setOutcome({ ok: false, message, raw: null });
      setFormError(message);
      toast.error(message);
    },
  });

  const handleRecreate = async () => {
    if (!selectedTransaction) {
      setFormError('Vui lòng chọn giao dịch cần tạo lại ảnh.');
      return;
    }

    const ok = await ensureBooth(message => setOutcome({ ok: false, message, raw: null }));
    if (!ok) return;

    processMutation.mutate(selectedTransaction);
  };

  return (
    <div className="space-y-5 sm:space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Tạo lại ảnh</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Chọn TransactionId rồi ghép lại ảnh từ các file gốc. Mọi thông số lấy nguyên trong database của máy này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError('');
            void detectBooth();
            loadTransactions();
          }}
          disabled={boothLocalStatus === 'checking' || booth.isLoadingTransactions}
          className="h-11 sm:h-10 px-4 border border-outline-variant rounded-lg hover:bg-surface-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {booth.isLoadingTransactions
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          Tải lại
        </button>
      </div>

      <BoothStatusBanner
        status={boothLocalStatus}
        boothInfo={booth.boothInfo}
        errorMessage={booth.boothError}
        onRecheck={() => void detectBooth()}
      />

      <div className="border border-outline-variant rounded-xl overflow-hidden">
        <div className="bg-surface-2 border-b border-outline-variant px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-bold text-on-surface">Chọn TransactionId</p>
            <p className="text-[11px] text-on-surface-variant">
              {booth.transactions.length} giao dịch trong database của máy này
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Tìm giao dịch</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              value={booth.transactionSearch}
              onChange={event => booth.setTransactionSearch(event.target.value)}
              placeholder="Tìm theo TransactionId / code..."
              className="w-full h-10 sm:h-9 pl-9 pr-9 border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs font-medium"
            />
            {booth.transactionSearch && (
              <button
                type="button"
                onClick={() => booth.setTransactionSearch('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        <div className="max-h-[460px] overflow-auto">
          {booth.isLoadingTransactions ? (
            <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Đang tải giao dịch từ máy này...
            </div>
          ) : booth.filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
              <ClipboardList className="w-6 h-6 mx-auto mb-2" />
              {boothLocalStatus === 'unavailable'
                ? 'Thiết bị không phải booth nên không có giao dịch để hiển thị.'
                : booth.transactions.length === 0
                  ? 'Không có giao dịch nào trên máy này.'
                  : 'Không có giao dịch nào khớp từ khóa.'}
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {booth.filteredTransactions.map(item => {
                const selected = booth.selectedTransactionId === item.transactionId;
                return (
                  <li key={item.transactionId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransactionId(item.transactionId);
                        setFormError('');
                        setOutcome(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 cursor-pointer transition-colors ${
                        selected ? 'bg-secondary-container' : 'hover:bg-surface-2'
                      }`}
                    >
                      <span className={`font-mono text-xs truncate ${selected ? 'font-bold text-primary' : 'text-on-surface'}`}>
                        {item.transactionId}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-on-surface-variant">
                        {getCreatedTime(item) || 'N/A'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <div className="border border-outline-variant rounded-xl overflow-hidden">
          <div className="bg-surface-2 border-b border-outline-variant px-4 py-3">
            <p className="font-bold text-on-surface">Giao dịch đang chọn</p>
          </div>
          <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <dt className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Id</dt>
              <dd className="mt-1 font-mono text-xs font-bold text-on-surface break-all">
                {selectedTransaction.transactionId}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">CreatedTime</dt>
              <dd className="mt-1 text-xs font-bold text-on-surface">
                {getCreatedTime(selectedTransaction) || 'N/A'}
              </dd>
            </div>
          </dl>
          <div className="border-t border-outline-variant px-4 py-3">
            <p className="text-[11px] font-semibold text-on-surface-variant">
              {listImages.length > 0
                ? `${listImages.length} ảnh gốc trong cột Images sẽ được ghép lại.`
                : 'Cột Images của giao dịch này đang trống nên listImages gửi đi sẽ rỗng.'}
            </p>
          </div>
        </div>
      )}

      <BoothActionResult formError={formError} outcome={outcome} />

      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-surface/95 backdrop-blur border-t border-outline-variant sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none z-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-on-surface-variant">
            {selectedTransaction
              ? `Sẽ tạo lại ảnh cho ${selectedTransaction.transactionId} từ ${listImages.length} ảnh gốc.`
              : 'Chưa chọn giao dịch nào.'}
          </p>
          <button
            type="button"
            onClick={() => void handleRecreate()}
            disabled={
              processMutation.isPending
              || boothLocalStatus === 'checking'
              || !selectedTransaction
            }
            className="h-12 sm:h-11 px-6 bg-primary text-white rounded-lg hover:bg-primary-hover active:bg-primary-active shadow-brand font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wand2 className="w-4 h-4" />}
            {processMutation.isPending ? 'Đang tạo lại ảnh...' : 'Tạo lại ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
}
