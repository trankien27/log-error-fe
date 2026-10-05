import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Drawer, Select, Tag, TimePicker } from 'antd';
import { toast } from 'sonner';
import { confirmAction } from '../../../components/ui';
import dayjs, { Dayjs } from 'dayjs';
import { User } from '../../../types';
import {
  confirmWeeklyCoverageSuggestion,
  getAutoArrangeOptions,
  previewWeeklyCoverageSuggestion,
} from '../api/workScheduleApi';
import {
  AutoArrangeEmployeeRule,
  AutoArrangePreviewItem,
  AutoArrangeSummary,
  WeeklyCoveragePreviewResponse,
} from '../types/workScheduleArrange.types';
import { mapAutoArrangeError, normalizePreviewItems } from '../utils/autoArrangePreview.utils';
import { formatShiftTime, formatWeekRange, getWeekEndDate, getWeekStartDate } from '../utils/week.utils';
import AutoArrangePreviewStep from './auto-arrange/AutoArrangePreviewStep';

type Props = {
  open: boolean;
  users: User[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function createDefaultStart() {
  return dayjs().hour(7).minute(30).second(0).millisecond(0);
}

function createDefaultEnd() {
  return dayjs().hour(23).minute(0).second(0).millisecond(0);
}

function buildWeekDates(weekStartDate: string) {
  return Array.from({ length: 7 }, (_, index) => dayjs(weekStartDate).add(index, 'day').format('YYYY-MM-DD'));
}

function toTimeValue(value: Dayjs) {
  return value.format('HH:mm:ss');
}

function toShortTime(value: string) {
  return value?.slice(0, 5) || '';
}

function buildSummary(response: WeeklyCoveragePreviewResponse): AutoArrangeSummary {
  const unfilledCount = response.unfilledDemands?.filter(item => item.requiredEmployees > item.assignedEmployees).length || 0;
  return {
    coverageRate: Number(((response.coverageRate || 0) * 100).toFixed(1)),
    enoughShiftCount: Math.max(0, (response.requiredSlotCount || 0) - unfilledCount),
    understaffedShiftCount: unfilledCount,
    underTargetEmployeeCount: (response.employeeSummaries || []).filter(item => item.differenceHours < 0).length,
    overTargetEmployeeCount: (response.employeeSummaries || []).filter(item => item.differenceHours > 0).length,
  };
}

function createEmployeeRules(users: User[], selectedUserIds: string[]): AutoArrangeEmployeeRule[] {
  return users
    .filter(user => selectedUserIds.includes(user.id))
    .map(user => ({
      userId: user.id,
      userName: user.name,
      departmentName: user.department || null,
      targetHours: 40,
      maxHoursPerDay: 12,
      maxHoursPerWeek: 48,
      maxConsecutiveWorkingDays: 6,
      unavailableDates: [],
      preferredShiftIds: [],
      unavailableShiftIds: [],
    }));
}

export default function WeeklyCoverageSuggestionModal({ open, users, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [weekStartDate, setWeekStartDate] = useState(() => getWeekStartDate(dayjs()));
  const [coverageStart, setCoverageStart] = useState(createDefaultStart);
  const [coverageEnd, setCoverageEnd] = useState(createDefaultEnd);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [previewResponse, setPreviewResponse] = useState<WeeklyCoveragePreviewResponse | null>(null);
  const [previewItems, setPreviewItems] = useState<AutoArrangePreviewItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const weekDates = useMemo(() => buildWeekDates(weekStartDate), [weekStartDate]);
  const employees = useMemo(() => createEmployeeRules(users, selectedUserIds), [selectedUserIds, users]);
  const hasDirtyData = previewItems.length > 0 || selectedUserIds.length > 0;

  const optionsQuery = useQuery({
    queryKey: ['work-schedules', 'weekly-coverage-options', weekStartDate],
    queryFn: () => getAutoArrangeOptions({ weekStartDate }),
    enabled: open,
  });

  const selectedShifts = useMemo(() => {
    const ids = previewResponse?.selectedShiftIds || [];
    return (optionsQuery.data?.shifts || []).filter(shift => ids.includes(shift.id));
  }, [optionsQuery.data?.shifts, previewResponse?.selectedShiftIds]);

  const validationError = useMemo(() => {
    if (!coverageStart.isBefore(coverageEnd)) return 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.';
    if (selectedUserIds.length === 0) return 'Vui lòng chọn ít nhất một nhân viên.';
    return null;
  }, [coverageEnd, coverageStart, selectedUserIds.length]);

  const reset = () => {
    setWeekStartDate(getWeekStartDate(dayjs()));
    setCoverageStart(createDefaultStart());
    setCoverageEnd(createDefaultEnd());
    setSelectedUserIds([]);
    setPreviewResponse(null);
    setPreviewItems([]);
    setApiError(null);
  };

  useEffect(() => {
    if (open) {
      setSelectedUserIds([]);
    } else {
      reset();
    }
  }, [open]);

  const previewMutation = useMutation({
    mutationFn: previewWeeklyCoverageSuggestion,
    onSuccess: response => {
      const items = normalizePreviewItems(response);
      setPreviewResponse(response);
      setPreviewItems(items);
      toast.success('Đã tạo gợi ý lịch tuần.', {
        description: `Đã xếp ${response.assignedSlotCount}/${response.requiredSlotCount} ca cần trực.`,
      });
    },
    onError: error => setApiError(mapAutoArrangeError(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmWeeklyCoverageSuggestion,
    onSuccess: async response => {
      await queryClient.invalidateQueries({ queryKey: ['work-schedules', 'week'] });
      await onSuccess();
      toast.success(`Đã lưu ${response.createdCount || response.items.length} lịch làm việc.`);
      closeAndReset();
    },
    onError: error => setApiError(mapAutoArrangeError(error)),
  });

  const closeAndReset = () => {
    reset();
    onClose();
  };

  const requestClose = async () => {
    if (!hasDirtyData) {
      closeAndReset();
      return;
    }

    const confirmed = await confirmAction({
      title: 'Đóng khi chưa lưu?',
      content: 'Gợi ý lịch tuần hiện tại sẽ bị bỏ.',
      okText: 'Đóng',
      cancelText: 'Ở lại',
    });
    if (confirmed) closeAndReset();
  };

  const runPreview = () => {
    setApiError(null);
    if (validationError) {
      setApiError(validationError);
      return;
    }

    previewMutation.mutate({
      weekStartDate,
      coverageStart: toTimeValue(coverageStart),
      coverageEnd: toTimeValue(coverageEnd),
      userIds: selectedUserIds,
    });
  };

  const confirm = () => {
    if (!previewResponse) return;
    setApiError(null);
    confirmMutation.mutate({
      planId: previewResponse.planId,
      note: null,
      items: previewItems.map(item => ({
        itemId: item.itemId || item.clientId,
        userId: item.userId,
        workDate: item.workDate,
        shiftId: item.shiftId,
      })),
    });
  };

  const updatePreviewItem = <K extends keyof AutoArrangePreviewItem>(
    clientId: string,
    field: K,
    value: AutoArrangePreviewItem[K],
  ) => {
    setPreviewItems(current => current.map(item => (
      item.clientId === clientId ? { ...item, [field]: value } : item
    )));
  };

  const removePreviewItem = (clientId: string) => {
    setPreviewItems(current => current.filter(item => item.clientId !== clientId));
  };

  const uncoveredDays = previewResponse?.dailyCoverage?.filter(day => !day.isFullyCovered) || [];

  return (
    <Drawer
      title="Gợi ý lịch tuần"
      open={open}
      onClose={requestClose}
      width="min(1280px, 96vw)"
      destroyOnClose
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button onClick={requestClose}>Hủy</Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={runPreview} loading={previewMutation.isPending}>
              Tạo gợi ý
            </Button>
            <Button
              type="primary"
              disabled={!previewResponse || previewItems.length === 0}
              loading={confirmMutation.isPending}
              onClick={confirm}
            >
              Lưu lịch
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {apiError && (
          <Alert
            type="error"
            showIcon
            message="Không thể tạo gợi ý lịch tuần"
            description={<pre className="whitespace-pre-wrap font-sans">{apiError}</pre>}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="block text-sm font-medium text-on-surface">
            Tuần
            <DatePicker
              className="mt-2 w-full"
              value={dayjs(weekStartDate)}
              format="[Tuần] DD/MM/YYYY"
              onChange={value => {
                const nextDate = value || dayjs();
                setWeekStartDate(getWeekStartDate(nextDate));
                setPreviewResponse(null);
                setPreviewItems([]);
              }}
            />
            <span className="mt-1 block text-xs text-on-surface-variant">{formatWeekRange(weekStartDate)}</span>
          </label>

          <label className="block text-sm font-medium text-on-surface">
            Giờ bắt đầu
            <TimePicker
              className="mt-2 w-full"
              value={coverageStart}
              format="HH:mm"
              minuteStep={5}
              onChange={value => {
                setCoverageStart(value || createDefaultStart());
                setPreviewResponse(null);
                setPreviewItems([]);
              }}
            />
          </label>

          <label className="block text-sm font-medium text-on-surface">
            Giờ kết thúc
            <TimePicker
              className="mt-2 w-full"
              value={coverageEnd}
              format="HH:mm"
              minuteStep={5}
              onChange={value => {
                setCoverageEnd(value || createDefaultEnd());
                setPreviewResponse(null);
                setPreviewItems([]);
              }}
            />
          </label>

          <label className="block text-sm font-medium text-on-surface">
            Nhân viên
            <Select
              className="mt-2 w-full"
              mode="multiple"
              placeholder="Chọn nhân viên"
              maxTagCount="responsive"
              value={selectedUserIds}
              options={users.map(user => ({ value: user.id, label: user.name }))}
              onChange={value => {
                setSelectedUserIds(value);
                setPreviewResponse(null);
                setPreviewItems([]);
              }}
            />
          </label>
        </div>

        {validationError && <Alert type="warning" showIcon message={validationError} />}
        {optionsQuery.isFetching && <Alert type="info" showIcon message="Đang tải danh sách ca..." />}

        {previewResponse && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface">Ca được chọn:</span>
              {selectedShifts.length === 0 ? (
                <Tag>Không có ca phù hợp</Tag>
              ) : selectedShifts.map(shift => (
                <Tag key={shift.id} color={shift.isExtraShift ? 'gold' : 'blue'}>
                  {shift.code} · {formatShiftTime(shift.startTime, shift.endTime)}
                </Tag>
              ))}
            </div>

            {previewResponse.gaps.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Có khung giờ không có ca nào phủ"
                description={previewResponse.gaps.map(gap => (
                  <div key={`${gap.from}-${gap.to}`}>Không có ca nào phủ khung {toShortTime(gap.from)}-{toShortTime(gap.to)}</div>
                ))}
              />
            )}

            {uncoveredDays.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Có khung giờ chưa ai trực"
                description={uncoveredDays.map(day => (
                  <div key={day.workDate}>
                    {day.workDate}: {day.gaps.map(gap => `${toShortTime(gap.from)}-${toShortTime(gap.to)}`).join(', ')}
                  </div>
                ))}
              />
            )}

            <AutoArrangePreviewStep
              employees={employees}
              shifts={optionsQuery.data?.shifts || []}
              weekDates={weekDates}
              previewItems={previewItems}
              summary={buildSummary(previewResponse)}
              warnings={previewResponse.warnings || []}
              conflicts={[]}
              onChangeItem={updatePreviewItem}
              onRemoveItem={removePreviewItem}
            />
          </div>
        )}
      </div>
    </Drawer>
  );
}
