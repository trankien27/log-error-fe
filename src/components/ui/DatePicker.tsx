import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Button } from './shadcn/button';
import { Calendar } from './shadcn/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover';

type DatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function DatePicker({ id, label, value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = parseISO(value);
  const selected = isValid(date) ? date : undefined;
  const display = selected ? format(selected, 'dd/MM/yyyy') : 'Chọn ngày';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-label={`${label}: ${display}`} className="mt-2 h-10 w-full justify-between bg-surface text-on-surface">
          {display}
          <CalendarDays />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[90] w-auto p-0">
        <Calendar
          autoFocus
          locale={vi}
          mode="single"
          required
          defaultMonth={selected}
          selected={selected}
          onSelect={day => {
            onChange(format(day, 'yyyy-MM-dd'));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
