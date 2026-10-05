import React from 'react';
import { RotateCcw } from 'lucide-react';

type FilterBarProps = {
  children: React.ReactNode;
  /** Shows a "Xóa bộ lọc" button when provided. */
  onReset?: () => void;
  /** Right-aligned extra actions (export, create…). */
  actions?: React.ReactNode;
  className?: string;
};

/** Horizontal toolbar for search inputs and filters; wraps on small screens. */
export default function FilterBar({ children, onReset, actions, className = '' }: FilterBarProps) {
  return (
    <div className={`mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {children}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
