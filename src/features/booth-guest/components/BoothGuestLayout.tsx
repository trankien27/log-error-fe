import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, MonitorSmartphone, Printer, Wand2 } from 'lucide-react';
import { useBoothGuestStore } from '../../../stores/useBoothGuestStore';

// Layout rieng cho phien dung bang ma PIN: khong dung MainLayout vi layout do
// preload cac API can JWT, guest khong co token.
export default function BoothGuestLayout() {
  const navigate = useNavigate();
  const { session, exit } = useBoothGuestStore();

  const tabClass = ({ isActive }: { isActive: boolean }) => (
    `h-10 px-4 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
      isActive
        ? 'bg-secondary-container text-primary'
        : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
    }`
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shrink-0">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">Chế độ booth</p>
              <p className="text-[11px] text-on-surface-variant truncate">
                {session?.boothCode ? `Booth ${session.boothCode}` : 'Đã xác thực bằng mã PIN'}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5">
            <NavLink to="/booth/print-image" className={tabClass}>
              <Printer className="w-4 h-4" />
              In ảnh
            </NavLink>
            <NavLink to="/booth/recreate-image" className={tabClass}>
              <Wand2 className="w-4 h-4" />
              Tạo lại ảnh
            </NavLink>
          </nav>

          <button
            type="button"
            onClick={() => {
              exit();
              navigate('/auth', { replace: true });
            }}
            className="h-10 px-4 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
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
