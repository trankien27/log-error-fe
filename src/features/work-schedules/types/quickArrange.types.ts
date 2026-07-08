export type QuickArrangeShiftOption = {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  endDayOffset: number;
  paidWorkingHours: number;
  isExtraShift: boolean;
};

export type ExistingScheduleItem = {
  id: number;
  workDate: string;
  shiftId?: number | null;
  shiftCode: string;
};

export type QuickArrangeOptionsResponse = {
  user: {
    id: string;
    name: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  existingWorkingHours: number;
  availableDayCount: number;
  shifts: QuickArrangeShiftOption[];
  existingSchedules: ExistingScheduleItem[];
};

export type ShiftAllocationFormItem = {
  shiftId: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  endDayOffset: number;
  paidWorkingHours: number;
  quantity: number;
};

export type QuickArrangeFormState = {
  userId: string | null;
  selectedDate: string;
  periodType: 'week' | 'month';
  overwriteExisting: boolean;
  allowPartialArrange: boolean;
  maxShiftsPerDay: number;
  maxConsecutiveWorkingDays: number;
  minimumRestHours: number;
  note: string;
  shifts: ShiftAllocationFormItem[];
};

export type QuickArrangeWorkScheduleRequest = {
  userId: string;
  weekStartDate: string;
  periodType: 'week' | 'month';
  overwriteExisting: boolean;
  allowPartialArrange: boolean;
  maxShiftsPerDay: number;
  maxConsecutiveWorkingDays: number;
  minimumRestHours: number;
  note: string | null;
  shiftAllocations: Array<{
    shiftId: number;
    quantity: number;
  }>;
};

export type QuickArrangeCreatedItem = {
  id: number;
  workDate: string;
  shiftId?: number | null;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  paidWorkingHours: number;
};

export type QuickArrangeWorkScheduleResponse = {
  userId: string;
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  targetHours: number;
  requestedHours: number;
  existingHours: number;
  createdHours: number;
  finalHours: number;
  differenceHours: number;
  requestedShiftCount: number;
  createdShiftCount: number;
  items: QuickArrangeCreatedItem[];
  warnings: string[];
};

export type QuickArrangeApiErrorCode =
  | 'TARGET_HOURS_EXCEEDED'
  | 'WORK_SCHEDULE_CONFLICT'
  | 'QUICK_ARRANGE_INCOMPLETE'
  | string;

export type QuickArrangeApiError = {
  code?: QuickArrangeApiErrorCode;
  message: string;
  data?: unknown;
};
