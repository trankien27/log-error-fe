import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { LookupItem, PagedResult } from '../../types';

type LazySearchDropdownProps = {
  value: string;
  placeholder: string;
  ariaLabel?: string;
  emptyText?: string;
  onSelect: (item: LookupItem) => void;
  loadOptions: (query: { search: string; pageIndex: number; pageSize: number }) => Promise<PagedResult<LookupItem>>;
  pageSize?: number;
  onClear?: () => void;
};

function getLabel(item: LookupItem) {
  return item.code ? `${item.code} - ${item.name}` : item.name;
}

export default function LazySearchDropdown({
  value,
  placeholder,
  ariaLabel,
  emptyText = 'Không tìm thấy dữ liệu.',
  onSelect,
  loadOptions,
  pageSize = 10,
  onClear,
}: LazySearchDropdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await loadOptions({ search, pageIndex: 0, pageSize });
        setItems(result.items);
        setPageIndex(result.pageIndex);
        setTotalPages(result.totalPages);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isOpen, search, pageSize, loadOptions]);

  const handleLoadMore = async () => {
    if (isLoading || pageIndex + 1 >= totalPages) return;

    const nextPage = pageIndex + 1;
    setIsLoading(true);
    try {
      const result = await loadOptions({ search, pageIndex: nextPage, pageSize });
      setItems(prev => [...prev, ...result.items]);
      setPageIndex(result.pageIndex);
      setTotalPages(result.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom < 24) {
      handleLoadMore();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-left text-sm flex items-center justify-between gap-2 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
      >
        <span className={value ? 'text-on-surface truncate' : 'text-on-surface-variant truncate'}>{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && onClear && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Xóa ${ariaLabel || placeholder}`}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear();
                }
              }}
              className="p-0.5 rounded hover:bg-surface-2 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-on-surface-variant" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[60] left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-elevated overflow-hidden">
          <div className="p-2 border-b border-outline-variant bg-surface-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
              <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-on-surface-variant"
              aria-label={`Tìm trong ${ariaLabel || placeholder}`}
            />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1" onScroll={handleListScroll}>
            {items.length === 0 && !isLoading ? (
              <div className="px-3 py-6 text-center text-xs font-semibold text-on-surface-variant">{emptyText}</div>
            ) : (
              items.map(item => (
                <button
                  key={`${item.id}-${item.code || item.name}`}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 cursor-pointer"
                >
                  <span className="block text-xs font-bold text-on-surface truncate">{getLabel(item)}</span>
                  {item.lastSyncedAt && (
                    <span className="block text-[10px] text-on-surface-variant mt-0.5">Đồng bộ: {item.lastSyncedAt}</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-outline-variant p-2 flex items-center justify-between bg-surface-2">
            <span className="text-[10px] text-on-surface-variant">
              Trang {totalPages === 0 ? 0 : pageIndex + 1}/{totalPages}
            </span>
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải
              </span>
            ) : pageIndex + 1 < totalPages ? (
              <span className="text-[10px] font-bold text-primary">Cuộn xuống để tải thêm</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
