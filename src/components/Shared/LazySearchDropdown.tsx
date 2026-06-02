import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { LookupItem, PagedResult } from '../../types';

type LazySearchDropdownProps = {
  value: string;
  placeholder: string;
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
        className="w-full px-3 py-2 border rounded-lg bg-white text-left text-sm flex items-center justify-between gap-2 hover:bg-slate-50 focus:outline-[#004ac6]"
      >
        <span className={value ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && onClear && (
            <span
              role="button"
              tabIndex={0}
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
              className="p-0.5 rounded hover:bg-slate-200 text-gray-400 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-outline-variant rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b bg-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-outline-variant rounded-lg bg-white focus:outline-[#004ac6]"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1" onScroll={handleListScroll}>
            {items.length === 0 && !isLoading ? (
              <div className="px-3 py-6 text-center text-xs font-semibold text-gray-400">{emptyText}</div>
            ) : (
              items.map(item => (
                <button
                  key={`${item.id}-${item.code || item.name}`}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer"
                >
                  <span className="block text-xs font-bold text-gray-900 truncate">{getLabel(item)}</span>
                  {item.lastSyncedAt && (
                    <span className="block text-[10px] text-gray-400 mt-0.5">Đồng bộ: {item.lastSyncedAt}</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t p-2 flex items-center justify-between bg-slate-50">
            <span className="text-[10px] text-gray-400">
              Trang {totalPages === 0 ? 0 : pageIndex + 1}/{totalPages}
            </span>
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải
              </span>
            ) : pageIndex + 1 < totalPages ? (
              <span className="text-[10px] font-bold text-[#004ac6]">Cuộn xuống để tải thêm</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
