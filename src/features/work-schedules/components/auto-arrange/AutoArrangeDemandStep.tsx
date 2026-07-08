import { Alert, InputNumber, Table, Typography } from 'antd';
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

  const getDateTotal = (workDate: string) =>
    shifts.reduce((total, shift) => total + getDemand(workDate, shift.id), 0);

  const getShiftTotal = (shiftId: number) =>
    weekDates.reduce((total, workDate) => total + getDemand(workDate, shiftId), 0);

  const totalDemand = weekDates.reduce((total, workDate) => total + getDateTotal(workDate), 0);

  const columns: ColumnsType<Row> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      fixed: 'left',
      width: 150,
      render: value => (
        <Typography.Text strong>{formatWorkDateLabel(String(value))}</Typography.Text>
      ),
    },
    ...shifts.map(shift => ({
      title: (
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <Typography.Text strong>{shift.code}</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">{shift.paidWorkingHours}h</Typography.Text>
          </div>
          <Typography.Text className="block text-xs">{shift.name}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">{formatShiftTime(shift.startTime, shift.endTime)}</Typography.Text>
        </div>
      ),
      key: String(shift.id),
      width: 170,
      align: 'center' as const,
      render: (_: unknown, row: Row) => (
        <InputNumber
          min={0}
          precision={0}
          className="w-full"
          value={getDemand(row.workDate, shift.id)}
          addonAfter="người"
          onChange={value => onDemandChange(row.workDate, shift.id, value ?? 0)}
        />
      ),
    })),
    {
      title: 'Tổng ngày',
      key: 'dayTotal',
      fixed: 'right',
      width: 110,
      align: 'center',
      render: (_: unknown, row: Row) => (
        <Typography.Text strong>{getDateTotal(row.workDate)}</Typography.Text>
      ),
    },
  ];

  if (shifts.length === 0) {
    return (
      <div className="space-y-3">
        <Typography.Title level={5} className="!mb-0">3. Nhu cầu ca</Typography.Title>
        <Alert type="warning" showIcon message="Chưa có ca hoạt động để nhập nhu cầu." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Typography.Title level={5} className="!mb-0">3. Nhu cầu ca</Typography.Title>
        <Typography.Text type="secondary" className="text-sm">
          Số người cần cho từng ca trong từng ngày. Tổng nhu cầu hiện tại: {totalDemand} lượt ca.
        </Typography.Text>
      </div>
      <Table
        size="small"
        rowKey="workDate"
        columns={columns}
        dataSource={weekDates.map(workDate => ({ workDate }))}
        pagination={false}
        scroll={{ x: 260 + shifts.length * 170 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Typography.Text strong>Tổng ca</Typography.Text>
              </Table.Summary.Cell>
              {shifts.map((shift, index) => (
                <Table.Summary.Cell key={shift.id} index={index + 1} align="center">
                  <Typography.Text strong>{getShiftTotal(shift.id)}</Typography.Text>
                </Table.Summary.Cell>
              ))}
              <Table.Summary.Cell index={shifts.length + 1} align="center">
                <Typography.Text strong>{totalDemand}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
}