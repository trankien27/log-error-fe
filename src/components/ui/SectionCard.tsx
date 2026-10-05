import React from 'react';
import type { LucideIcon } from 'lucide-react';

type SectionCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Standard content card with an optional header row. */
export default function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
}: SectionCardProps) {
  const hasHeader = Boolean(title || actions);

  return (
    <section className={`card-surface overflow-hidden ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-[15px] font-semibold text-on-surface leading-snug">{title}</h3>}
              {description && <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
