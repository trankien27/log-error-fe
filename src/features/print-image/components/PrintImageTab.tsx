import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalTransactionItem,
  localBoothPrintService,
} from '../../../services/api/localBoothPrintService';
import BoothActionResult from '../../booth-local/BoothActionResult';
import BoothStatusBanner from '../../booth-local/BoothStatusBanner';
import TransactionPickerGrid from '../../booth-local/TransactionPickerGrid';
import {
  BoothActionOutcome,
  getErrorMessage,
  isNotBoothDeviceError,
  useBoothLocal,
} from '../../booth-local/useBoothLocal';
import { getTransactionValue, toNumberOrDefault } from '../../booth-local/transactionValues';

export default function PrintImageTab() {
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

  const [layoutId, setLayoutId] = useState(0);
  const [numberOfImage, setNumberOfImage] = useState(1);
  const [outcome, setOutcome] = useState<BoothActionOutcome | null>(null);

  const applyDefaults = (item?: LocalTransactionItem) => {
    if (!item) return;
    setLayoutId(toNumberOrDefault(getTransactionValue(item, 'LayoutId'), 0));
    setNumberOfImage(toNumberOrDefault(getTransactionValue(item, 'PrintNumber'), 1));
  };

  useEffect(() => {
    loadTransactions(items => applyDefaults(items[0]));
  }, [loadTransactions]);

  // Lenh in goi thang toi app booth local, khong di qua backend/agent.
  const printMutation = useMutation({
    mutationFn: (body: { transactionId: string; layoutId: number; numberOfImage: number }) =>
      localBoothPrintService.printImage(body),
    onSuccess: result => {
      setBoothLocalStatus('available');
      setOutcome({
        ok: true,
        message: `Đã gửi lệnh in tới ${BOOTH_LOCAL_BASE_URL} (HTTP ${result.status}).`,
        raw: result.raw,
      });
      setFormError('');
      toast.success('Đã gửi lệnh in ảnh.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi lệnh in ảnh.');
      if (isNotBoothDeviceError(error)) {
        setBoothLocalStatus('unavailable');
        setBoothError(message);
      }
      setOutcome({ ok: false, message, raw: null });
      setFormError(message);
      toast.error(message);
    },
  });

  const selectTransaction = (item: LocalTransactionItem) => {
    setSelectedTransactionId(item.transactionId);
    applyDefaults(item);
    setFormError('');
    setOutcome(null);
  };

  const handleReload = () => {
    setFormError('');
    void detectBooth();
    loadTransactions(items => applyDefaults(items[0]));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const transactionId = booth.selectedTransactionId.trim();
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

    const ok = await ensureBooth(message => setOutcome({ ok: false, message, raw: null }));
    if (!ok) return;

    printMutation.mutate({ transactionId, layoutId, numberOfImage });
  };

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-outline-variant bg-surface p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">TransactionId (tự lấy từ DB)</label>
              <input
                readOnly
                value={booth.selectedTransactionId}
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

        <TransactionPickerGrid
          title="Chọn ảnh để in"
          transactions={booth.transactions}
          filteredTransactions={booth.filteredTransactions}
          selectedTransactionId={booth.selectedTransactionId}
          onSelect={selectTransaction}
          search={booth.transactionSearch}
          onSearchChange={booth.setTransactionSearch}
          isLoading={booth.isLoadingTransactions}
          boothStatus={boothLocalStatus}
        />

        <BoothActionResult formError={formError} outcome={outcome} />

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
