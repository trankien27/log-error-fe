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
      endDayOffset: 0,
      paidWorkingHours: 6,
      isExtraShift: false,
    },
    {
      id: 2,
      code: 'T',
      name: 'Ca tối',
      startTime: '18:00:00',
      endTime: '23:00:00',
      endDayOffset: 0,
      paidWorkingHours: 5,
      isExtraShift: false,
    },
  ],
};

function setupHook() {
  const hook = renderHook(() => useQuickArrangeSchedule());

  act(() => {
    hook.result.current.updateField('userId', 'user-1');
    hook.result.current.applyOptions(options);
  });

  return hook;
}

describe('useQuickArrangeSchedule', () => {
  it('seeds shift allocations from options', () => {
    const hook = setupHook();

    expect(hook.result.current.options).toEqual(options);
    expect(hook.result.current.formState.selectedDate).toBe('2026-06-15');
    expect(hook.result.current.formState.shifts).toEqual([
      {
        shiftId: 1,
        code: 'S',
        name: 'Ca sáng',
        startTime: '07:30:00',
        endTime: '13:30:00',
        endDayOffset: 0,
        paidWorkingHours: 6,
        quantity: 0,
      },
      {
        shiftId: 2,
        code: 'T',
        name: 'Ca tối',
        startTime: '18:00:00',
        endTime: '23:00:00',
        endDayOffset: 0,
        paidWorkingHours: 5,
        quantity: 0,
      },
    ]);
  });

  it('calculates allocated hours from selected shifts', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
      hook.result.current.updateShiftQuantity(2, 1);
    });

    expect(hook.result.current.allocatedHours).toBe(17);
    expect(hook.result.current.totalShiftCount).toBe(3);
  });

  it('calculates max quantity without counting current shift quantity twice', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const currentShift = hook.result.current.formState.shifts[0];
    expect(hook.result.current.getMaxQuantityForShift(currentShift)).toBe(5);
  });

  it('does not allow negative quantity', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, -2);
    });

    expect(hook.result.current.formState.shifts[0].quantity).toBe(0);
  });

  it('builds request with non-zero shift allocations only', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const request = hook.result.current.buildRequest();
    expect(request.shiftAllocations).toEqual([
      {
        shiftId: 1,
        quantity: 2,
      },
    ]);
    expect('timeRanges' in request).toBe(false);
  });

  it('blocks submit without selected shifts', () => {
    const hook = setupHook();

    expect(hook.result.current.validationErrors).toContain('Vui lòng chọn ít nhất một ca.');
    expect(() => hook.result.current.buildRequest()).toThrow('Vui lòng chọn ít nhất một ca.');
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
