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
      shifts: current.shifts,
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

  const updateTimeRange = <K extends keyof ShiftAllocationFormItem>(
    shiftId: number,
    field: K,
    value: ShiftAllocationFormItem[K],
  ) => {
    setFormState(current => ({
      ...current,
      shifts: current.shifts.map(item => (
        item.shiftId === shiftId ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addTimeRange = () => {
    setFormState(current => {
      const nextId = Math.max(0, ...current.shifts.map(shift => shift.shiftId)) + 1;

      return {
        ...current,
        shifts: [
          ...current.shifts,
          {
            shiftId: nextId,
            startTime: '09:00',
            endTime: '18:00',
            paidWorkingHours: 9,
            quantity: 0,
          },
        ],
      };
    });
  };

  const removeTimeRange = (shiftId: number) => {
    setFormState(current => ({
      ...current,
      shifts: current.shifts.filter(item => item.shiftId !== shiftId),
    }));
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
    formState.shifts.forEach(shift => {
      if (!shift.startTime || !shift.endTime) errors.push(`Khung ${shift.shiftId} thiếu giờ bắt đầu/kết thúc.`);
      if (shift.endTime <= shift.startTime) errors.push(`Khung ${shift.shiftId} phải có giờ kết thúc lớn hơn giờ bắt đầu.`);
      if (shift.paidWorkingHours <= 0) errors.push(`Khung ${shift.shiftId} phải có số giờ tính công lớn hơn 0.`);
    });
    if (isOverTarget && !formState.allowOverTargetHours) errors.push('Tổng số giờ đã vượt mục tiêu.');
    if (totalShiftCount > availableCapacity) errors.push('Tổng số khung giờ vượt khả năng sắp xếp trong tuần.');
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
      periodType: formState.periodType,
      targetHours: formState.targetHours,
      overwriteExisting: formState.overwriteExisting,
      allowOverTargetHours: formState.allowOverTargetHours,
      allowPartialArrange: formState.allowPartialArrange,
      maxShiftsPerDay: formState.maxShiftsPerDay,
      maxConsecutiveWorkingDays: formState.maxConsecutiveWorkingDays,
      minimumRestHours: formState.minimumRestHours,
      note: formState.note.trim() || null,
      shiftAllocations: [],
      timeRanges: formState.shifts
        .filter(shift => shift.quantity > 0)
        .map(shift => ({
          startTime: shift.startTime.length === 5 ? `${shift.startTime}:00` : shift.startTime,
          endTime: shift.endTime.length === 5 ? `${shift.endTime}:00` : shift.endTime,
          endDayOffset: 0,
          paidWorkingHours: shift.paidWorkingHours,
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
    updateTimeRange,
    addTimeRange,
    removeTimeRange,
    setShiftAllocations,
    clearAllocations,
    getMaxQuantityForShift,
    applyOptions,
    resetForm,
    buildRequest,
  };
}
