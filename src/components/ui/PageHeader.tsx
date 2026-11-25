import React from 'react';
import type { LucideIcon } from 'lucide-react';

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Primary actions, rendered on the right (wraps below on mobile). */
  actions?: React.ReactNode;
  /** Optional content under the title row, e.g. tabs or a segmented control. */
  children?: React.ReactNode;
  className?: string;
};

export default function PageHeader({ title, description, icon: Icon, actions, children, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-5 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground sm:inline-flex">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
