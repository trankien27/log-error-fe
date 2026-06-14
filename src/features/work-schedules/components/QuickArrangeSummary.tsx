import { Alert, Descriptions, Typography } from 'antd';
import { QuickArrangeOptionsResponse } from '../types/quickArrange.types';

type Props = {
  targetHours: number | null;
  allocatedHours: number;
  remainingHours: number;
  totalShiftCount: number;
  options: QuickArrangeOptionsResponse | null;
  allowOverTargetHours: boolean;
  isExactTarget: boolean;
  isOverTarget: boolean;
};

export default function QuickArrangeSummary({
  targetHours,
  allocatedHours,
  remainingHours,
  totalShiftCount,
  options,
  allowOverTargetHours,
  isExactTarget,
  isOverTarget,
}: Props) {
  const statusMessage = (() => {
    if (!targetHours) return null;
    if (isExactTarget) return <Alert type="success" showIcon message="Đã phân bổ đủ số giờ" />;
    if (isOverTarget && allowOverTargetHours) {
      return <Alert type="warning" showIcon message={`Vượt mục tiêu ${Math.abs(remainingHours)} giờ — đã cho phép vượt`} />;
    }
    if (isOverTarget) return <Alert type="error" showIcon message={`Đã vượt ${Math.abs(remainingHours)} giờ`} />;
    return <Alert type="warning" showIcon message={`Còn thiếu ${remainingHours} giờ`} />;
  })();

  return (
    <div className="space-y-3">
      <Typography.Title level={5} className="!mb-0">Tổng hợp số giờ</Typography.Title>
      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Giờ mục tiêu">{targetHours ?? 0} giờ</Descriptions.Item>
        <Descriptions.Item label="Đã xếp theo input">{allocatedHours} giờ</Descriptions.Item>
        <Descriptions.Item label="Còn lại">{remainingHours} giờ</Descriptions.Item>
        <Descriptions.Item label="Tổng số ca">{totalShiftCount} ca</Descriptions.Item>
        <Descriptions.Item label="Lịch hiện có">{options?.existingWorkingHours ?? 0} giờ</Descriptions.Item>
      </Descriptions>
      {statusMessage}
    </div>
  );
}
