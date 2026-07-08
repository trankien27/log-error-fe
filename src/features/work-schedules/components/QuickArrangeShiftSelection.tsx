import { Button, InputNumber, Table, Typography } from 'antd';
import { QuickArrangeFormState, ShiftAllocationFormItem } from '../types/quickArrange.types';
import { formatShiftTime } from '../utils/week.utils';

type Props = {
  formState: QuickArrangeFormState;
  allocatedHours: number;
  totalShiftCount: number;
  availableCapacity: number;
  getMaxQuantityForShift: (shift: ShiftAllocationFormItem) => number;
  onQuantityChange: (shiftId: number, quantity: number) => void;
  onClear: () => void;
};

export default function QuickArrangeShiftSelection({
  formState,
  allocatedHours,
  totalShiftCount,
  availableCapacity,
  getMaxQuantityForShift,
  onQuantityChange,
  onClear,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography.Title level={5} className="!mb-0">Chọn ca cần xếp</Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            Tổng {totalShiftCount}/{availableCapacity} ca, {allocatedHours} giờ làm việc.
          </Typography.Text>
        </div>
        <Button onClick={onClear} disabled={totalShiftCount === 0}>
          Xóa số lượng
        </Button>
      </div>

      <Table<ShiftAllocationFormItem>
        rowKey="shiftId"
        size="small"
        pagination={false}
        dataSource={formState.shifts}
        columns={[
          {
            title: 'Ca',
            dataIndex: 'name',
            render: (_, shift) => (
              <div className="flex flex-col">
                <Typography.Text strong>{shift.code} - {shift.name}</Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  {formatShiftTime(shift.startTime, shift.endTime)}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: 'Thời gian làm việc',
            dataIndex: 'paidWorkingHours',
            width: 160,
            render: value => `${value} giờ`,
          },
          {
            title: 'Số ca',
            dataIndex: 'quantity',
            width: 140,
            render: (_, shift) => (
              <InputNumber
                className="w-full"
                min={0}
                max={getMaxQuantityForShift(shift)}
                value={shift.quantity}
                onChange={value => onQuantityChange(shift.shiftId, value ?? 0)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
