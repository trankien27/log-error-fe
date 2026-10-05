import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  /** Compact variant for table cells and small panels. */
  compact?: boolean;
  className?: string;
};

export default function EmptyState({ title, description, icon: Icon = Inbox, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-14 px-6'} ${className}`}>
      <span className={`inline-flex items-center justify-center rounded-full bg-surface-2 text-on-surface-variant ${compact ? 'h-10 w-10 mb-2.5' : 'h-14 w-14 mb-4'}`}>
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </span>
      <p className={`font-medium text-on-surface ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
