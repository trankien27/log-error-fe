import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ShiftAllocationFormItem } from '../types/quickArrange.types';
import { formatShiftTime } from '../utils/week.utils';

type Props = {
  shifts: ShiftAllocationFormItem[];
  getMaxQuantityForShift: (shift: ShiftAllocationFormItem) => number;
  updateShiftQuantity: (shiftId: number, quantity: number) => void;
  updateTimeRange: <K extends keyof ShiftAllocationFormItem>(
    shiftId: number,
    field: K,
    value: ShiftAllocationFormItem[K],
  ) => void;
  addTimeRange: () => void;
  removeTimeRange: (shiftId: number) => void;
  onAutoFill: () => void;
  onClear: () => void;
  canAutoFill: boolean;
};

export default function QuickArrangeShiftTable({
  shifts,
  getMaxQuantityForShift,
  updateShiftQuantity,
  updateTimeRange,
  addTimeRange,
  removeTimeRange,
  onAutoFill,
  onClear,
  canAutoFill,
}: Props) {
  const columns: ColumnsType<ShiftAllocationFormItem> = [
    {
      title: 'Thứ tự',
      key: 'shift',
      width: 96,
      render: (_, shift) => (
        <div>
          <Typography.Text strong>Khung {shift.shiftId}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">
            Có thể chọn tối đa {getMaxQuantityForShift(shift)} lần
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Khung giờ',
      key: 'time',
      render: (_, shift) => (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="time"
            value={shift.startTime}
            onChange={event => updateTimeRange(shift.shiftId, 'startTime', event.target.value)}
          />
          <Input
            type="time"
            value={shift.endTime}
            onChange={event => updateTimeRange(shift.shiftId, 'endTime', event.target.value)}
          />
          <Typography.Text type="secondary" className="col-span-2 text-xs">
            {formatShiftTime(shift.startTime, shift.endTime)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Thời lượng',
      key: 'hours',
      align: 'right',
      render: (_, shift) => (
        <InputNumber
          min={0.25}
          max={24}
          step={0.25}
          value={shift.paidWorkingHours}
          onChange={value => updateTimeRange(shift.shiftId, 'paidWorkingHours', value ?? 0)}
        />
      ),
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      align: 'right',
      render: (_, shift) => {
        const maxQuantity = getMaxQuantityForShift(shift);
        return (
          <Tooltip title={`Số lượng tối đa hiện tại là ${maxQuantity} ca`}>
            <InputNumber
              min={0}
              max={maxQuantity}
              precision={0}
              value={shift.quantity}
              onChange={value => updateShiftQuantity(shift.shiftId, value ?? 0)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng giờ',
      key: 'total',
      align: 'right',
      render: (_, shift) => `${shift.quantity * shift.paidWorkingHours} giờ`,
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, shift) => (
        <Button danger size="small" onClick={() => removeTimeRange(shift.shiftId)}>
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Typography.Title level={5} className="!mb-0">Phân bổ theo khung giờ</Typography.Title>
        <div className="flex flex-wrap gap-2">
          <Button onClick={addTimeRange}>
            Thêm khung giờ
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={onAutoFill}
            disabled={!canAutoFill}
          >
            Fill theo số giờ mục tiêu
          </Button>
          <Button onClick={onClear}>
            Xóa phân bổ
          </Button>
        </div>
      </div>
      <Table
        size="small"
        rowKey="shiftId"
        columns={columns}
        dataSource={shifts}
        pagination={false}
        scroll={{ x: 720 }}
      />
    </div>
  );
}
