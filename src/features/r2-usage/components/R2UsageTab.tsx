import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'antd';
import { Database, Download, Loader2, RefreshCw, Upload, type LucideIcon } from 'lucide-react';
import { PageHeader, SectionCard, Skeleton } from '../../../components/ui';
import { r2UsageService } from '../../../services/api/r2UsageService';
import { R2Usage, R2UsageStatus } from '../r2Usage.types';

/**
 * Trang giam sat han muc Cloudflare R2.
 * Chi lam moi thu cong (nut "Lam moi") - khong polling, day la trang giam sat
 * chu khong phai luong realtime.
 */

type StatusStyle = {
  label: string;
  /** Lop badge theo token (tu dong dung mau dark mode). */
  badgeClass: string;
  /** Mau thanh tien do: CSS variable cua theme. */
  barColor: string;
};

const STATUS_STYLES: Record<R2UsageStatus, StatusStyle> = {
  Normal: { label: 'Bình thường', badgeClass: 'badge-success', barColor: 'var(--color-success)' },
  Info: { label: 'Theo dõi', badgeClass: 'badge-info', barColor: 'var(--color-primary)' },
  Warning: { label: 'Cảnh báo', badgeClass: 'badge-warning', barColor: 'var(--color-warning)' },
  Critical: { label: 'Nguy hiểm', badgeClass: 'badge-error', barColor: 'var(--color-error)' },
  // Block: nen dac de noi bat hon Critical.
  Block: {
    label: 'Đã chặn',
    badgeClass: 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-error text-on-primary',
    barColor: 'var(--color-error)',
  },
};

const FALLBACK_STATUS_STYLE: StatusStyle = {
  label: 'Không xác định',
  badgeClass: 'badge-info',
  barColor: 'var(--color-on-surface-variant)',
};

const DISABLED_BAR_COLOR = 'var(--color-outline-variant)';

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

/** Kep phan tram ve 0..100 de thanh tien do khong tran vien. */
function toProgressPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(100, Math.round(percent * 10) / 10);
}

type UsageCardProps = {
  title: string;
  icon: LucideIcon;
  hint: string;
  usedText: string;
  limitText: string;
  percent: number;
  status: R2UsageStatus;
  enabled: boolean;
};

function UsageCard({ title, icon, hint, usedText, limitText, percent, status, enabled }: UsageCardProps) {
  const style = getStatusStyle(status);
  const progress = toProgressPercent(percent);

  return (
    <SectionCard
      title={title}
      icon={icon}
      className={enabled ? '' : 'opacity-60'}
      actions={(
        <span
          className={enabled ? style.badgeClass : 'badge-info'}
          title={`Trạng thái backend: ${status}`}
        >
          {enabled ? style.label : 'Không hoạt động'}
        </span>
      )}
    >
      <p className="mb-4 text-sm text-on-surface-variant">{hint}</p>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold text-on-surface tabular-nums">{usedText}</span>
        <span className="text-sm text-on-surface-variant tabular-nums">/ {limitText}</span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%`, backgroundColor: enabled ? style.barColor : DISABLED_BAR_COLOR }}
          />
        </div>
        <span className="w-14 shrink-0 text-right text-xs font-medium text-on-surface-variant tabular-nums">
          {formatPercent(percent)}
        </span>
      </div>
    </SectionCard>
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
    <div className="space-y-5 text-left text-on-surface animate-fadeIn">
      <PageHeader
        title="Dung lượng lưu trữ"
        description="Theo dõi dung lượng và số thao tác Cloudflare R2 so với hạn mức miễn phí."
        icon={Database}
        className="!mb-0"
        actions={(
          <button type="button" className="btn-secondary" disabled={isLoading} onClick={() => void loadUsage()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        )}
      />

      {error && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải dữ liệu hạn mức"
          description={error}
        />
      )}

      {usage && !isEnabled && (
        <Alert
          type="info"
          showIcon
          title="Chưa cấu hình Cloudflare R2 — đang dùng phương án dự phòng"
          description={
            'Tệp đính kèm và ảnh tài liệu vẫn được lưu bình thường qua Telegram / base64 trong cơ sở dữ liệu. '
            + 'Các chỉ số bên dưới sẽ chạy ngay khi bạn điền thông tin kết nối R2.'
          }
        />
      )}

      {usage && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-outline-variant bg-surface-2/60 px-4 py-3 text-sm text-on-surface-variant">
          <span>
            Kỳ thống kê thao tác:{' '}
            <strong className="font-medium text-on-surface">
              Tháng {usage.month}/{usage.year}
            </strong>{' '}
            <span className="text-xs">(Class A / B làm mới mỗi tháng, dung lượng thì không)</span>
          </span>
          <span>
            Số tệp đang lưu: <strong className="font-medium text-on-surface">{formatCount(usage.objectCount)}</strong>
          </span>
          <span>
            Thao tác miễn phí: <strong className="font-medium text-on-surface">{formatCount(usage.freeRequests)}</strong>
          </span>
          <span>
            Cập nhật lúc: <strong className="font-medium text-on-surface">{formatDateTime(usage.updatedAt)}</strong>
          </span>
        </div>
      )}

      {usage ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UsageCard
            title="Dung lượng lưu trữ"
            icon={Database}
            hint="Tổng dung lượng đang chiếm trên bucket. Không reset theo tháng."
            usedText={formatBytes(usage.storage.usedBytes)}
            limitText={formatBytes(usage.storage.limitBytes)}
            percent={usage.storage.percent}
            status={usage.storage.status}
            enabled={isEnabled}
          />
          <UsageCard
            title="Thao tác Class A"
            icon={Upload}
            hint="Thao tác ghi (tải lên, sao chép, liệt kê). Tính theo tháng."
            usedText={formatCount(usage.classA.used)}
            limitText={formatCount(usage.classA.limit)}
            percent={usage.classA.percent}
            status={usage.classA.status}
            enabled={isEnabled}
          />
          <UsageCard
            title="Thao tác Class B"
            icon={Download}
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
          {[0, 1, 2].map(index => (
            <div key={index} className="card-surface space-y-4 p-5" aria-busy={isLoading}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
