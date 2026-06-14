import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { User } from '../../../types';
import {
  AutoArrangeEmployeeRule,
  AutoArrangeFormState,
  AutoArrangeOptionsResponse,
  AutoArrangePreviewItem,
  AutoArrangePreviewRequest,
  AutoArrangeShiftDemand,
} from '../types/workScheduleArrange.types';
import { getWeekEndDate, getWeekStartDate } from '../utils/week.utils';

function buildWeekDates(weekStartDate: string) {
  return Array.from({ length: 7 }, (_, index) => dayjs(weekStartDate).add(index, 'day').format('YYYY-MM-DD'));
}

function getUserDepartment(user: User) {
  return user.department || null;
}

function createEmployeeRule(user: User): AutoArrangeEmployeeRule {
  return {
    userId: user.id,
    userName: user.name,
    departmentName: getUserDepartment(user),
    targetHours: 40,
    maxHoursPerDay: 12,
    maxHoursPerWeek: 48,
    maxConsecutiveWorkingDays: 6,
    unavailableDates: [],
    preferredShiftIds: [],
    unavailableShiftIds: [],
  };
}

function buildDefaultDemands(options: AutoArrangeOptionsResponse): AutoArrangeShiftDemand[] {
  const weekDates = buildWeekDates(options.weekStartDate);
  return weekDates.flatMap(workDate =>
    options.shifts.map(shift => ({
      workDate,
      shiftId: shift.id,
      requiredEmployees: 0,
    })),
  );
}

const initialDate = dayjs().format('YYYY-MM-DD');

export const initialAutoArrangeState: AutoArrangeFormState = {
  selectedDate: initialDate,
  weekStartDate: getWeekStartDate(initialDate),
  weekEndDate: getWeekEndDate(initialDate),
  storeId: null,
  departmentId: null,
  selectedUserIds: [],
  employees: [],
  shiftDemands: [],
  previewItems: [],
};

export function useAutoArrangeSchedule(users: User[]) {
  const [formState, setFormState] = useState<AutoArrangeFormState>(initialAutoArrangeState);
  const [options, setOptions] = useState<AutoArrangeOptionsResponse | null>(null);

  const weekDates = useMemo(() => buildWeekDates(formState.weekStartDate), [formState.weekStartDate]);

  const selectedUsers = useMemo(
    () => users.filter(user => formState.selectedUserIds.includes(user.id)),
    [formState.selectedUserIds, users],
  );

  const updateSelectedDate = (selectedDate: string) => {
    setFormState(current => ({
      ...current,
      selectedDate,
      weekStartDate: getWeekStartDate(selectedDate),
      weekEndDate: getWeekEndDate(selectedDate),
      shiftDemands: [],
      previewItems: [],
    }));
  };

  const updateScope = (field: 'storeId' | 'departmentId', value: string | number | null) => {
    setFormState(current => ({
      ...current,
      [field]: value,
      previewItems: [],
    }));
  };

  const applyOptions = (nextOptions: AutoArrangeOptionsResponse) => {
    setOptions(nextOptions);
    setFormState(current => ({
      ...current,
      weekStartDate: nextOptions.weekStartDate,
      weekEndDate: nextOptions.weekEndDate,
      shiftDemands: current.shiftDemands.length > 0 ? current.shiftDemands : buildDefaultDemands(nextOptions),
    }));
  };

  const updateSelectedUserIds = (selectedUserIds: string[]) => {
    setFormState(current => {
      const nextUsers = users.filter(user => selectedUserIds.includes(user.id));
      const previousRules = new Map(current.employees.map(rule => [rule.userId, rule]));

      return {
        ...current,
        selectedUserIds,
        employees: nextUsers.map(user => previousRules.get(user.id) || createEmployeeRule(user)),
        previewItems: [],
      };
    });
  };

  const updateEmployeeRule = <K extends keyof AutoArrangeEmployeeRule>(
    userId: string,
    field: K,
    value: AutoArrangeEmployeeRule[K],
  ) => {
    setFormState(current => ({
      ...current,
      employees: current.employees.map(employee =>
        employee.userId === userId ? { ...employee, [field]: value } : employee,
      ),
      previewItems: [],
    }));
  };

  const updateDemand = (workDate: string, shiftId: number, requiredEmployees: number) => {
    setFormState(current => {
      const exists = current.shiftDemands.some(demand => demand.workDate === workDate && demand.shiftId === shiftId);

      return {
        ...current,
        shiftDemands: exists
          ? current.shiftDemands.map(demand =>
              demand.workDate === workDate && demand.shiftId === shiftId
                ? { ...demand, requiredEmployees: Math.max(0, Math.floor(requiredEmployees)) }
                : demand,
            )
          : [
              ...current.shiftDemands,
              { workDate, shiftId, requiredEmployees: Math.max(0, Math.floor(requiredEmployees)) },
            ],
        previewItems: [],
      };
    });
  };

  const setPreviewItems = (items: AutoArrangePreviewItem[]) => {
    setFormState(current => ({ ...current, previewItems: items }));
  };

  const updatePreviewItem = <K extends keyof AutoArrangePreviewItem>(
    clientId: string,
    field: K,
    value: AutoArrangePreviewItem[K],
  ) => {
    setFormState(current => ({
      ...current,
      previewItems: current.previewItems.map(item =>
        item.clientId === clientId ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removePreviewItem = (clientId: string) => {
    setFormState(current => ({
      ...current,
      previewItems: current.previewItems.filter(item => item.clientId !== clientId),
    }));
  };

  const buildPreviewRequest = (): AutoArrangePreviewRequest => ({
    weekStartDate: formState.weekStartDate,
    storeId: formState.storeId,
    departmentId: formState.departmentId,
    employees: formState.employees,
    shiftDemands: formState.shiftDemands.filter(demand => demand.requiredEmployees > 0),
  });

  const reset = () => {
    setFormState(initialAutoArrangeState);
    setOptions(null);
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (formState.employees.length === 0) errors.push('Vui lòng chọn ít nhất một nhân viên.');
    if (formState.shiftDemands.every(demand => demand.requiredEmployees <= 0)) {
      errors.push('Vui lòng nhập nhu cầu nhân sự cho ít nhất một ca.');
    }
    if (formState.employees.some(employee => employee.targetHours <= 0)) {
      errors.push('TargetHours của nhân viên phải lớn hơn 0.');
    }
    return errors;
  }, [formState.employees, formState.shiftDemands]);

  return {
    formState,
    options,
    weekDates,
    selectedUsers,
    validationErrors,
    updateSelectedDate,
    updateScope,
    applyOptions,
    updateSelectedUserIds,
    updateEmployeeRule,
    updateDemand,
    setPreviewItems,
    updatePreviewItem,
    removePreviewItem,
    buildPreviewRequest,
    reset,
  };
}
