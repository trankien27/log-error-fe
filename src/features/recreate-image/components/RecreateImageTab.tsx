import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClipboardList, ImageOff, Loader2, RefreshCw, Search, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ListSkeleton, PageHeader, Skeleton } from '../../../components/ui';
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
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Tạo lại ảnh"
        description="Chọn giao dịch, gắn ảnh vào các ô của layout rồi ghép lại."
        icon={Wand2}
        className="!mb-0"
        actions={
          <button
            type="button"
            onClick={() => {
              setFormError('');
              void detectBooth();
              loadTransactions();
            }}
            disabled={boothLocalStatus === 'checking' || booth.isLoadingTransactions}
            className="btn-secondary h-11 sm:h-10"
          >
            {booth.isLoadingTransactions
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            Tải lại
          </button>
        }
      />

      <BoothStatusBanner
        status={boothLocalStatus}
        boothInfo={booth.boothInfo}
        errorMessage={booth.boothError}
        onRecheck={() => void detectBooth()}
      />

      <div className="card-surface overflow-hidden">
        <div className="border-b border-outline-variant px-4 py-3.5 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-on-surface">Chọn giao dịch</p>
            <p className="text-xs text-on-surface-variant">
              {booth.transactions.length} giao dịch trong database của máy này
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Tìm giao dịch</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              value={booth.transactionSearch}
              onChange={event => booth.setTransactionSearch(event.target.value)}
              placeholder="Tìm theo mã giao dịch / code…"
              className="w-full h-10 sm:h-9 pl-9 pr-9 border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
            {booth.transactionSearch && (
              <button
                type="button"
                onClick={() => booth.setTransactionSearch('')}
                aria-label="Xóa tìm kiếm"
                title="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        <div className="max-h-[260px] overflow-auto">
          {booth.isLoadingTransactions ? (
            <ListSkeleton rows={4} className="p-4" />
          ) : booth.filteredTransactions.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title={boothLocalStatus === 'unavailable'
                ? 'Máy này không phải booth'
                : booth.transactions.length === 0
                  ? 'Chưa có giao dịch nào'
                  : 'Không tìm thấy giao dịch'}
              description={boothLocalStatus === 'unavailable'
                ? 'Không có giao dịch để hiển thị.'
                : booth.transactions.length === 0
                  ? 'Máy này chưa ghi nhận giao dịch nào.'
                  : 'Thử từ khóa khác nhé.'}
            />
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
                      className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 cursor-pointer transition-colors ${
                        selected ? 'bg-primary-subtle' : 'hover:bg-surface-2/50'
                      }`}
                    >
                      <span className={`font-mono text-xs truncate ${selected ? 'font-semibold text-primary' : 'text-on-surface'}`}>
                        {item.transactionId}
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">
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
          <div className="card-surface overflow-hidden flex flex-col">
            <div className="border-b border-outline-variant px-4 py-3.5 sm:px-5">
              <p className="text-[15px] font-semibold text-on-surface">Ảnh của giao dịch</p>
              <p className="text-xs text-on-surface-variant break-all">
                {imagesQuery.data?.length ?? 0} file · Image\{transactionId}
              </p>
            </div>
            <div className="p-3 flex-1 max-h-[520px] overflow-auto">
              {imagesQuery.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-busy="true" aria-label="Đang tải ảnh">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="aspect-square w-full rounded-xl" />
                  ))}
                </div>
              ) : imagesQuery.isError ? (
                <div className="py-12 px-4 text-center text-sm font-medium text-error">
                  {getErrorMessage(imagesQuery.error, 'Không tải được danh sách ảnh.')}
                </div>
              ) : (imagesQuery.data?.length ?? 0) === 0 ? (
                <EmptyState compact icon={ImageOff} title="Chưa có ảnh" description="Thư mục ảnh của giao dịch này đang trống." />
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
                            ? 'border-primary ring-2 ring-primary/40 bg-primary-subtle'
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
                            <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-on-primary text-xs font-semibold inline-flex items-center justify-center">
                              {usedAt + 1}
                            </span>
                          )}
                        </div>
                        <p className="p-2 font-mono text-[11px] text-on-surface-variant truncate" title={fileName}>
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
          <div className="card-surface overflow-hidden flex flex-col">
            <div className="border-b border-outline-variant px-4 py-3.5 sm:px-5">
              <p className="text-[15px] font-semibold text-on-surface">Khung layout</p>
              <p className="text-xs text-on-surface-variant break-all">
                {layout
                  ? `Layout ${layout.id}${layout.code ? ` · ${layout.code}` : ''} · ${layout.width}×${layout.height} · ${filledCount}/${pictures.length} ô`
                  : 'Chưa có thông tin layout'}
                {themeDetailId > 0 ? ` · LayoutTheme\\${themeDetailId}.png` : ''}
              </p>
            </div>
            <div className="p-3 flex-1 overflow-auto">
              {layoutId <= 0 ? (
                <EmptyState compact title="Chưa có layout" description="Giao dịch này chưa có LayoutId nên chưa dựng được khung." />
              ) : layoutQuery.isLoading ? (
                <Skeleton className="mx-auto aspect-[3/2] w-full max-h-[520px] rounded-xl" />
              ) : layoutQuery.isError || !layout ? (
                <div className="py-12 px-4 text-center text-sm font-medium text-error">
                  {getErrorMessage(layoutQuery.error, `Không tải được layout ${layoutId}.`)}
                </div>
              ) : (
                <div
                  className="relative mx-auto w-full max-w-full bg-surface-2 border border-outline-variant rounded-lg overflow-hidden"
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
                            <span className="text-xs font-semibold text-on-surface-variant">{index + 1}</span>
                          )}
                        </button>
                        {fileName && (
                          <button
                            type="button"
                            onClick={() => clearSlot(index)}
                            aria-label={`Bỏ ảnh ô ${index + 1}`}
                            title={`Bỏ ảnh ô ${index + 1}`}
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
              <div className="border-t border-outline-variant px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
                <p className="text-xs text-on-surface-variant">
                  Đang gắn vào ô {activeSlot + 1}/{pictures.length}. Bấm ảnh bên trái để gắn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSlots(pictures.map(() => null));
                    setActiveSlot(0);
                  }}
                  className="h-8 px-3 rounded-lg border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer shrink-0"
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
          <p className="text-sm text-on-surface-variant">
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
            className="btn-primary h-12 sm:h-11 px-6 text-base sm:text-sm"
          >
            {processMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wand2 className="w-4 h-4" />}
            {processMutation.isPending ? 'Đang tạo lại ảnh…' : 'Tạo lại ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
}
