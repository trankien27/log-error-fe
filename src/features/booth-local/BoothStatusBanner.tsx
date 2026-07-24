import { AlertCircle, Loader2, MonitorSmartphone, RefreshCw } from 'lucide-react';
import {
  BOOTH_LOCAL_BASE_URL,
  LocalBoothInfo,
} from '../../services/api/localBoothPrintService';
import { BoothLocalStatus } from './useBoothLocal';

type BoothStatusBannerProps = {
  status: BoothLocalStatus;
  boothInfo: LocalBoothInfo | null;
  errorMessage: string;
  onRecheck: () => void;
};

export default function BoothStatusBanner({
  status,
  boothInfo,
  errorMessage,
  onRecheck,
}: BoothStatusBannerProps) {
  const banner = status === 'available'
    ? {
        className: 'border-success/30 bg-success-container text-on-success-container',
        title: `Thiết bị là booth${boothInfo?.boothCode ? ` · ${boothInfo.boothCode}` : ''}`,
        description: `Đã kết nối app booth tại ${BOOTH_LOCAL_BASE_URL}. Dữ liệu và lệnh đều chạy trên chính máy này.`,
      }
    : status === 'checking'
      ? {
          className: 'border-outline-variant bg-surface-2 text-on-surface-variant',
          title: 'Đang kiểm tra thiết bị...',
          description: `Đang thử kết nối ${BOOTH_LOCAL_BASE_URL}.`,
        }
      : {
          className: 'border-error/30 bg-error-container text-on-error-container',
          title: 'Thiết bị không phải booth',
          description: errorMessage
            || `Không gọi được ${BOOTH_LOCAL_BASE_URL}. Hãy mở trang này ngay trên máy booth.`,
        };

  return (
    <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${banner.className}`}>
      {status === 'checking'
        ? <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
        : status === 'unavailable'
          ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          : <MonitorSmartphone className="w-4 h-4 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{banner.title}</p>
        <p className="text-[11px] font-medium mt-0.5 break-words">{banner.description}</p>
      </div>
      <button
        type="button"
        onClick={onRecheck}
        disabled={status === 'checking'}
        className="shrink-0 h-8 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'checking'
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />}
        Kiểm tra
      </button>
    </div>
  );
}
