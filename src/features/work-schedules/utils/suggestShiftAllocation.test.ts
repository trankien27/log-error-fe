import { describe, expect, it } from 'vitest';
import { suggestShiftAllocation } from './suggestShiftAllocation';
import { QuickArrangeShiftOption } from '../types/quickArrange.types';

const shifts: QuickArrangeShiftOption[] = [
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
];

describe('suggestShiftAllocation', () => {
  it('suggests an exact target when possible', () => {
    const result = suggestShiftAllocation({
      targetHours: 17,
      shifts,
      maximumShiftCount: 4,
      allowOverTargetHours: false,
    });

    expect((result[1] || 0) * 6 + (result[2] || 0) * 5).toBe(17);
  });

  it('chooses the closest value without exceeding target when over target is disabled', () => {
    const result = suggestShiftAllocation({
      targetHours: 4,
      shifts,
      maximumShiftCount: 4,
      allowOverTargetHours: false,
    });

    expect((result[1] || 0) * 6 + (result[2] || 0) * 5).toBe(0);
  });

  it('chooses the closest absolute value when over target is enabled', () => {
    const result = suggestShiftAllocation({
      targetHours: 4,
      shifts,
      maximumShiftCount: 4,
      allowOverTargetHours: true,
    });

    expect((result[1] || 0) * 6 + (result[2] || 0) * 5).toBe(5);
  });
});
