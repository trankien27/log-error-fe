import { InputNumber, Select, Table, Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { AutoArrangeEmployeeRule, AutoArrangeShiftOption } from '../../types/workScheduleArrange.types';
import { formatWorkDateLabel } from '../../utils/week.utils';

type Props = {
  employees: AutoArrangeEmployeeRule[];
  shifts: AutoArrangeShiftOption[];
  weekDates: string[];
  onChange: <K extends keyof AutoArrangeEmployeeRule>(
    userId: string,
    field: K,
    value: AutoArrangeEmployeeRule[K],
  ) => void;
};

export default function AutoArrangeEmployeeRulesStep({ employees, shifts, weekDates, onChange }: Props) {
  const shiftOptions = shifts.map(shift => ({ value: shift.id, label: `${shift.code} - ${shift.name}` }));
  const dayOptions = weekDates.map(date => ({ value: date, label: formatWorkDateLabel(date) }));

  const columns: ColumnsType<AutoArrangeEmployeeRule> = [
    {
      title: 'User',
      dataIndex: 'userName',
      fixed: 'left',
      width: 180,
      render: (_, employee) => (
        <div>
          <Typography.Text strong>{employee.userName}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">{employee.departmentName || 'Chưa có phòng ban'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'TargetHours',
      width: 120,
      render: (_, employee) => (
        <InputNumber min={1} step={0.5} value={employee.targetHours} onChange={value => onChange(employee.userId, 'targetHours', value ?? 1)} />
      ),
    },
    {
      title: 'MaxHours/Day',
      width: 130,
      render: (_, employee) => (
        <InputNumber min={1} max={24} step={0.5} value={employee.maxHoursPerDay} onChange={value => onChange(employee.userId, 'maxHoursPerDay', value ?? 1)} />
      ),
    },
    {
      title: 'MaxHours/Week',
      width: 140,
      render: (_, employee) => (
        <InputNumber min={1} step={0.5} value={employee.maxHoursPerWeek} onChange={value => onChange(employee.userId, 'maxHoursPerWeek', value ?? 1)} />
      ),
    },
    {
      title: 'Max Consecutive Days',
      width: 170,
      render: (_, employee) => (
        <InputNumber min={1} max={7} value={employee.maxConsecutiveWorkingDays} onChange={value => onChange(employee.userId, 'maxConsecutiveWorkingDays', value ?? 1)} />
      ),
    },
    {
      title: 'Ngày không thể làm',
      width: 230,
      render: (_, employee) => (
        <Select
          mode="multiple"
          className="w-full"
          value={employee.unavailableDates}
          options={dayOptions}
          onChange={value => onChange(employee.userId, 'unavailableDates', value)}
          maxTagCount="responsive"
        />
      ),
    },
    {
      title: 'Ca ưu tiên',
      width: 220,
      render: (_, employee) => (
        <Select
          mode="multiple"
          className="w-full"
          value={employee.preferredShiftIds}
          options={shiftOptions}
          onChange={value => onChange(employee.userId, 'preferredShiftIds', value)}
          maxTagCount="responsive"
        />
      ),
    },
    {
      title: 'Ca không thể làm',
      width: 220,
      render: (_, employee) => (
        <Select
          mode="multiple"
          className="w-full"
          value={employee.unavailableShiftIds}
          options={shiftOptions}
          onChange={value => onChange(employee.userId, 'unavailableShiftIds', value)}
          maxTagCount="responsive"
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Typography.Title level={5} className="!mb-0">2. Nhập targetHours và giới hạn của từng nhân viên</Typography.Title>
      {employees.length === 0 ? (
        <Typography.Text type="secondary">Chọn nhân viên ở bước 1 để cấu hình giới hạn.</Typography.Text>
      ) : (
        <Table
          size="small"
          rowKey="userId"
          columns={columns}
          dataSource={employees}
          pagination={false}
          scroll={{ x: 1400 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}>
                <Tag color="blue">{employees.length} nhân viên được chọn</Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      )}
    </div>
  );
}
