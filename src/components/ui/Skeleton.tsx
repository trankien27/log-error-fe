import React from 'react';

type SkeletonProps = {
  className?: string;
};

/** Shimmering placeholder block; size it with Tailwind classes (h-4 w-32…). */
export function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

type TableSkeletonRowsProps = {
  rows?: number;
  columns: number;
};

/** Skeleton rows to render inside a <tbody> while data loads. */
export function TableSkeletonRows({ rows = 6, columns }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3.5">
              <div className={`skeleton h-4 ${columnIndex === 0 ? 'w-3/4' : columnIndex % 3 === 0 ? 'w-1/3' : 'w-2/3'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

type ListSkeletonProps = {
  rows?: number;
  className?: string;
};

/** Generic list/card placeholder (avatar + two text lines). */
export function ListSkeleton({ rows = 4, className = '' }: ListSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
