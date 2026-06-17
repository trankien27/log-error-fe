import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, InputNumber, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ShiftAllocationFormItem } from '../types/quickArrange.types';
import { formatShiftTime } from '../utils/week.utils';

type Props = {
  shifts: ShiftAllocationFormItem[];
  getMaxQuantityForShift: (shift: ShiftAllocationFormItem) => number;
  updateShiftQuantity: (shiftId: number, quantity: number) => void;
  onAutoFill: () => void;
  onClear: () => void;
  canAutoFill: boolean;
};

export default function QuickArrangeShiftTable({
  shifts,
  getMaxQuantityForShift,
  updateShiftQuantity,
  onAutoFill,
  onClear,
  canAutoFill,
}: Props) {
  const columns: ColumnsType<ShiftAllocationFormItem> = [
    {
      title: 'Ca trực',
      key: 'shift',
      render: (_, shift) => (
        <div>
          <Typography.Text strong>{shift.code} - {shift.name}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">
            Có thể chọn tối đa {getMaxQuantityForShift(shift)} ca
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Khung giờ',
      key: 'time',
      render: (_, shift) => formatShiftTime(shift.startTime, shift.endTime),
      responsive: ['md'],
    },
    {
      title: 'Thời lượng',
      key: 'hours',
      align: 'right',
      render: (_, shift) => `${shift.paidWorkingHours} giờ`,
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
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Typography.Title level={5} className="!mb-0">Phân bổ số lượng ca</Typography.Title>
        <div className="flex flex-wrap gap-2">
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
        scroll={{ x: 680 }}
      />
    </div>
  );
}
