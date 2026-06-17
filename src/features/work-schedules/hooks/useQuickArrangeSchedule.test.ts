import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useQuickArrangeSchedule } from './useQuickArrangeSchedule';
import { QuickArrangeOptionsResponse } from '../types/quickArrange.types';

const options: QuickArrangeOptionsResponse = {
  user: {
    id: 'user-1',
    name: 'Nguyễn Văn A',
  },
  weekStartDate: '2026-06-15',
  weekEndDate: '2026-06-21',
  existingWorkingHours: 12,
  availableDayCount: 5,
  existingSchedules: [],
  shifts: [
    {
      id: 1,
      code: 'S',
      name: 'Ca sáng',
      startTime: '07:30:00',
      endTime: '13:30:00',
      paidWorkingHours: 6,
      isExtraShift: false,
    },
    {
      id: 2,
      code: 'T',
      name: 'Ca tối',
      startTime: '18:00:00',
      endTime: '23:00:00',
      paidWorkingHours: 5,
      isExtraShift: false,
    },
  ],
};

function setupHook() {
  const hook = renderHook(() => useQuickArrangeSchedule());

  act(() => {
    hook.result.current.updateField('userId', 'user-1');
    hook.result.current.updateField('targetHours', 17);
    hook.result.current.applyOptions(options);
  });

  return hook;
}

describe('useQuickArrangeSchedule', () => {
  it('calculates allocated and remaining hours', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
    });

    expect(hook.result.current.allocatedHours).toBe(12);
    expect(hook.result.current.remainingHours).toBe(5);
  });

  it('calculates max quantity without counting current shift quantity twice', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const currentShift = hook.result.current.formState.shifts[0];
    expect(hook.result.current.getMaxQuantityForShift(currentShift)).toBe(2);
  });

  it('does not allow negative quantity', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, -2);
    });

    expect(hook.result.current.formState.shifts[0].quantity).toBe(0);
  });

  it('does not send shifts with zero quantity', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const request = hook.result.current.buildRequest();
    expect(request.shiftAllocations).toEqual([{ shiftId: 1, quantity: 2 }]);
  });

  it('disables submit validation when no shift quantity is set', () => {
    const hook = setupHook();

    expect(hook.result.current.validationErrors).toContain('Vui lòng nhập số lượng ít nhất một ca.');
  });

  it('blocks submit when target is exceeded and over target is disabled', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 1);
      hook.result.current.updateField('targetHours', 5);
    });

    expect(hook.result.current.validationErrors).toContain('Tổng số giờ đã vượt mục tiêu.');
  });

  it('allows submit when over target is enabled', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateField('targetHours', 5);
      hook.result.current.updateField('allowOverTargetHours', true);
      hook.result.current.updateShiftQuantity(1, 1);
    });

    expect(hook.result.current.validationErrors).not.toContain('Tổng số giờ đã vượt mục tiêu.');
  });

  it('resets modal state', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
      hook.result.current.resetForm();
    });

    expect(hook.result.current.formState.userId).toBeNull();
    expect(hook.result.current.formState.shifts).toEqual([]);
  });
});
