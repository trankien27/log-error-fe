import { useState } from 'react';
import { ImageOff, Images, Loader2, Search, X } from 'lucide-react';
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
    <div className="border border-outline-variant rounded-xl overflow-hidden">
      <div className="bg-surface-2 border-b border-outline-variant px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold text-on-surface">{title}</p>
          <p className="text-[11px] text-on-surface-variant break-all">
            {transactions.length} giao dịch · ảnh preview từ {BOOTH_LOCAL_BASE_URL}/api/file/image
          </p>
        </div>
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Tìm giao dịch</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Tìm theo code / transactionId..."
            className="w-full h-10 sm:h-9 pl-9 pr-9 border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
      </div>

      <div className="p-3 max-h-[520px] overflow-auto">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Đang tải giao dịch từ máy này...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
            <Images className="w-6 h-6 mx-auto mb-2" />
            {boothStatus === 'unavailable'
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
                  onClick={() => onSelect(item)}
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
  );
}
