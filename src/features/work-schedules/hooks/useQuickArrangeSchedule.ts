import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  QuickArrangeFormState,
  QuickArrangeOptionsResponse,
  QuickArrangeWorkScheduleRequest,
  ShiftAllocationFormItem,
} from '../types/quickArrange.types';
import { getWeekStartDate } from '../utils/week.utils';

export const initialQuickArrangeState: QuickArrangeFormState = {
  userId: null,
  selectedDate: dayjs().format('YYYY-MM-DD'),
  periodType: 'week',
  overwriteExisting: false,
  allowPartialArrange: false,
  maxShiftsPerDay: 1,
  maxConsecutiveWorkingDays: 6,
  minimumRestHours: 10,
  note: '',
  shifts: [],
};

export function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

type FieldValue<K extends keyof QuickArrangeFormState> = QuickArrangeFormState[K];

export function useQuickArrangeSchedule() {
  const [formState, setFormState] = useState<QuickArrangeFormState>(initialQuickArrangeState);
  const [options, setOptions] = useState<QuickArrangeOptionsResponse | null>(null);

  const allocatedHours = useMemo(
    () =>
      roundHours(
        formState.shifts.reduce(
          (total, shift) => total + shift.quantity * shift.paidWorkingHours,
          0,
        ),
      ),
    [formState.shifts],
  );

  const totalShiftCount = useMemo(
    () => formState.shifts.reduce((total, shift) => total + shift.quantity, 0),
    [formState.shifts],
  );

  const availableCapacity = Math.max(
    (options?.availableDayCount ?? 7) * formState.maxShiftsPerDay,
    0,
  );

  const updateField = <K extends keyof QuickArrangeFormState>(field: K, value: FieldValue<K>) => {
    setFormState(current => ({
      ...current,
      [field]: value,
    }));
  };

  const applyOptions = (nextOptions: QuickArrangeOptionsResponse) => {
    setOptions(nextOptions);
    setFormState(current => ({
      ...current,
      selectedDate: nextOptions.weekStartDate,
      shifts: nextOptions.shifts.map(shift => {
        const currentShift = current.shifts.find(item => item.shiftId === shift.id);

        return {
          shiftId: shift.id,
          code: shift.code,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          endDayOffset: shift.endDayOffset,
          paidWorkingHours: shift.paidWorkingHours,
          quantity: currentShift?.quantity ?? 0,
        };
      }),
    }));
  };

  const getMaxQuantityForShift = (currentShift: ShiftAllocationFormItem): number => {
    const remainingCapacityWithoutCurrent = availableCapacity - (totalShiftCount - currentShift.quantity);
    return Math.max(0, remainingCapacityWithoutCurrent);
  };

  const updateShiftQuantity = (shiftId: number, quantity: number) => {
    setFormState(current => {
      const shift = current.shifts.find(item => item.shiftId === shiftId);
      if (!shift) return current;

      const sanitizedQuantity = Math.max(0, Math.floor(quantity));
      const totalShiftCountWithoutCurrent = current.shifts.reduce(
        (total, item) => total + (item.shiftId === shiftId ? 0 : item.quantity),
        0,
      );
      const capacityMax = Math.max(
        0,
        ((options?.availableDayCount ?? 7) * current.maxShiftsPerDay) - totalShiftCountWithoutCurrent,
      );

      return {
        ...current,
        shifts: current.shifts.map(item =>
          item.shiftId === shiftId
            ? { ...item, quantity: Math.min(sanitizedQuantity, capacityMax) }
            : item,
        ),
      };
    });
  };

  const setShiftAllocations = (allocations: Record<number, number>) => {
    setFormState(current => ({
      ...current,
      shifts: current.shifts.map(shift => ({
        ...shift,
        quantity: Math.max(0, Math.floor(allocations[shift.shiftId] ?? 0)),
      })),
    }));
  };

  const clearAllocations = () => {
    setFormState(current => ({
      ...current,
      shifts: current.shifts.map(shift => ({ ...shift, quantity: 0 })),
    }));
  };

  const resetForm = () => {
    setFormState(initialQuickArrangeState);
    setOptions(null);
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!formState.userId) errors.push('Vui lòng chọn nhân viên.');
    if (!formState.selectedDate) errors.push('Vui lòng chọn tuần làm việc.');
    if (totalShiftCount <= 0) errors.push('Vui lòng chọn ít nhất một ca.');
    if (totalShiftCount > availableCapacity) errors.push('Tổng số khung giờ vượt khả năng sắp xếp trong tuần.');
    return errors;
  };

  const buildRequest = (): QuickArrangeWorkScheduleRequest => {
    const errors = validate();
    if (errors.length > 0 || !formState.userId) {
      throw new Error(errors[0] || 'Dữ liệu xếp lịch chưa hợp lệ.');
    }

    return {
      userId: formState.userId,
      weekStartDate: getWeekStartDate(formState.selectedDate),
      periodType: formState.periodType,
      overwriteExisting: formState.overwriteExisting,
      allowPartialArrange: formState.allowPartialArrange,
      maxShiftsPerDay: formState.maxShiftsPerDay,
      maxConsecutiveWorkingDays: formState.maxConsecutiveWorkingDays,
      minimumRestHours: formState.minimumRestHours,
      note: formState.note.trim() || null,
      shiftAllocations: formState.shifts
        .filter(shift => shift.quantity > 0)
        .map(shift => ({
          shiftId: shift.shiftId,
          quantity: shift.quantity,
        })),
    };
  };

  return {
    formState,
    options,
    allocatedHours,
    remainingHours: 0,
    totalShiftCount,
    availableCapacity,
    isOverTarget: false,
    isExactTarget: false,
    validationErrors: validate(),
    updateField,
    updateShiftQuantity,
    setShiftAllocations,
    clearAllocations,
    getMaxQuantityForShift,
    applyOptions,
    resetForm,
    buildRequest,
  };
}
