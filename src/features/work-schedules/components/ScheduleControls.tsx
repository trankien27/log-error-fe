import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker as CalendarPicker } from '@/components/ui/DatePicker';
import { Button as UiButton } from '@/components/ui/shadcn/button';
import { Input as UiInput } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { NativeSelect } from '@/components/ui/shadcn/native-select';

type Content = { children?: ReactNode; className?: string };

type ButtonProps = Omit<ComponentProps<typeof UiButton>, 'type' | 'size'> & {
  type?: 'primary' | 'text' | 'default';
  size?: 'small';
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ type, size, danger, loading, icon, disabled, children, ...props }: ButtonProps) {
  return <UiButton {...props} type="button" variant={danger ? 'destructive' : type === 'primary' ? 'default' : type === 'text' ? 'ghost' : 'outline'} size={size === 'small' ? 'sm' : 'default'} disabled={disabled || loading} aria-busy={loading}>
    {loading ? <LoaderCircle className="animate-spin" /> : icon}
    {children}
  </UiButton>;
}

export const Form = {
  Item: ({ label, children, className }: Content & { label: ReactNode }) => (
    <fieldset className={cn('min-w-0 space-y-1.5', className)}>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  ),
};

type Choice = string | number;
type Option<T extends Choice> = { value: T; label: ReactNode; disabled?: boolean };
type SelectionProps<T extends Choice> = {
  options: readonly Option<T>[];
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  showSearch?: boolean;
  optionFilterProp?: 'label';
  maxTagCount?: 'responsive';
  size?: 'small';
  disabled?: boolean;
  style?: ComponentProps<'select'>['style'];
};
type Single<T extends Choice> = { mode?: 'single'; value?: T | null; onChange: (value: T) => void };
type Multiple<T extends Choice> = { mode: 'multiple'; value?: T[]; onChange: (value: T[]) => void };

export function Select<T extends Choice>({ options, placeholder, className, allowClear, showSearch, size, disabled, style, ...selection }: SelectionProps<T> & (Single<T> | Multiple<T>)) {
  const [query, setQuery] = useState('');
  const filter = query.trim().toLocaleLowerCase('vi');
  const visible = options.filter(option => String(option.label).toLocaleLowerCase('vi').includes(filter));
  if (selection.mode === 'multiple') {
    const selected = selection.value ?? [];
    return (
      <details className={cn('rounded-md border bg-surface text-sm', className)}>
        <summary className="cursor-pointer px-3 py-2">
          {selected.length ? `${selected.length} mục đã chọn` : placeholder || 'Chọn mục'}
          {selected.length > 0 && <span className="ml-2 text-xs text-muted-foreground">{options.filter(option => selected.includes(option.value)).map(option => option.label).join(', ')}</span>}
        </summary>
        <div className="space-y-1 border-t p-2">
          {showSearch && <UiInput aria-label="Tìm lựa chọn" placeholder="Tìm…" value={query} onChange={event => setQuery(event.target.value)} />}
          <div className="max-h-48 overflow-auto">
            {visible.map(option => (
              <label key={String(option.value)} className="flex items-center gap-2 px-1 py-1">
                <input type="checkbox" disabled={disabled || option.disabled} checked={selected.includes(option.value)} onChange={event => selection.onChange(event.target.checked ? [...selected, option.value] : selected.filter(value => value !== option.value))} />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </details>
    );
  }
  const optionNodes = options.flatMap((option, index) =>
    visible.includes(option) || option.value === selection.value
      ? [<option key={index} value={index} disabled={option.disabled}>{option.label}</option>]
      : [],
  );
  const index = options.findIndex(option => option.value === selection.value);
  return (
    <div className={cn('min-w-0 space-y-1', className)} style={style}>
      {showSearch && <UiInput aria-label="Tìm lựa chọn" placeholder="Tìm…" value={query} onChange={event => setQuery(event.target.value)} disabled={disabled} />}
      <NativeSelect
        size={size === 'small' ? 'sm' : 'default'}
        className="bg-surface"
        aria-label={placeholder}
        disabled={disabled}
        value={index < 0 ? '' : String(index)}
        onChange={event => {
          const key = event.target.value;
          selection.onChange(key === '' ? undefined : options[Number(key)].value);
        }}
      >
        {(index < 0 || allowClear) && <option value="" disabled={!allowClear}>{placeholder || 'Chọn mục'}</option>}
        {optionNodes}
      </NativeSelect>
    </div>
  );
}

type PickerProps = { value?: Dayjs | null; onChange: (value: Dayjs | null) => void; className?: string; format?: string; allowClear?: boolean; disabled?: boolean };

export function DatePicker({ value, onChange, picker, className, disabled }: PickerProps & { picker?: 'date' | 'month' }) {
  const id = useId();
  if (picker === 'month') {
    return <UiInput type="month" aria-label="Chọn tháng" className={className} disabled={disabled} value={value?.format('YYYY-MM') ?? ''} onChange={event => onChange(event.target.value ? dayjs(`${event.target.value}-01`) : null)} />;
  }
  return <div className={className}><CalendarPicker id={id} label="Chọn ngày" value={value?.format('YYYY-MM-DD') ?? ''} onChange={day => onChange(dayjs(day))} /></div>;
}

export function TimePicker({ value, onChange, minuteStep = 1, ...props }: PickerProps & { minuteStep?: number }) {
  const { format: _format, allowClear: _allowClear, ...inputProps } = props;
  return <UiInput {...inputProps} type="time" step={minuteStep * 60} value={value?.format('HH:mm') ?? ''} onChange={event => onChange(event.target.value ? dayjs(`2000-01-01T${event.target.value}`) : null)} />;
}

type NumberProps = Omit<ComponentProps<typeof UiInput>, 'onChange' | 'value'> & { value?: number | null; onChange: (value: number | null) => void; precision?: number; suffix?: ReactNode };

export function InputNumber({ value, onChange, precision, suffix, ...props }: NumberProps) {
  return <div className="flex items-center gap-2">
    <UiInput {...props} type="number" value={value ?? ''} onChange={event => {
      const number = event.target.valueAsNumber;
      if (!Number.isFinite(number)) { onChange(null); return; }
      const bounded = Math.min(Number(props.max ?? Infinity), Math.max(Number(props.min ?? -Infinity), number));
      onChange(precision === undefined ? bounded : Number(bounded.toFixed(precision)));
    }} />
    {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
  </div>;
}

export const Input = {
  TextArea: ({ showCount, ...props }: ComponentProps<typeof Textarea> & { showCount?: boolean }) => (
    <>
      <Textarea {...props} />
      {showCount && <p className="text-right text-xs text-muted-foreground">{String(props.value ?? '').length}/{props.maxLength}</p>}
    </>
  ),
};

export function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <UiButton type="button" role="switch" aria-checked={checked} aria-label={checked ? 'Đang bật' : 'Đang tắt'} variant={checked ? 'default' : 'outline'} size="sm" onClick={() => onChange(!checked)}>{checked ? 'Bật' : 'Tắt'}</UiButton>;
}
