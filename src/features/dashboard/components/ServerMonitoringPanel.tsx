import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Cpu, Loader2, MemoryStick, RefreshCw, Server } from 'lucide-react';
import {
  ServerMonitoringStatus,
  serverMonitoringService,
} from '../../../services/api/serverMonitoringService';

type ResourceCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  percent: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatPercent(value: number) {
  return `${clampPercent(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: unitIndex < 2 ? 0 : 1 })} ${units[unitIndex]}`;
}

function formatSampleTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function getUsageStyle(percent: number) {
  if (percent >= 85) {
    return {
      label: 'Cao',
      badge: 'border-error/30 bg-error-container text-on-error-container',
      bar: 'bg-error',
    };
  }

  if (percent >= 70) {
    return {
      label: 'Cần theo dõi',
      badge: 'border-warning/30 bg-warning-container text-on-warning-container',
      bar: 'bg-warning',
    };
  }

  return {
    label: 'Bình thường',
    badge: 'border-success/30 bg-success-container text-on-success-container',
    bar: 'bg-success',
  };
}

function ResourceCard({ icon, label, value, detail, percent }: ResourceCardProps) {
  const normalizedPercent = clampPercent(percent);
  const style = getUsageStyle(normalizedPercent);

  return (
    <article className="rounded-lg border border-outline-variant bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface text-primary">
            {icon}
          </span>
          <div>
            <p className="text-xs font-bold text-on-surface-variant">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-on-surface">{value}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${style.badge}`}>
          {style.label}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${style.bar}`}
          style={{ width: `${normalizedPercent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-on-surface-variant">
        <span>{detail}</span>
        <span className="tabular-nums">{formatPercent(normalizedPercent)}</span>
      </div>
    </article>
  );
}

export default function ServerMonitoringPanel() {
  const [status, setStatus] = useState<ServerMonitoringStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await serverMonitoringService.getStatus();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải trạng thái máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chỉ lấy mẫu khi mở trang hoặc khi người dùng chủ động bấm làm mới; không polling.
  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <section className="card-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <Server className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-on-surface">Tài nguyên máy chủ backend</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              CPU và RAM được lấy một lần khi mở trang, không cập nhật realtime.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={isLoading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-error/30 bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
          {error}
        </div>
      )}

      {status ? (
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <ResourceCard
            icon={<Cpu className="h-4 w-4" />}
            label="CPU"
            value={formatPercent(status.cpu.usagePercent)}
            detail="Mức sử dụng tại thời điểm lấy mẫu"
            percent={status.cpu.usagePercent}
          />
          <ResourceCard
            icon={<MemoryStick className="h-4 w-4" />}
            label="RAM"
            value={formatPercent(status.memory.usagePercent)}
            detail={`${formatBytes(status.memory.usedBytes)} / ${formatBytes(status.memory.totalBytes)}`}
            percent={status.memory.usagePercent}
          />
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center p-4 text-xs font-semibold text-on-surface-variant">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lấy trạng thái máy chủ...
            </>
          ) : (
            'Chưa có dữ liệu máy chủ.'
          )}
        </div>
      )}

      {status && (
        <div className="border-t border-outline-variant px-4 py-2 text-right text-[10px] font-semibold text-on-surface-variant/70">
          Lấy mẫu lúc {formatSampleTime(status.sampledAt)}
        </div>
      )}
    </section>
  );
}
