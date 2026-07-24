import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClipboardList, ImageOff, Loader2, RefreshCw, Search, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalTransactionItem,
  ProcessImageListItem,
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
  // slots[i] = ten file gan vao o thu i cua layout
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const storedPayload = useMemo(() => (
    selectedTransaction ? localBoothPrintService.buildProcessImagePayload(selectedTransaction) : null
  ), [selectedTransaction]);

  const transactionId = selectedTransaction?.transactionId ?? '';
  const layoutId = storedPayload?.layoutId ?? 0;
  const themeDetailId = storedPayload?.themeDetailId ?? 0;

  // Tat ca file anh trong D:\Work\PhotoBooth\Image\{transactionId}
  const imagesQuery = useQuery({
    queryKey: ['booth-local', 'transaction-images', transactionId],
    queryFn: () => localBoothPrintService.getTransactionImages(transactionId),
    enabled: Boolean(transactionId),
  });

  // Toa do cac o anh cua layout
  const layoutQuery = useQuery({
    queryKey: ['booth-local', 'layout', layoutId],
    queryFn: () => localBoothPrintService.getLayout(layoutId),
    enabled: layoutId > 0,
  });

  const layout = layoutQuery.data ?? null;
  const pictures = layout?.pictures ?? [];

  // Doi giao dich / doi layout: dung lai thu tu anh da luu trong cot Images neu co.
  useEffect(() => {
    if (!layout) {
      setSlots([]);
      setActiveSlot(0);
      return;
    }

    const stored = storedPayload?.listImages ?? [];
    setSlots(pictures.map((_, index) => stored[index]?.fileName ?? null));
    setActiveSlot(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, transactionId]);

  const assignImage = (fileName: string) => {
    if (pictures.length === 0) return;

    const targetIndex = activeSlot >= 0 && activeSlot < slots.length
      ? activeSlot
      : slots.findIndex(slot => !slot);
    if (targetIndex < 0) return;

    const next = [...slots];
    next[targetIndex] = fileName;
    setSlots(next);

    // Tu nhay sang o trong tiep theo cho de thao tac lien tuc
    const emptyIndex = next.findIndex(slot => !slot);
    setActiveSlot(emptyIndex >= 0 ? emptyIndex : targetIndex);

    setFormError('');
    setOutcome(null);
  };

  const clearSlot = (index: number) => {
    setSlots(current => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    setActiveSlot(index);
  };

  // listImages gui di = anh dang gan trong cac o, giu nguyen metadata cu neu trung ten file.
  const selectedListImages: ProcessImageListItem[] = useMemo(() => {
    const stored = storedPayload?.listImages ?? [];
    return slots
      .filter((fileName): fileName is string => Boolean(fileName))
      .map(fileName => {
        const previous = stored.find(entry => entry.fileName === fileName);
        return previous ?? {
          fileName,
          rotate: 0,
          flip: null,
          isDigitalBackground: false,
          digitalBackgroundId: 0,
        };
      });
  }, [slots, storedPayload]);

  const processMutation = useMutation({
    mutationFn: (item: LocalTransactionItem) =>
      localBoothPrintService.processImage(
        localBoothPrintService.buildProcessImagePayload(item, selectedListImages),
      ),
    onSuccess: result => {
      setBoothLocalStatus('available');
      setOutcome({
        ok: true,
        message: `Đã tạo lại ảnh tại ${BOOTH_LOCAL_BASE_URL} (HTTP ${result.status}).`,
        raw: result.raw,
      });
      setFormError('');
      void imagesQuery.refetch();
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

  const filledCount = slots.filter(Boolean).length;

  return (
    <div className="space-y-5 sm:space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Tạo lại ảnh</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Chọn TransactionId, gắn ảnh vào các ô của layout rồi ghép lại. Thông số lấy nguyên trong database của máy này.
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

        <div className="max-h-[260px] overflow-auto">
          {booth.isLoadingTransactions ? (
            <div className="py-10 text-center text-xs font-bold text-on-surface-variant">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Đang tải giao dịch từ máy này...
            </div>
          ) : booth.filteredTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-on-surface-variant">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ben trai: tat ca anh trong thu muc Image\{transactionId} */}
          <div className="border border-outline-variant rounded-xl overflow-hidden flex flex-col">
            <div className="bg-surface-2 border-b border-outline-variant px-4 py-3">
              <p className="font-bold text-on-surface">Ảnh của giao dịch</p>
              <p className="text-[11px] text-on-surface-variant break-all">
                {imagesQuery.data?.length ?? 0} file · Image\{transactionId}
              </p>
            </div>
            <div className="p-3 flex-1 max-h-[520px] overflow-auto">
              {imagesQuery.isLoading ? (
                <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Đang tải ảnh...
                </div>
              ) : imagesQuery.isError ? (
                <div className="py-12 text-center text-xs font-bold text-error">
                  {getErrorMessage(imagesQuery.error, 'Không tải được danh sách ảnh.')}
                </div>
              ) : (imagesQuery.data?.length ?? 0) === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                  <ImageOff className="w-6 h-6 mx-auto mb-2" />
                  Thư mục ảnh của giao dịch này đang trống.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(imagesQuery.data ?? []).map(fileName => {
                    const usedAt = slots.indexOf(fileName);
                    return (
                      <button
                        type="button"
                        key={fileName}
                        onClick={() => assignImage(fileName)}
                        // Anh da gan vao mot o thi khong cho chon lai
                        disabled={pictures.length === 0 || usedAt >= 0}
                        className={`text-left rounded-xl border overflow-hidden transition-colors disabled:cursor-not-allowed ${
                          usedAt >= 0
                            ? 'border-primary ring-2 ring-primary/40 bg-secondary-container'
                            : 'border-outline-variant bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-60'
                        }`}
                      >
                        <div className="relative aspect-square bg-surface-2 flex items-center justify-center overflow-hidden">
                          <img
                            src={localBoothPrintService.getImageUrl(transactionId, fileName)}
                            alt={fileName}
                            loading="lazy"
                            className={`w-full h-full object-contain ${usedAt >= 0 ? 'opacity-45' : ''}`}
                          />
                          {usedAt >= 0 && (
                            <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-on-primary text-[11px] font-bold inline-flex items-center justify-center">
                              {usedAt + 1}
                            </span>
                          )}
                        </div>
                        <p className="p-2 font-mono text-[10px] text-on-surface-variant truncate" title={fileName}>
                          {fileName}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ben phai: layout theme + cac o anh dat theo toa do cua layout */}
          <div className="border border-outline-variant rounded-xl overflow-hidden flex flex-col">
            <div className="bg-surface-2 border-b border-outline-variant px-4 py-3">
              <p className="font-bold text-on-surface">Layout theme</p>
              <p className="text-[11px] text-on-surface-variant break-all">
                {layout
                  ? `Layout ${layout.id}${layout.code ? ` · ${layout.code}` : ''} · ${layout.width}×${layout.height} · ${filledCount}/${pictures.length} ô`
                  : 'Chưa có thông tin layout'}
                {themeDetailId > 0 ? ` · LayoutTheme\\${themeDetailId}.png` : ''}
              </p>
            </div>
            <div className="p-3 flex-1 overflow-auto">
              {layoutId <= 0 ? (
                <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                  Giao dịch này chưa có LayoutId nên không dựng được khung layout.
                </div>
              ) : layoutQuery.isLoading ? (
                <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Đang tải layout {layoutId}...
                </div>
              ) : layoutQuery.isError || !layout ? (
                <div className="py-12 text-center text-xs font-bold text-error">
                  {getErrorMessage(layoutQuery.error, `Không tải được layout ${layoutId}.`)}
                </div>
              ) : (
                <div
                  className="relative mx-auto w-full max-w-full bg-surface-2 border border-outline-variant overflow-hidden"
                  style={{ aspectRatio: `${layout.width} / ${layout.height}`, maxHeight: '520px' }}
                >
                  {themeDetailId > 0 && (
                    <img
                      src={localBoothPrintService.getLayoutThemeUrl(themeDetailId)}
                      alt={`LayoutTheme ${themeDetailId}`}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                    />
                  )}

                  {pictures.map((picture, index) => {
                    const fileName = slots[index];
                    const isActive = activeSlot === index;
                    return (
                      <div
                        key={picture.id || index}
                        className="absolute"
                        style={{
                          left: `${(picture.x / layout.width) * 100}%`,
                          top: `${(picture.y / layout.height) * 100}%`,
                          width: `${(picture.width / layout.width) * 100}%`,
                          height: `${(picture.height / layout.height) * 100}%`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveSlot(index)}
                          className={`w-full h-full overflow-hidden cursor-pointer transition-all inline-flex items-center justify-center ${
                            isActive
                              ? 'outline outline-2 outline-primary'
                              : 'outline outline-1 outline-outline-variant hover:outline-primary/60'
                          } ${fileName ? '' : 'bg-surface/70'}`}
                        >
                          {fileName ? (
                            <img
                              src={localBoothPrintService.getImageUrl(transactionId, fileName)}
                              alt={fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[11px] font-bold text-on-surface-variant">{index + 1}</span>
                          )}
                        </button>
                        {fileName && (
                          <button
                            type="button"
                            onClick={() => clearSlot(index)}
                            aria-label={`Bỏ ảnh ô ${index + 1}`}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-surface/90 border border-outline-variant text-on-surface-variant hover:text-error inline-flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {pictures.length > 0 && (
              <div className="border-t border-outline-variant px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-on-surface-variant">
                  Đang gắn vào ô {activeSlot + 1}/{pictures.length}. Bấm ảnh bên trái để gắn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSlots(pictures.map(() => null));
                    setActiveSlot(0);
                  }}
                  className="h-8 px-3 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface-variant hover:bg-surface-2 cursor-pointer"
                >
                  Xóa hết ô
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BoothActionResult formError={formError} outcome={outcome} />

      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-surface/95 backdrop-blur border-t border-outline-variant sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none z-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-on-surface-variant">
            {selectedTransaction
              ? `Sẽ tạo lại ảnh cho ${selectedTransaction.transactionId} với ${selectedListImages.length} ảnh đã chọn.`
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
