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
        description: `Đã kết nối app booth tại ${BOOTH_LOCAL_BASE_URL}. Mọi thao tác chạy ngay trên máy này.`,
      }
    : status === 'checking'
      ? {
          className: 'border-outline-variant bg-surface-2 text-on-surface-variant',
          title: 'Đang kiểm tra thiết bị…',
          description: `Đang thử kết nối ${BOOTH_LOCAL_BASE_URL}.`,
        }
      : {
          className: 'border-error/30 bg-error-container text-on-error-container',
          title: 'Thiết bị không phải booth',
          description: errorMessage
            || `Không gọi được ${BOOTH_LOCAL_BASE_URL}. Hãy mở trang này ngay trên máy booth.`,
        };

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center ${banner.className}`}>
      <div className="flex flex-1 min-w-0 items-start gap-3">
        {status === 'checking'
          ? <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
          : status === 'unavailable'
            ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            : <MonitorSmartphone className="w-5 h-5 shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold">{banner.title}</p>
          <p className="text-sm mt-0.5 break-words opacity-90">{banner.description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRecheck}
        disabled={status === 'checking'}
        className="shrink-0 h-11 px-4 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-surface-2 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'checking'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <RefreshCw className="w-4 h-4" />}
        Kiểm tra lại
      </button>
    </div>
  );
}
