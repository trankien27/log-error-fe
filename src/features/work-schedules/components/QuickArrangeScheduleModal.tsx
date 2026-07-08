import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Modal, Skeleton, Space, Typography, notification } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { ApiError } from '../../../services/api/apiClient';
import { User } from '../../../types';
import { getQuickArrangeOptions, quickArrangeWorkSchedule } from '../api/workScheduleApi';
import { useQuickArrangeSchedule } from '../hooks/useQuickArrangeSchedule';
import { QuickArrangeWorkScheduleResponse } from '../types/quickArrange.types';
import { getWeekStartDate } from '../utils/week.utils';
import QuickArrangeAdvancedOptions from './QuickArrangeAdvancedOptions';
import QuickArrangeGeneralForm from './QuickArrangeGeneralForm';
import QuickArrangeResult from './QuickArrangeResult';
import QuickArrangeShiftSelection from './QuickArrangeShiftSelection';

type Props = {
  open: boolean;
  users: User[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export function mapQuickArrangeApiError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TARGET_HOURS_EXCEEDED':
        return `Tổng giờ vượt mục tiêu: ${error.message}`;
      case 'WORK_SCHEDULE_CONFLICT':
        return `Xung đột lịch làm việc: ${error.message}`;
      case 'QUICK_ARRANGE_INCOMPLETE':
        return [
          `Không thể xếp đủ lịch: ${error.message}`,
          'Nguyên nhân thường gặp: đã đạt số ca tối đa mỗi ngày, trùng giờ với lịch hiện có, không đủ thời gian nghỉ giữa các ca, hoặc vượt số ngày làm liên tiếp.',
          'Bạn có thể bật "Cho phép lưu một phần", bật "Ghi đè lịch hiện có", tăng "Số khung tối đa mỗi ngày", tăng "Số ngày làm liên tiếp tối đa", hoặc giảm "Thời gian nghỉ tối thiểu".',
        ].join('\n');
      default:
        return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  return 'Có lỗi xảy ra khi sắp xếp lịch nhanh.';
}

export default function QuickArrangeScheduleModal({ open, users, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickArrangeWorkScheduleResponse | null>(null);
  const {
    formState,
    options,
    allocatedHours,
    totalShiftCount,
    availableCapacity,
    validationErrors,
    updateField,
    updateShiftQuantity,
    clearAllocations,
    getMaxQuantityForShift,
    applyOptions,
    resetForm,
    buildRequest,
  } = useQuickArrangeSchedule();

  const weekStartDate = getWeekStartDate(formState.selectedDate);
  const hasDirtyData = Boolean(
    formState.userId ||
    totalShiftCount > 0 ||
    formState.note.trim(),
  );

  const optionsQuery = useQuery({
    queryKey: ['work-schedules', 'quick-arrange-options', formState.userId, weekStartDate, formState.periodType],
    queryFn: () => getQuickArrangeOptions({
      userId: formState.userId as string,
      weekStartDate,
    }),
    enabled: Boolean(open && formState.userId && weekStartDate),
  });

  const mutation = useMutation({
    mutationFn: quickArrangeWorkSchedule,
    onSuccess: async response => {
      await queryClient.invalidateQueries({ queryKey: ['work-schedules', 'week'] });
      await onSuccess();

      if (response.warnings.length > 0) {
        setResult(response);
        notification.warning({
          message: 'Đã xếp lịch với cảnh báo',
          description: `Đã tạo ${response.createdShiftCount}/${response.requestedShiftCount} khung giờ.`,
        });
        return;
      }

      notification.success({
        message: 'Sắp xếp lịch nhanh thành công',
        description: `Đã xếp thành công ${response.createdShiftCount} khung giờ cho ${response.userName}.`,
      });
      handleResetAndClose();
    },
    onError: error => {
      setApiError(mapQuickArrangeApiError(error));
    },
  });

  useEffect(() => {
    if (optionsQuery.data) {
      applyOptions(optionsQuery.data);
    }
  }, [optionsQuery.data]);

  useEffect(() => {
    if (!open) {
      resetForm();
      setApiError(null);
      setResult(null);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return validationErrors.length === 0 && !optionsQuery.isFetching && !mutation.isPending;
  }, [mutation.isPending, optionsQuery.isFetching, validationErrors.length]);

  const handleResetAndClose = () => {
    resetForm();
    setApiError(null);
    setResult(null);
    onClose();
  };

  const requestClose = () => {
    if (!hasDirtyData) {
      handleResetAndClose();
      return;
    }

    Modal.confirm({
      title: 'Bạn có thay đổi chưa được lưu',
      content: 'Bạn có chắc muốn đóng?',
      okText: 'Đóng',
      cancelText: 'Ở lại',
      onOk: handleResetAndClose,
    });
  };

  const submit = () => {
    setApiError(null);

    const run = () => {
      try {
        mutation.mutate(buildRequest());
      } catch (error) {
        setApiError(mapQuickArrangeApiError(error));
      }
    };

    if (formState.overwriteExisting) {
      Modal.confirm({
        title: 'Xác nhận ghi đè lịch hiện có',
        icon: <ExclamationCircleOutlined />,
        content: 'Lịch chưa hoàn thành của nhân viên trong tuần có thể bị thay thế. Bạn có chắc muốn tiếp tục?',
        okText: 'Tiếp tục',
        cancelText: 'Hủy',
        onOk: run,
      });
      return;
    }

    run();
  };

  return (
    <Modal
      title="Đề xuất lịch nhanh theo khung giờ"
      open={open}
      onCancel={requestClose}
      width="min(860px, calc(100vw - 24px))"
      destroyOnClose
      styles={{
        body: {
          maxHeight: 'calc(100dvh - 12rem)',
          overflowY: 'auto',
        },
      }}
      footer={[
        <Button key="cancel" onClick={requestClose}>Hủy</Button>,
        <Button
          key="submit"
          type="primary"
          onClick={submit}
          disabled={!canSubmit}
          loading={mutation.isPending}
        >
          Xếp lịch
        </Button>,
      ]}
    >
      <div className="space-y-5">
        <QuickArrangeGeneralForm
          formState={formState}
          users={users}
          onFieldChange={updateField}
        />

        {apiError && <Alert type="error" showIcon message={apiError} />}

        {validationErrors.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Chưa thể xếp lịch"
            description={
              <ul className="pl-4 list-disc">
                {validationErrors.map(error => <li key={error}>{error}</li>)}
              </ul>
            }
          />
        )}

        {optionsQuery.isFetching && <Skeleton active paragraph={{ rows: 5 }} />}

        {options && (
          <Space direction="vertical" size="large" className="w-full">
            <Alert
              type="info"
              showIcon
              message={`Lịch hiện có trong tuần đang xem: ${options.existingWorkingHours} giờ, ${options.existingSchedules.length} lịch.`}
              description="Hệ thống chỉ xếp theo các ca đã chọn; giờ làm và thời gian làm việc được lấy từ cấu hình shift."
            />
            <QuickArrangeShiftSelection
              formState={formState}
              allocatedHours={allocatedHours}
              totalShiftCount={totalShiftCount}
              availableCapacity={availableCapacity}
              getMaxQuantityForShift={getMaxQuantityForShift}
              onQuantityChange={updateShiftQuantity}
              onClear={clearAllocations}
            />
            <QuickArrangeAdvancedOptions formState={formState} onFieldChange={updateField} />
          </Space>
        )}

        {result && <QuickArrangeResult result={result} />}

        {!formState.userId && (
          <Typography.Text type="secondary">
            Chọn nhân viên để tải dữ liệu lịch hiện có trong tuần.
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}
