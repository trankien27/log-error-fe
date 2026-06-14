import { InputNumber, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { AutoArrangeShiftDemand, AutoArrangeShiftOption } from '../../types/workScheduleArrange.types';
import { formatShiftTime, formatWorkDateLabel } from '../../utils/week.utils';

type Row = {
  workDate: string;
};

type Props = {
  weekDates: string[];
  shifts: AutoArrangeShiftOption[];
  demands: AutoArrangeShiftDemand[];
  onDemandChange: (workDate: string, shiftId: number, requiredEmployees: number) => void;
};

export default function AutoArrangeDemandStep({ weekDates, shifts, demands, onDemandChange }: Props) {
  const getDemand = (workDate: string, shiftId: number) =>
    demands.find(demand => demand.workDate === workDate && demand.shiftId === shiftId)?.requiredEmployees || 0;

  const columns: ColumnsType<Row> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      fixed: 'left',
      width: 150,
      render: value => formatWorkDateLabel(String(value)),
    },
    ...shifts.map(shift => ({
      title: (
        <div>
          <Typography.Text strong>{shift.code}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">{formatShiftTime(shift.startTime, shift.endTime)}</Typography.Text>
        </div>
      ),
      key: String(shift.id),
      width: 150,
      render: (_: unknown, row: Row) => (
        <InputNumber
          min={0}
          precision={0}
          value={getDemand(row.workDate, shift.id)}
          onChange={value => onDemandChange(row.workDate, shift.id, value ?? 0)}
        />
      ),
    })),
  ];

  return (
    <div className="space-y-3">
      <Typography.Title level={5} className="!mb-0">3. Nhập số người cần cho từng ca, từng ngày</Typography.Title>
      <Table
        size="small"
        rowKey="workDate"
        columns={columns}
        dataSource={weekDates.map(workDate => ({ workDate }))}
        pagination={false}
        scroll={{ x: 150 + shifts.length * 150 }}
      />
    </div>
  );
}
