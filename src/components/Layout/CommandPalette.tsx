import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { CornerDownLeft, Search } from 'lucide-react';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { getVisibleNavGroups, type NavItem } from './navigation';
import { useNavPermissions } from './useNavPermissions';

type PaletteEntry = NavItem & { groupLabel: string };

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const isOpen = useLayoutStore(state => state.isCommandPaletteOpen);
  const setOpen = useLayoutStore(state => state.setCommandPaletteOpen);
  const permissions = useNavPermissions();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useLayoutStore.getState().isCommandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const all = getVisibleNavGroups(permissions).flatMap(group =>
      group.items.map(item => ({ ...item, groupLabel: group.label })),
    );
    const needle = normalize(query.trim());
    if (!needle) return all;
    return all.filter(entry =>
      normalize(`${entry.label} ${entry.groupLabel} ${entry.keywords ?? ''}`).includes(needle),
    );
  }, [permissions.isAdmin, permissions.canApproveOvertime, permissions.canViewR2Usage, permissions.canViewShifts, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    setOpen(false);
    navigate(entry.path);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, entries.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(entries[activeIndex]);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      width={560}
      style={{ top: 96 }}
      destroyOnHidden
      afterOpenChange={open => open && inputRef.current?.focus()}
      styles={{ container: { padding: 0, overflow: 'hidden', borderRadius: 16 } }}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-outline-variant">
        <Search className="h-5 w-5 text-on-surface-variant shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Tìm trang hoặc chức năng…"
          className="flex-1 bg-transparent text-[15px] text-on-surface placeholder:text-on-surface-variant/70 outline-none"
          aria-label="Tìm kiếm"
        />
        <kbd className="hidden sm:inline-flex rounded-md border border-outline-variant px-1.5 py-0.5 text-[11px] text-on-surface-variant">Esc</kbd>
      </div>

      <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Không tìm thấy kết quả cho “{query}”.</p>
        ) : (
          entries.map((entry, index) => {
            const Icon = entry.icon;
            const isActive = index === activeIndex;
            return (
              <button
                type="button"
                key={entry.path}
                data-index={index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(entry)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 h-11 text-left cursor-pointer ${
                  isActive ? 'bg-primary-subtle' : ''
                }`}
              >
                <span className={`h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-primary text-on-primary' : 'bg-surface-2 text-on-surface-variant'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm truncate ${isActive ? 'text-primary font-semibold' : 'text-on-surface font-medium'}`}>
                    {entry.label}
                  </span>
                </span>
                <span className="text-xs text-on-surface-variant shrink-0">{entry.groupLabel}</span>
                {isActive && <CornerDownLeft className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
