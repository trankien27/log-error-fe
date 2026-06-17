import { useEffect, useMemo, useState } from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Drawer, Modal, Steps, notification } from 'antd';
import { ApiError } from '../../../services/api/apiClient';
import { User } from '../../../types';
import {
  confirmAutoArrangeWorkSchedule,
  getAutoArrangeOptions,
  previewAutoArrangeWorkSchedule,
} from '../api/workScheduleApi';
import { useAutoArrangeSchedule } from '../hooks/useAutoArrangeSchedule';
import { AutoArrangePreviewItem, AutoArrangePreviewResponse } from '../types/workScheduleArrange.types';
import AutoArrangeDemandStep from './auto-arrange/AutoArrangeDemandStep';
import AutoArrangeEmployeeRulesStep from './auto-arrange/AutoArrangeEmployeeRulesStep';
import AutoArrangePreviewStep from './auto-arrange/AutoArrangePreviewStep';
import AutoArrangeScopeStep from './auto-arrange/AutoArrangeScopeStep';

type Props = {
  open: boolean;
  users: User[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function mapAutoArrangeError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WORK_SCHEDULE_CONFLICT':
        return `Trùng lịch: ${error.message}`;
      case 'REST_TIME_VIOLATION':
        return `Không đủ thời gian nghỉ: ${error.message}`;
      case 'AUTO_ARRANGE_UNDERSTAFFED':
        return `Có ca thiếu người: ${error.message}`;
      case 'TARGET_HOURS_EXCEEDED':
        return `Có nhân viên vượt giờ: ${error.message}`;
      default:
        return error.message;
    }
  }

  return error instanceof Error ? error.message : 'Không thể tự động chia ca.';
}

function normalizePreviewItems(response: AutoArrangePreviewResponse): AutoArrangePreviewItem[] {
  return response.items.map((item, index) => ({
    ...item,
    clientId: item.clientId || `${item.userId}-${item.workDate}-${item.shiftId}-${index}`,
    warnings: item.warnings || [],
    conflicts: item.conflicts || [],
  }));
}

export default function AutoArrangeScheduleModal({ open, users, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [previewResponse, setPreviewResponse] = useState<AutoArrangePreviewResponse | null>(null);
  const {
    formState,
    options,
    weekDates,
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
  } = useAutoArrangeSchedule(users);

  const hasDirtyData = formState.selectedUserIds.length > 0 || formState.previewItems.length > 0;

  const optionsQuery = useQuery({
    queryKey: ['work-schedules', 'auto-arrange-options', formState.weekStartDate, formState.storeId, formState.departmentId],
    queryFn: () => getAutoArrangeOptions({
      weekStartDate: formState.weekStartDate,
      storeId: formState.storeId ?? undefined,
      departmentId: formState.departmentId ?? undefined,
    }),
    enabled: open,
  });

  const previewMutation = useMutation({
    mutationFn: previewAutoArrangeWorkSchedule,
    onSuccess: response => {
      const items = normalizePreviewItems(response);
      setPreviewResponse({ ...response, items });
      setPreviewItems(items);
      setCurrentStep(3);
      notification.success({
        message: 'Đã tạo preview chia ca',
        description: `CoverageRate ${response.summary.coverageRate}%.`,
      });
    },
    onError: error => setApiError(mapAutoArrangeError(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmAutoArrangeWorkSchedule,
    onSuccess: async response => {
      await queryClient.invalidateQueries({ queryKey: ['work-schedules', 'week'] });
      await onSuccess();
      notification.success({
        message: 'Đã lưu lịch tự động',
        description: `Đã lưu ${response.items.length} lịch làm việc.`,
      });
      closeAndReset();
    },
    onError: error => setApiError(mapAutoArrangeError(error)),
  });

  useEffect(() => {
    if (optionsQuery.data) {
      applyOptions(optionsQuery.data);
    }
  }, [optionsQuery.data]);

  useEffect(() => {
    if (!open) {
      reset();
      setPreviewResponse(null);
      setApiError(null);
      setCurrentStep(0);
    }
  }, [open]);

  const selectedUsers = useMemo(
    () => users.filter(user => formState.selectedUserIds.includes(user.id)),
    [formState.selectedUserIds, users],
  );

  const canGoNext = currentStep === 0
    ? formState.selectedUserIds.length > 0
    : currentStep === 1
    ? formState.employees.length > 0
    : currentStep === 2
    ? validationErrors.length === 0
    : formState.previewItems.length > 0;

  const closeAndReset = () => {
    reset();
    setPreviewResponse(null);
    setApiError(null);
    setCurrentStep(0);
    onClose();
  };

  const requestClose = () => {
    if (!hasDirtyData) {
      closeAndReset();
      return;
    }

    Modal.confirm({
      title: 'Bạn có thay đổi chưa lưu',
      content: 'Đóng màn hình sẽ xóa cấu hình tự động chia ca hiện tại. Bạn có chắc muốn đóng?',
      okText: 'Đóng',
      cancelText: 'Ở lại',
      onOk: closeAndReset,
    });
  };

  const runPreview = () => {
    setApiError(null);
    if (validationErrors.length > 0) {
      setApiError(validationErrors.join('\n'));
      return;
    }
    previewMutation.mutate(buildPreviewRequest());
  };

  const confirm = () => {
    setApiError(null);
    confirmMutation.mutate({
      weekStartDate: formState.weekStartDate,
      storeId: formState.storeId,
      departmentId: formState.departmentId,
      items: formState.previewItems.map(item => ({
        userId: item.userId,
        workDate: item.workDate,
        shiftId: item.shiftId,
        note: null,
      })),
    });
  };

  return (
    <Drawer
      title="Tự động chia ca cho toàn bộ nhân viên trong tuần"
      open={open}
      onClose={requestClose}
      width="min(1280px, 96vw)"
      destroyOnClose
      extra={<Button icon={<ThunderboltOutlined />} type="primary" onClick={runPreview} loading={previewMutation.isPending}>Preview</Button>}
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button onClick={requestClose}>Hủy</Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={currentStep === 0} onClick={() => setCurrentStep(step => Math.max(0, step - 1))}>Quay lại</Button>
            {currentStep < 3 ? (
              <Button type="primary" disabled={!canGoNext} onClick={() => setCurrentStep(step => Math.min(3, step + 1))}>Tiếp tục</Button>
            ) : (
              <Button type="primary" disabled={formState.previewItems.length === 0} loading={confirmMutation.isPending} onClick={confirm}>
                Xác nhận lưu
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-x-auto pb-1">
          <Steps
            current={currentStep}
            className="min-w-[620px] sm:min-w-0"
            items={[
              { title: 'Phạm vi' },
              { title: 'Giới hạn nhân viên' },
              { title: 'Nhu cầu ca' },
              { title: 'Preview & lưu' },
            ]}
          />
        </div>

        {apiError && <Alert type="error" showIcon message="Không thể xử lý tự động chia ca" description={<pre className="whitespace-pre-wrap font-sans">{apiError}</pre>} />}
        {optionsQuery.isFetching && <Alert type="info" showIcon message="Đang tải dữ liệu ca và tùy chọn..." />}

        {currentStep === 0 && (
          <AutoArrangeScopeStep
            selectedDate={formState.selectedDate}
            storeId={formState.storeId}
            departmentId={formState.departmentId}
            selectedUserIds={formState.selectedUserIds}
            users={users}
            options={options}
            onDateChange={updateSelectedDate}
            onScopeChange={updateScope}
            onUsersChange={updateSelectedUserIds}
          />
        )}

        {currentStep === 1 && (
          <AutoArrangeEmployeeRulesStep
            employees={formState.employees}
            shifts={options?.shifts || []}
            weekDates={weekDates}
            onChange={updateEmployeeRule}
          />
        )}

        {currentStep === 2 && (
          <AutoArrangeDemandStep
            weekDates={weekDates}
            shifts={options?.shifts || []}
            demands={formState.shiftDemands}
            onDemandChange={updateDemand}
          />
        )}

        {currentStep === 3 && (
          <AutoArrangePreviewStep
            employees={formState.employees}
            shifts={options?.shifts || []}
            weekDates={weekDates}
            previewItems={formState.previewItems}
            summary={previewResponse?.summary || null}
            warnings={previewResponse?.warnings || []}
            conflicts={previewResponse?.conflicts || []}
            onChangeItem={updatePreviewItem}
            onRemoveItem={removePreviewItem}
          />
        )}

        {currentStep === 0 && selectedUsers.length > 0 && (
          <Alert type="success" showIcon message={`Đã chọn ${selectedUsers.length} nhân viên.`} />
        )}
      </div>
    </Drawer>
  );
}
