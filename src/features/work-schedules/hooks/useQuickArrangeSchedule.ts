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
  targetHours: null,
  overwriteExisting: false,
  allowOverTargetHours: false,
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

  const remainingHours = roundHours((formState.targetHours ?? 0) - allocatedHours);

  const totalShiftCount = useMemo(
    () => formState.shifts.reduce((total, shift) => total + shift.quantity, 0),
    [formState.shifts],
  );

  const smallestShiftHours = formState.shifts.reduce<number | null>((smallest, shift) => {
    if (shift.paidWorkingHours <= 0) return smallest;
    return smallest === null ? shift.paidWorkingHours : Math.min(smallest, shift.paidWorkingHours);
  }, null);
  const targetBasedCapacity = formState.targetHours && smallestShiftHours
    ? Math.ceil(formState.targetHours / smallestShiftHours) + 1
    : 0;
  const availableCapacity = Math.max(
    (options?.availableDayCount ?? 7) * formState.maxShiftsPerDay,
    targetBasedCapacity,
  );
  const isOverTarget = remainingHours < 0;
  const isExactTarget = Boolean(formState.targetHours && remainingHours === 0);

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
      shifts: nextOptions.shifts.map(shift => ({
        shiftId: shift.id,
        code: shift.code,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        paidWorkingHours: shift.paidWorkingHours,
        quantity: current.shifts.find(item => item.shiftId === shift.id)?.quantity ?? 0,
      })),
    }));
  };

  const getMaxQuantityForShift = (currentShift: ShiftAllocationFormItem): number => {
    if (!formState.targetHours || currentShift.paidWorkingHours <= 0) {
      return 0;
    }

    const currentShiftAllocatedHours = currentShift.quantity * currentShift.paidWorkingHours;
    const allocatedHoursWithoutCurrent = allocatedHours - currentShiftAllocatedHours;
    const availableHours = formState.targetHours - allocatedHoursWithoutCurrent;
    const remainingCapacityWithoutCurrent = availableCapacity - (totalShiftCount - currentShift.quantity);
    const capacityMax = Math.max(
      Math.ceil((formState.targetHours || 0) / currentShift.paidWorkingHours) + currentShift.quantity,
      remainingCapacityWithoutCurrent,
      0,
    );

    if (formState.allowOverTargetHours) {
      return capacityMax;
    }

    return Math.max(
      0,
      Math.min(capacityMax, Math.floor(availableHours / currentShift.paidWorkingHours)),
    );
  };

  const updateShiftQuantity = (shiftId: number, quantity: number) => {
    setFormState(current => {
      const shift = current.shifts.find(item => item.shiftId === shiftId);
      if (!shift) return current;

      const sanitizedQuantity = Math.max(0, Math.floor(quantity));
      const allocatedHoursWithoutCurrent = current.shifts.reduce(
        (total, item) => total + (item.shiftId === shiftId ? 0 : item.quantity * item.paidWorkingHours),
        0,
      );
      const totalShiftCountWithoutCurrent = current.shifts.reduce(
        (total, item) => total + (item.shiftId === shiftId ? 0 : item.quantity),
        0,
      );
      const targetBasedCapacity = current.targetHours
        ? Math.ceil(current.targetHours / shift.paidWorkingHours)
        : 0;
      const capacityMax = Math.max(
        0,
        ((options?.availableDayCount ?? 7) * current.maxShiftsPerDay) - totalShiftCountWithoutCurrent,
        targetBasedCapacity,
      );
      const hoursMax = current.allowOverTargetHours || !current.targetHours
        ? capacityMax
        : Math.max(0, Math.floor((current.targetHours - allocatedHoursWithoutCurrent) / shift.paidWorkingHours));
      const maxQuantity = Math.min(capacityMax, hoursMax);

      return {
        ...current,
        shifts: current.shifts.map(item =>
          item.shiftId === shiftId
            ? { ...item, quantity: Math.min(sanitizedQuantity, maxQuantity) }
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
    if (!formState.targetHours || formState.targetHours <= 0) errors.push('Vui lòng nhập số giờ mục tiêu.');
    if (!formState.shifts.some(shift => shift.quantity > 0)) errors.push('Vui lòng nhập số lượng ít nhất một ca.');
    if (isOverTarget && !formState.allowOverTargetHours) errors.push('Tổng số giờ đã vượt mục tiêu.');
    if (totalShiftCount > availableCapacity) errors.push('Tổng số ca vượt khả năng sắp xếp trong tuần.');
    return errors;
  };

  const buildRequest = (): QuickArrangeWorkScheduleRequest => {
    const errors = validate();
    if (errors.length > 0 || !formState.userId || !formState.targetHours) {
      throw new Error(errors[0] || 'Dữ liệu xếp lịch chưa hợp lệ.');
    }

    return {
      userId: formState.userId,
      weekStartDate: getWeekStartDate(formState.selectedDate),
      targetHours: formState.targetHours,
      overwriteExisting: formState.overwriteExisting,
      allowOverTargetHours: formState.allowOverTargetHours,
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
    remainingHours,
    totalShiftCount,
    availableCapacity,
    isOverTarget,
    isExactTarget,
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
