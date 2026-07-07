import { Alert, List, Typography } from 'antd';
import { QuickArrangeWorkScheduleResponse } from '../types/quickArrange.types';
import { formatShiftTime, formatWorkDateLabel } from '../utils/week.utils';

type Props = {
  result: QuickArrangeWorkScheduleResponse;
};

export default function QuickArrangeResult({ result }: Props) {
  return (
    <div className="space-y-3">
      <Alert
        type={result.warnings.length > 0 ? 'warning' : 'success'}
        showIcon
        message={`Đã tạo ${result.createdShiftCount}/${result.requestedShiftCount} khung giờ.`}
        description={`Tổng giờ sau khi xếp: ${result.finalHours}/${result.targetHours} giờ.`}
      />
      {result.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Cảnh báo từ hệ thống"
          description={
            <ul className="pl-4 list-disc">
              {result.warnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          }
        />
      )}
      <div>
        <Typography.Text strong>Danh sách lịch đã tạo</Typography.Text>
        <List
          size="small"
          dataSource={result.items}
          renderItem={item => (
            <List.Item>
              {formatWorkDateLabel(item.workDate)} — {item.shiftCode} — {formatShiftTime(item.startTime, item.endTime)}
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}
