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
  it('keeps options without seeding legacy shift allocations', () => {
    const hook = setupHook();

    expect(hook.result.current.options).toEqual(options);
    expect(hook.result.current.formState.selectedDate).toBe('2026-06-15');
    expect(hook.result.current.formState.shifts).toEqual([]);
  });

  it('calculates allocated and remaining hours from custom time ranges', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
      hook.result.current.updateTimeRange(1, 'paidWorkingHours', 6);
      hook.result.current.updateShiftQuantity(1, 2);
    });

    expect(hook.result.current.allocatedHours).toBe(12);
    expect(hook.result.current.remainingHours).toBe(5);
  });

  it('calculates max quantity without counting current range quantity twice', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
      hook.result.current.updateTimeRange(1, 'paidWorkingHours', 6);
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const currentShift = hook.result.current.formState.shifts[0];
    expect(hook.result.current.getMaxQuantityForShift(currentShift)).toBe(2);
  });

  it('does not allow negative quantity', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
      hook.result.current.updateShiftQuantity(1, -2);
    });

    expect(hook.result.current.formState.shifts[0].quantity).toBe(0);
  });

  it('builds request with non-zero custom time ranges only', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
      hook.result.current.addTimeRange();
      hook.result.current.updateTimeRange(1, 'paidWorkingHours', 6);
      hook.result.current.updateShiftQuantity(1, 2);
    });

    const request = hook.result.current.buildRequest();
    expect(request.shiftAllocations).toEqual([]);
    expect(request.timeRanges).toEqual([
      {
        startTime: '09:00:00',
        endTime: '18:00:00',
        endDayOffset: 0,
        paidWorkingHours: 6,
        quantity: 2,
      },
    ]);
  });

  it('allows target-only submit without custom time ranges', () => {
    const hook = setupHook();

    expect(hook.result.current.validationErrors).toEqual([]);
    expect(hook.result.current.buildRequest().timeRanges).toEqual([]);
  });

  it('blocks submit when target is exceeded and over target is disabled', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
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
      hook.result.current.addTimeRange();
      hook.result.current.updateShiftQuantity(1, 1);
    });

    expect(hook.result.current.validationErrors).not.toContain('Tổng số giờ đã vượt mục tiêu.');
  });

  it('resets modal state', () => {
    const hook = setupHook();

    act(() => {
      hook.result.current.addTimeRange();
      hook.result.current.updateShiftQuantity(1, 2);
      hook.result.current.resetForm();
    });

    expect(hook.result.current.formState.userId).toBeNull();
    expect(hook.result.current.formState.shifts).toEqual([]);
  });
});