import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, MonitorSmartphone, Printer, Wand2 } from 'lucide-react';
import { useBoothGuestStore } from '../../../stores/useBoothGuestStore';

// Layout rieng cho phien dung bang ma PIN: khong dung MainLayout vi layout do
// preload cac API can JWT, guest khong co token.
export default function BoothGuestLayout() {
  const navigate = useNavigate();
  const { session, exit } = useBoothGuestStore();

  const tabClass = ({ isActive }: { isActive: boolean }) => (
    `h-12 px-4 sm:px-5 rounded-xl text-base font-medium inline-flex flex-1 sm:flex-none items-center justify-center gap-2 transition-colors select-none ${
      isActive
        ? 'bg-primary-subtle text-primary'
        : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
    }`
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary shadow-brand shrink-0">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-on-surface truncate">Chế độ booth</p>
              <p className="text-sm text-on-surface-variant truncate">
                {session?.boothCode
                  ? `Booth ${session.boothCode}`
                  : session?.source === 'question'
                  ? 'Đang dùng vai trò khách'
                  : 'Đã xác thực bằng mã PIN'}
              </p>
            </div>
          </div>

          <nav className="order-last sm:order-none w-full sm:w-auto flex items-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-2/60 p-1" aria-label="Chức năng booth">
            <NavLink to="/booth/print-image" className={tabClass}>
              <Printer className="w-5 h-5" />
              In ảnh
            </NavLink>
            <NavLink to="/booth/recreate-image" className={tabClass}>
              <Wand2 className="w-5 h-5" />
              Tạo lại ảnh
            </NavLink>
          </nav>

          <button
            type="button"
            onClick={() => {
              exit();
              navigate('/auth', { replace: true });
            }}
            className="btn-secondary h-12 px-5 text-base"
          >
            <LogOut className="w-5 h-5" />
            Thoát
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
