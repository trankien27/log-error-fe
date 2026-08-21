import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Progress, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Database, Download, Upload } from 'lucide-react';
import { r2UsageService } from '../../../services/api/r2UsageService';
import { R2Usage, R2UsageStatus } from '../r2Usage.types';

/**
 * Trang giam sat han muc Cloudflare R2.
 * Chi lam moi thu cong (nut "Lam moi") - khong polling, day la trang giam sat
 * chu khong phai luong realtime.
 */

type StatusStyle = {
  label: string;
  tagColor: string;
  /**
   * AntD v6 doi cach xu ly mau hex tuy chinh cua Tag: hex -> nen sang (tint),
   * khong con la nen dac nhu v5. Muon "do + nen dac" cho Block thi phai dung
   * preset color + variant="solid".
   */
  tagVariant: 'filled' | 'solid';
  strokeColor: string;
  progressStatus: 'normal' | 'exception';
};

const STATUS_STYLES: Record<R2UsageStatus, StatusStyle> = {
  Normal: { label: 'Bình thường', tagColor: 'green', tagVariant: 'filled', strokeColor: '#52c41a', progressStatus: 'normal' },
  Info: { label: 'Theo dõi', tagColor: 'blue', tagVariant: 'filled', strokeColor: '#1677ff', progressStatus: 'normal' },
  Warning: { label: 'Cảnh báo', tagColor: 'orange', tagVariant: 'filled', strokeColor: '#fa8c16', progressStatus: 'normal' },
  Critical: { label: 'Nguy hiểm', tagColor: 'red', tagVariant: 'filled', strokeColor: '#f5222d', progressStatus: 'exception' },
  Block: { label: 'Đã chặn', tagColor: 'red', tagVariant: 'solid', strokeColor: '#cf1322', progressStatus: 'exception' },
};

const FALLBACK_STATUS_STYLE: StatusStyle = {
  label: 'Không xác định',
  tagColor: 'default',
  tagVariant: 'filled',
  strokeColor: '#8c8c8c',
  progressStatus: 'normal',
};

const DISABLED_STROKE_COLOR = '#bfbfbf';

function getStatusStyle(status: R2UsageStatus): StatusStyle {
  return STATUS_STYLES[status] ?? FALLBACK_STATUS_STYLE;
}

/**
 * Dinh dang byte theo don vi thap phan (1 GB = 1.000.000.000 byte) - dung he
 * thap phan de khop voi cach Cloudflare cong bo han muc (10 GB = 10^10 byte).
 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 0 : 2;
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: decimals })} ${units[unitIndex]}`;
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('vi-VN');
}

function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) return '0%';
  return `${percent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN');
}

/** Progress cua AntD nhan so nguyen, kep ve 0..100 de tranh thanh tran vien. */
function toProgressPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(100, Math.round(percent * 10) / 10);
}

type UsageCardProps = {
  title: string;
  icon: ReactNode;
  hint: string;
  usedText: string;
  limitText: string;
  percent: number;
  status: R2UsageStatus;
  enabled: boolean;
};

function UsageCard({ title, icon, hint, usedText, limitText, percent, status, enabled }: UsageCardProps) {
  const style = getStatusStyle(status);

  return (
    <Card
      variant="outlined"
      className={enabled ? '' : 'opacity-60'}
      title={(
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant">{icon}</span>
          <span className="font-bold">{title}</span>
        </div>
      )}
      extra={(
        <Tag
          color={enabled ? style.tagColor : 'default'}
          variant={enabled ? style.tagVariant : 'filled'}
          title={`Trạng thái backend: ${status}`}
        >
          {enabled ? style.label : 'Không hoạt động'}
        </Tag>
      )}
    >
      <p className="mb-3 text-xs text-on-surface-variant">{hint}</p>

      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold text-on-surface">{usedText}</span>
        <span className="text-xs font-semibold text-on-surface-variant">/ {limitText}</span>
      </div>

      <Progress
        percent={toProgressPercent(percent)}
        status={enabled ? style.progressStatus : 'normal'}
        strokeColor={enabled ? style.strokeColor : DISABLED_STROKE_COLOR}
        format={() => formatPercent(percent)}
      />
    </Card>
  );
}

export default function R2UsageTab() {
  const [usage, setUsage] = useState<R2Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await r2UsageService.get();
      setUsage(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Không tải được thông tin hạn mức Cloudflare R2.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chi tai 1 lan khi vao trang; lam moi bang nut bam. Khong dat interval.
  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const isEnabled = usage?.enabled === true;

  return (
    <div className="space-y-6 text-left text-on-surface animate-fadeIn">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Hạn mức Cloudflare R2</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Theo dõi dung lượng lưu trữ và số thao tác Class A / Class B đã dùng so với hạn mức miễn phí.
            Số liệu do hệ thống tự đếm nên có thể cao hơn một chút so với thống kê của Cloudflare.
          </p>
        </div>
        <Button icon={<ReloadOutlined />} loading={isLoading} onClick={() => void loadUsage()}>
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          title="Không tải được dữ liệu hạn mức"
          description={error}
        />
      )}

      {usage && !isEnabled && (
        <Alert
          type="info"
          showIcon
          title="Cloudflare R2 chưa được cấu hình — hệ thống đang dùng phương án dự phòng"
          description={
            'Tệp đính kèm và ảnh tài liệu vẫn được lưu bình thường qua Telegram / base64 trong cơ sở dữ liệu. '
            + 'Các chỉ số bên dưới sẽ bắt đầu chạy ngay khi thông tin kết nối R2 được điền vào cấu hình.'
          }
        />
      )}

      {usage && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-outline-variant bg-surface-2 px-4 py-3 text-xs text-on-surface-variant">
          <span>
            Kỳ thống kê thao tác:{' '}
            <strong className="text-on-surface">
              Tháng {usage.month}/{usage.year}
            </strong>{' '}
            (Class A / Class B reset mỗi tháng, dung lượng lưu trữ thì không)
          </span>
          <span>
            Số đối tượng đang lưu: <strong className="text-on-surface">{formatCount(usage.objectCount)}</strong>
          </span>
          <span>
            Thao tác miễn phí: <strong className="text-on-surface">{formatCount(usage.freeRequests)}</strong>
          </span>
          <span>
            Cập nhật lúc: <strong className="text-on-surface">{formatDateTime(usage.updatedAt)}</strong>
          </span>
        </div>
      )}

      {usage ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UsageCard
            title="Dung lượng lưu trữ"
            icon={<Database className="h-4 w-4" />}
            hint="Tổng dung lượng đang chiếm trên bucket. Không reset theo tháng."
            usedText={formatBytes(usage.storage.usedBytes)}
            limitText={formatBytes(usage.storage.limitBytes)}
            percent={usage.storage.percent}
            status={usage.storage.status}
            enabled={isEnabled}
          />
          <UsageCard
            title="Thao tác Class A"
            icon={<Upload className="h-4 w-4" />}
            hint="Thao tác ghi (tải lên, sao chép, liệt kê). Tính theo tháng."
            usedText={formatCount(usage.classA.used)}
            limitText={formatCount(usage.classA.limit)}
            percent={usage.classA.percent}
            status={usage.classA.status}
            enabled={isEnabled}
          />
          <UsageCard
            title="Thao tác Class B"
            icon={<Download className="h-4 w-4" />}
            hint="Thao tác đọc (tải xuống, xem thông tin tệp). Tính theo tháng."
            usedText={formatCount(usage.classB.used)}
            limitText={formatCount(usage.classB.limit)}
            percent={usage.classB.percent}
            status={usage.classB.status}
            enabled={isEnabled}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card variant="outlined" loading={isLoading} />
          <Card variant="outlined" loading={isLoading} />
          <Card variant="outlined" loading={isLoading} />
        </div>
      )}
    </div>
  );
}
