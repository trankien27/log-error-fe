import { DatePicker, Form, InputNumber, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { User } from '../../../types';
import { QuickArrangeFormState } from '../types/quickArrange.types';
import { formatWeekRange, toIsoDate } from '../utils/week.utils';

type Props = {
  formState: QuickArrangeFormState;
  users: User[];
  onFieldChange: <K extends keyof QuickArrangeFormState>(field: K, value: QuickArrangeFormState[K]) => void;
};

export default function QuickArrangeGeneralForm({ formState, users, onFieldChange }: Props) {
  return (
    <div className="space-y-3">
      <Typography.Title level={5} className="!mb-0">Thông tin chung</Typography.Title>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Form.Item label="Nhân viên *" className="!mb-0">
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            value={formState.userId}
            onChange={(value: string) => onFieldChange('userId', value)}
            optionFilterProp="label"
            options={users.map(user => ({
              value: user.id,
              label: `${user.name} — ${user.department || 'Chưa có phòng ban'}`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Kiểu đề xuất" className="!mb-0">
          <Select
            value={formState.periodType}
            onChange={value => onFieldChange('periodType', value)}
            options={[
              { value: 'week', label: 'Theo tuần' },
              { value: 'month', label: 'Theo tháng' },
            ]}
          />
        </Form.Item>

        <Form.Item label={formState.periodType === 'month' ? 'Tháng' : 'Tuần làm việc'} className="!mb-0">
          <DatePicker
            className="w-full"
            picker={formState.periodType === 'month' ? 'month' : 'date'}
            value={dayjs(formState.selectedDate)}
            format={formState.periodType === 'month' ? 'MM/YYYY' : 'DD/MM/YYYY'}
            onChange={value => {
              if (value) onFieldChange('selectedDate', toIsoDate(value));
            }}
          />
          <Typography.Text type="secondary" className="block mt-1 text-xs">
            {formState.periodType === 'month'
              ? `Tháng ${dayjs(formState.selectedDate).format('MM/YYYY')}`
              : formatWeekRange(formState.selectedDate)}
          </Typography.Text>
        </Form.Item>

        <Form.Item label="Số giờ mục tiêu *" className="!mb-0">
          <InputNumber
            className="w-full"
            min={1}
            step={0.5}
            suffix="giờ"
            value={formState.targetHours}
            onChange={value => onFieldChange('targetHours', value)}
          />
        </Form.Item>
      </div>
    </div>
  );
}
