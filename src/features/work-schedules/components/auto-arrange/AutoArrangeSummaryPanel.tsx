import { Alert, Statistic } from 'antd';
import { AutoArrangeSummary } from '../../types/workScheduleArrange.types';

type Props = {
  summary: AutoArrangeSummary | null;
  warnings: string[];
  conflicts: string[];
};

export default function AutoArrangeSummaryPanel({ summary, warnings, conflicts }: Props) {
  if (!summary) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Statistic title="CoverageRate" value={summary.coverageRate} suffix="%" precision={1} />
        <Statistic title="Ca đủ người" value={summary.enoughShiftCount} />
        <Statistic title="Ca thiếu người" value={summary.understaffedShiftCount} />
        <Statistic title="NV thiếu giờ" value={summary.underTargetEmployeeCount} />
        <Statistic title="NV vượt giờ" value={summary.overTargetEmployeeCount} />
      </div>
      {warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Cảnh báo preview"
          description={<ul className="pl-4 list-disc">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
        />
      )}
      {conflicts.length > 0 && (
        <Alert
          type="error"
          showIcon
          message="Lỗi cần xử lý"
          description={<ul className="pl-4 list-disc">{conflicts.map(item => <li key={item}>{item}</li>)}</ul>}
        />
      )}
    </div>
  );
}
