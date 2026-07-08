import { Collapse, Form, Input, InputNumber, Switch, Typography } from 'antd';
import { QuickArrangeFormState } from '../types/quickArrange.types';

type Props = {
  formState: QuickArrangeFormState;
  onFieldChange: <K extends keyof QuickArrangeFormState>(field: K, value: QuickArrangeFormState[K]) => void;
};

export default function QuickArrangeAdvancedOptions({ formState, onFieldChange }: Props) {
  return (
    <Collapse
      items={[
        {
          key: 'advanced',
          label: 'Tùy chọn nâng cao',
          children: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="Ghi đè lịch hiện có" className="!mb-0">
                <Switch
                  checked={formState.overwriteExisting}
                  onChange={value => onFieldChange('overwriteExisting', value)}
                />
                <Typography.Text type="secondary" className="block text-xs mt-1">
                  Cho phép thay thế các lịch chưa hoàn thành trong tuần.
                </Typography.Text>
              </Form.Item>
              <Form.Item label="Cho phép lưu một phần" className="!mb-0">
                <Switch
                  checked={formState.allowPartialArrange}
                  onChange={value => onFieldChange('allowPartialArrange', value)}
                />
                <Typography.Text type="secondary" className="block text-xs mt-1">
                  Nếu không thể xếp đủ toàn bộ khung giờ, hệ thống vẫn lưu các lịch hợp lệ.
                </Typography.Text>
              </Form.Item>
              <Form.Item label="Số khung tối đa mỗi ngày" className="!mb-0">
                <InputNumber
                  className="w-full"
                  min={1}
                  max={3}
                  value={formState.maxShiftsPerDay}
                  onChange={value => onFieldChange('maxShiftsPerDay', value ?? 1)}
                />
              </Form.Item>
              <Form.Item label="Số ngày làm liên tiếp tối đa" className="!mb-0">
                <InputNumber
                  className="w-full"
                  min={1}
                  max={7}
                  value={formState.maxConsecutiveWorkingDays}
                  onChange={value => onFieldChange('maxConsecutiveWorkingDays', value ?? 6)}
                />
              </Form.Item>
              <Form.Item label="Thời gian nghỉ tối thiểu" className="!mb-0">
                <InputNumber
                  className="w-full"
                  min={0}
                  max={24}
                  step={0.5}
                  suffix="giờ"
                  value={formState.minimumRestHours}
                  onChange={value => onFieldChange('minimumRestHours', value ?? 10)}
                />
              </Form.Item>
              <Form.Item label="Ghi chú" className="!mb-0 md:col-span-2">
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  showCount
                  value={formState.note}
                  onChange={event => onFieldChange('note', event.target.value)}
                />
              </Form.Item>
            </div>
          ),
        },
      ]}
    />
  );
}
