import { type CSSProperties, type Key, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert as UiAlert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert';
import { Badge } from '@/components/ui/shadcn/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Skeleton as UiSkeleton } from '@/components/ui/shadcn/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/shadcn/table';

type Content = { children?: ReactNode; className?: string };
const colors = {
  secondary: 'text-muted-foreground',
  danger: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
};

export const Typography = {
  Text: ({ children, className, strong, type }: Content & { strong?: boolean; type?: keyof typeof colors }) =>
    <span className={cn(type && colors[type], strong && 'font-semibold', className)}>{children}</span>,
  Title: ({ children, className }: Content & { level?: 5 }) => <h3 className={cn('text-base font-semibold', className)}>{children}</h3>,
};

export function Alert({ type, message, description, showIcon }: { type: 'error' | 'warning' | 'info' | 'success'; message: ReactNode; description?: ReactNode; showIcon?: boolean }) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'info' ? Info : AlertTriangle;
  return <UiAlert variant={type === 'error' ? 'destructive' : 'default'} className={cn(type === 'warning' && 'border-warning/30 bg-warning-container text-on-warning-container', type === 'success' && 'border-success/30 bg-success-container text-on-success-container')}>
    {showIcon && <Icon aria-hidden="true" />}
    <AlertTitle>{message}</AlertTitle>
    {description != null && <AlertDescription>{description}</AlertDescription>}
  </UiAlert>;
}

const tagColors = {
  red: 'bg-error-container text-on-error-container',
  gold: 'bg-warning-container text-on-warning-container',
  blue: 'bg-primary-subtle text-primary',
  green: 'bg-success-container text-on-success-container',
};

export function Tag({ color, children, className }: Content & { color?: keyof typeof tagColors }) {
  return <Badge variant="secondary" className={cn(color && tagColors[color], className)}>{children}</Badge>;
}

export function Statistic({ title, value, suffix, precision }: { title: string; value: number; suffix?: string; precision?: number }) {
  return <dl className="rounded-lg border bg-card p-3"><dt className="text-xs text-muted-foreground">{title}</dt><dd className="text-xl font-semibold tabular-nums">{value.toLocaleString('vi', { minimumFractionDigits: precision, maximumFractionDigits: precision })}{suffix}</dd></dl>;
}

export function Collapse({ items }: { items: { key: Key; label: ReactNode; children: ReactNode }[] }) {
  return <div className="space-y-2">{items.map(item => <details key={item.key} className="rounded-lg border bg-card"><summary className="cursor-pointer px-4 py-3 font-medium">{item.label}</summary><div className="border-t p-4">{item.children}</div></details>)}</div>;
}

export function Space({ children, className }: Content & { direction?: 'vertical'; size?: 'large' }) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>;
}

export function Skeleton({ paragraph }: { active?: boolean; paragraph?: { rows: number } }) {
  return <div className="space-y-3" role="status" aria-label="Đang tải">{Array.from({ length: paragraph?.rows ?? 3 }, (_, index) => <UiSkeleton key={index} className="h-5 w-full" />)}</div>;
}

export function Steps({ current, className, items }: { current: number; className?: string; items: { title: string }[] }) {
  return <ol className={cn('flex gap-3', className)}>{items.map((item, index) =>
    <li key={item.title} aria-current={index === current ? 'step' : undefined} className={cn('flex flex-1 items-center gap-2 text-sm', index === current ? 'font-semibold text-primary' : 'text-muted-foreground')}>
      <Badge variant={index <= current ? 'default' : 'outline'}>{index + 1}</Badge>{item.title}
    </li>,
  )}</ol>;
}

export function List<T>({ dataSource, renderItem }: { dataSource: readonly T[]; renderItem: (item: T) => ReactNode; size?: 'small' }) {
  return <ul className="divide-y rounded-md border">{dataSource.map((item, index) => <List.Item key={index}>{renderItem(item)}</List.Item>)}</ul>;
}

List.Item = function ListItem({ children }: Content) {
  return <li className="px-3 py-2 text-sm">{children}</li>;
};

type OverlayProps = Content & {
  open: boolean;
  title: ReactNode;
  width?: string;
  destroyOnClose?: boolean;
  footer?: ReactNode;
  extra?: ReactNode;
  styles?: { body?: CSSProperties };
};

function ScheduleOverlay({ open, title, width, footer, extra, styles, children, onClose, side }: OverlayProps & { onClose: () => void; side?: boolean }) {
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent aria-describedby={undefined} style={{ width, maxWidth: width }} className={cn(
      'flex max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0',
      side && 'inset-y-0 right-0 left-auto h-dvh max-h-dvh translate-x-0 translate-y-0 rounded-none sm:rounded-none',
    )}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>{extra}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-5" style={styles?.body}>{children}</div>
      {footer && <footer className={cn('shrink-0 border-t px-5 py-4', !side && 'flex flex-wrap justify-end gap-2')}>{footer}</footer>}
    </DialogContent>
  </Dialog>;
}

export function Modal({ onCancel, ...props }: OverlayProps & { onCancel: () => void }) {
  return <ScheduleOverlay {...props} onClose={onCancel} />;
}

export function Drawer(props: OverlayProps & { onClose: () => void }) {
  return <ScheduleOverlay {...props} side />;
}

type Column<T> = {
  title: ReactNode;
  key?: Key;
  dataIndex?: keyof T;
  width?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  render?: (value: T[keyof T] | undefined, row: T, index: number) => ReactNode;
};

export type ColumnsType<T> = Column<T>[];

export function Table<T>({ columns, dataSource, rowKey, scroll, summary, className }: {
  columns: ColumnsType<T>;
  dataSource: readonly T[];
  rowKey: keyof T;
  size?: 'small';
  pagination?: false;
  scroll?: { x: number };
  summary?: () => ReactNode;
  className?: string;
}) {
  const cellClass = (column: Column<T>) => cn(
    'whitespace-normal',
    column.align === 'center' && 'text-center',
    column.align === 'right' && 'text-right',
    column.fixed === 'left' && 'sticky left-0 z-10 bg-card',
    column.fixed === 'right' && 'sticky right-0 z-10 bg-card',
  );
  return <div className={cn('rounded-lg border bg-card', className)}>
    <UiTable style={{ minWidth: scroll?.x }}>
      <TableHeader><TableRow>{columns.map((column, index) => <TableHead key={column.key ?? index} className={cellClass(column)} style={{ width: column.width }}>{column.title}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {dataSource.map((row, rowIndex) => <TableRow key={String(row[rowKey])}>{columns.map((column, index) => {
          const value = column.dataIndex === undefined ? undefined : row[column.dataIndex];
          return <TableCell key={column.key ?? index} className={cellClass(column)}>{column.render ? column.render(value, row, rowIndex) : String(value ?? '')}</TableCell>;
        })}</TableRow>)}
        {!dataSource.length && <TableRow><TableCell colSpan={columns.length} className="py-5 text-center text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>}
      </TableBody>
      {summary && <tfoot className="border-t bg-muted/50">{summary()}</tfoot>}
    </UiTable>
  </div>;
}

Table.Summary = Object.assign(
  function Summary({ children }: Content & { fixed?: boolean }) { return <>{children}</>; },
  {
    Row: TableRow,
    Cell: ({ index: _index, align, ...props }: { index: number; align?: 'center'; colSpan?: number; children?: ReactNode }) =>
      <TableCell {...props} className={align === 'center' ? 'text-center' : undefined} />,
  },
);
