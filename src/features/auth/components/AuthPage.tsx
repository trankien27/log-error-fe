import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function AuthPage() {
  const navigate = useNavigate();

  const { login, isLoading } = useAuthStore();

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authEmail.trim() || !authPassword.trim()) {
      toast.error('Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      await login(authEmail.trim(), authPassword);
      toast.success('Đăng nhập thành công.');
      navigate('/overview');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Xác thực không thành công.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7ff] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-outline-variant rounded-2xl shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-[#191b23]">IT Admin System</h1>
          <p className="text-xs text-[#434655]">Đăng nhập để vào hệ thống nội bộ</p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3 text-left">
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-[#004ac6]"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-[#004ac6]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#004ac6] text-white rounded-lg text-sm font-bold hover:bg-primary-container cursor-pointer transition-all active:scale-95 shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
