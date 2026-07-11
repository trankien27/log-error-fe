import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function AuthPage() {
  const navigate = useNavigate();

  const { login, isLoading } = useAuthStore();

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authEmail.trim() || !authPassword.trim()) {
      const message = 'Vui lòng nhập email và mật khẩu.';
      setAuthError(message);
      toast.error(message);
      return;
    }

    try {
      await login(authEmail.trim(), authPassword);
      toast.success('Đăng nhập thành công.');
      navigate('/overview');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      const message = err.message || 'Xác thực không thành công.';
      setAuthError(message);
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 animate-fadeIn overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />
      <div className="relative w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-brand">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold text-on-surface">IT Admin System</h1>
          <p className="text-sm text-on-surface-variant">Đăng nhập để quản trị hệ thống nội bộ</p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
          <label className="block text-sm font-semibold text-on-surface">
            Email
            <input
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="name@company.com"
              value={authEmail}
              onChange={e => {
                setAuthEmail(e.target.value);
                setAuthError('');
              }}
              aria-invalid={Boolean(authError)}
              className={`mt-1.5 w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition ${
                authError ? 'border-error focus:ring-2 focus:ring-error/10' : 'border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10'
              }`}
            />
          </label>
          <label className="block text-sm font-semibold text-on-surface">
            Mật khẩu
            <span className="relative mt-1.5 block">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={authPassword}
                onChange={e => {
                  setAuthPassword(e.target.value);
                  setAuthError('');
                }}
                aria-invalid={Boolean(authError)}
                className={`w-full px-3 py-2.5 pr-11 border rounded-lg text-sm outline-none transition ${
                  authError ? 'border-error focus:ring-2 focus:ring-error/10' : 'border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(current => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          {authError && (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs font-medium text-on-error-container">
              {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full h-12"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
