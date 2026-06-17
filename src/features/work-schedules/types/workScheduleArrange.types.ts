export * from './quickArrange.types';

export type AutoArrangeShiftOption = {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  paidWorkingHours: number;
  isExtraShift: boolean;
};

export type AutoArrangeUserOption = {
  id: string;
  name: string;
  departmentName?: string | null;
  avatarUrl?: string | null;
};

export type AutoArrangeDepartmentOption = {
  id: string | number;
  name: string;
};

export type AutoArrangeStoreOption = {
  id: string | number;
  name: string;
};

export type AutoArrangeOptionsResponse = {
  weekStartDate: string;
  weekEndDate: string;
  users: AutoArrangeUserOption[];
  shifts: AutoArrangeShiftOption[];
  departments?: AutoArrangeDepartmentOption[];
  stores?: AutoArrangeStoreOption[];
};

export type AutoArrangeEmployeeRule = {
  userId: string;
  userName: string;
  departmentName?: string | null;
  targetHours: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  maxConsecutiveWorkingDays: number;
  unavailableDates: string[];
  preferredShiftIds: number[];
  unavailableShiftIds: number[];
};

export type AutoArrangeShiftDemand = {
  workDate: string;
  shiftId: number;
  requiredEmployees: number;
};

export type AutoArrangePreviewItem = {
  clientId: string;
  userId: string;
  userName: string;
  workDate: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  paidWorkingHours: number;
  warnings: string[];
  conflicts: string[];
};

export type AutoArrangeSummary = {
  coverageRate: number;
  enoughShiftCount: number;
  understaffedShiftCount: number;
  underTargetEmployeeCount: number;
  overTargetEmployeeCount: number;
};

export type AutoArrangePreviewResponse = {
  weekStartDate: string;
  weekEndDate: string;
  summary: AutoArrangeSummary;
  items: AutoArrangePreviewItem[];
  warnings: string[];
  conflicts: string[];
};

export type AutoArrangePreviewRequest = {
  weekStartDate: string;
  storeId?: string | number | null;
  departmentId?: string | number | null;
  employees: AutoArrangeEmployeeRule[];
  shiftDemands: AutoArrangeShiftDemand[];
};

export type AutoArrangeConfirmRequest = {
  weekStartDate: string;
  storeId?: string | number | null;
  departmentId?: string | number | null;
  items: Array<{
    userId: string;
    workDate: string;
    shiftId: number;
    note?: string | null;
  }>;
};

export type AutoArrangeFormState = {
  selectedDate: string;
  weekStartDate: string;
  weekEndDate: string;
  storeId: string | number | null;
  departmentId: string | number | null;
  selectedUserIds: string[];
  employees: AutoArrangeEmployeeRule[];
  shiftDemands: AutoArrangeShiftDemand[];
  previewItems: AutoArrangePreviewItem[];
};
