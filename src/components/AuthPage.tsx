import React from 'react';

interface AuthPageProps {
  authMode: 'login' | 'register';
  setAuthMode: React.Dispatch<React.SetStateAction<'login' | 'register'>>;
  authName: string;
  setAuthName: React.Dispatch<React.SetStateAction<string>>;
  authEmail: string;
  setAuthEmail: React.Dispatch<React.SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: React.Dispatch<React.SetStateAction<string>>;
  authConfirmPassword: string;
  setAuthConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  handleAuthSubmit: (e: React.FormEvent) => void;
}

export default function AuthPage({
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authConfirmPassword,
  setAuthConfirmPassword,
  handleAuthSubmit,
}: AuthPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f7ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-outline-variant rounded-2xl shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-[#191b23]">IT Admin System</h1>
          <p className="text-xs text-[#434655]">
            {authMode === 'login' ? 'Đăng nhập để vào hệ thống' : 'Tạo tài khoản mới'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-[#f3f3fe] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`py-2 rounded-md text-xs font-bold ${authMode === 'login' ? 'bg-white text-[#004ac6]' : 'text-[#737686]'}`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`py-2 rounded-md text-xs font-bold ${authMode === 'register' ? 'bg-white text-[#004ac6]' : 'text-[#737686]'}`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Họ và tên"
              value={authName}
              onChange={e => setAuthName(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-[#004ac6]"
            />
          )}
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
          {authMode === 'register' && (
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={authConfirmPassword}
              onChange={e => setAuthConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-[#004ac6]"
            />
          )}
          <button
            type="submit"
            className="w-full py-2.5 bg-[#004ac6] text-white rounded-lg text-sm font-bold hover:bg-primary-container"
          >
            {authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
}
