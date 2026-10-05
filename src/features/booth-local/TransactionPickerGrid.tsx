import { useState } from 'react';
import { ImageOff, Images, Search, X } from 'lucide-react';
import { EmptyState, Skeleton } from '../../components/ui';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalTransactionItem,
  localBoothPrintService,
} from '../../services/api/localBoothPrintService';
import { formatCellValue, getTransactionValue } from './transactionValues';
import { BoothLocalStatus } from './useBoothLocal';

type TransactionPickerGridProps = {
  title: string;
  transactions: LocalTransactionItem[];
  filteredTransactions: LocalTransactionItem[];
  selectedTransactionId: string;
  onSelect: (item: LocalTransactionItem) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  boothStatus: BoothLocalStatus;
  // Doi gia tri nay sau khi tao lai anh de ep trinh duyet tai lai preview.
  previewCacheKey?: number;
};

const getTransactionTime = (item: LocalTransactionItem) => formatCellValue(
  getTransactionValue(item, 'RecordAt') ?? getTransactionValue(item, 'CreatedTime'),
);

export default function TransactionPickerGrid({
  title,
  transactions,
  filteredTransactions,
  selectedTransactionId,
  onSelect,
  search,
  onSearchChange,
  isLoading,
  boothStatus,
  previewCacheKey = 0,
}: TransactionPickerGridProps) {
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([]);

  const markPreviewBroken = (transactionId: string) => {
    setBrokenPreviewIds(previous => (
      previous.includes(transactionId) ? previous : [...previous, transactionId]
    ));
  };

  const getSrc = (transactionId: string) => {
    const url = localBoothPrintService.getPreviewImageUrl(transactionId);
    return previewCacheKey ? `${url}?v=${previewCacheKey}` : url;
  };

  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-outline-variant px-4 py-3.5 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant break-all">
            {transactions.length} giao dịch · ảnh xem trước từ {BOOTH_LOCAL_BASE_URL}/api/file/image
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Tìm giao dịch</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Tìm theo code / mã giao dịch…"
            className="w-full h-11 pl-9 pr-10 border border-outline-variant rounded-xl bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Xóa tìm kiếm"
              title="Xóa tìm kiếm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </div>

      <div className="p-3 sm:p-4 max-h-[560px] overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" aria-busy="true" aria-label="Đang tải giao dịch">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="rounded-xl border border-outline-variant overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
                <div className="p-2.5 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Images}
            title={boothStatus === 'unavailable'
              ? 'Máy này không phải booth'
              : transactions.length === 0
                ? 'Chưa có giao dịch nào'
                : 'Không tìm thấy giao dịch'}
            description={boothStatus === 'unavailable'
              ? 'Không có ảnh để hiển thị.'
              : transactions.length === 0
                ? 'Máy này chưa ghi nhận giao dịch nào.'
                : 'Thử từ khóa khác nhé.'}
          />
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
                  onClick={() => onSelect(item)}
                  aria-pressed={selected}
                  className={`text-left rounded-xl border overflow-hidden transition-all cursor-pointer active:scale-[0.98] ${
                    selected
                      ? 'border-primary ring-2 ring-primary/40 bg-primary-subtle'
                      : 'border-outline-variant bg-surface hover:border-primary/50 hover:bg-surface-2/50'
                  }`}
                >
                  <div className="relative aspect-[3/4] bg-surface-2 flex items-center justify-center overflow-hidden">
                    {previewBroken ? (
                      <span className="px-2 text-center text-xs font-medium text-on-surface-variant">
                        <ImageOff className="w-6 h-6 mx-auto mb-1.5" />
                        Chưa có ảnh
                      </span>
                    ) : (
                      <img
                        src={getSrc(item.transactionId)}
                        alt={item.code || item.transactionId}
                        loading="lazy"
                        className="w-full h-full object-contain"
                        onError={() => markPreviewBroken(item.transactionId)}
                      />
                    )}
                    {selected && (
                      <span className="absolute top-2 right-2 rounded-full bg-primary text-on-primary px-2.5 py-1 text-xs font-medium shadow-sm">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <p
                      className="font-mono text-xs font-semibold text-primary truncate"
                      title={item.code || item.transactionId}
                    >
                      {item.code || item.transactionId}
                    </p>
                    <p className="text-xs font-medium text-on-surface">
                      Layout {layoutValue || 'N/A'}
                      {printNumberValue ? ` · ${printNumberValue} ảnh` : ''}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate" title={timeValue}>
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
  );
}
