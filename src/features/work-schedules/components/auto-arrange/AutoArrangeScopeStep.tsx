import { DatePicker, Form, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { User } from '../../../../types';
import { AutoArrangeOptionsResponse } from '../../types/workScheduleArrange.types';
import { formatWeekRange, toIsoDate } from '../../utils/week.utils';

type Props = {
  selectedDate: string;
  storeId: string | number | null;
  departmentId: string | number | null;
  selectedUserIds: string[];
  users: User[];
  options: AutoArrangeOptionsResponse | null;
  onDateChange: (date: string) => void;
  onScopeChange: (field: 'storeId' | 'departmentId', value: string | number | null) => void;
  onUsersChange: (userIds: string[]) => void;
};

export default function AutoArrangeScopeStep({
  selectedDate,
  storeId,
  departmentId,
  selectedUserIds,
  users,
  options,
  onDateChange,
  onScopeChange,
  onUsersChange,
}: Props) {
  return (
    <div className="space-y-4">
      <Typography.Title level={5} className="!mb-0">1. Chọn tuần, cửa hàng/phòng ban và danh sách nhân viên</Typography.Title>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Form.Item label="Tuần làm việc" className="!mb-0">
          <DatePicker
            className="w-full"
            value={dayjs(selectedDate)}
            format="DD/MM/YYYY"
            onChange={value => {
              if (value) onDateChange(toIsoDate(value));
            }}
          />
          <Typography.Text type="secondary" className="block mt-1 text-xs">
            {formatWeekRange(selectedDate)}
          </Typography.Text>
        </Form.Item>
        <Form.Item label="Cửa hàng" className="!mb-0">
          <Select
            allowClear
            placeholder="Tất cả cửa hàng"
            value={storeId}
            onChange={value => onScopeChange('storeId', value ?? null)}
            options={(options?.stores || []).map(store => ({ value: store.id, label: store.name }))}
          />
        </Form.Item>
        <Form.Item label="Phòng ban" className="!mb-0">
          <Select
            allowClear
            placeholder="Tất cả phòng ban"
            value={departmentId}
            onChange={value => onScopeChange('departmentId', value ?? null)}
            options={(options?.departments || []).map(department => ({ value: department.id, label: department.name }))}
          />
        </Form.Item>
      </div>
      <Form.Item label="Nhân viên" className="!mb-0">
        <Select
          mode="multiple"
          showSearch
          placeholder="Chọn nhân viên cần chia ca"
          value={selectedUserIds}
          onChange={onUsersChange}
          optionFilterProp="label"
          options={users.map(user => ({
            value: user.id,
            label: `${user.name} — ${user.department || 'Chưa có phòng ban'}`,
          }))}
        />
      </Form.Item>
    </div>
  );
}
