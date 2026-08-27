import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useBoothGuestStore } from '../../../stores/useBoothGuestStore';

const SECURITY_QUESTION = 'Ai là người tạo ra trang web này?';
const SECURITY_ANSWER = 'kien';
const MAX_SECURITY_ATTEMPTS = 3;

function normalizeAnswer(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function AuthPage() {
  const navigate = useNavigate();

  const { questionAuth, isLoading } = useAuthStore();
  const { continueAsQuestionGuest } = useBoothGuestStore();

  const [stage, setStage] = useState<'question' | 'choice'>('question');
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [questionError, setQuestionError] = useState('');
  const [fullName, setFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const isLocked = attempts >= MAX_SECURITY_ATTEMPTS;

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError('');

    const normalized = normalizeAnswer(answer);
    if (!normalized || normalized.includes(' ')) {
      const message = 'Chỉ cần gõ tên 1 từ duy nhất.';
      setQuestionError(message);
      toast.error(message);
      return;
    }

    if (normalized !== SECURITY_ANSWER) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setAnswer('');

      const message = nextAttempts >= MAX_SECURITY_ATTEMPTS
        ? 'Bạn đã nhập sai quá 3 lần.'
        : `Câu trả lời chưa đúng. Còn ${MAX_SECURITY_ATTEMPTS - nextAttempts} lần thử.`;
      setQuestionError(message);
      toast.error(message);
      return;
    }

    toast.success('Câu trả lời chính xác.');
    setStage('choice');
    setQuestionError('');
  };

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
      const user = await questionAuth(answer.trim(), authEmail.trim(), authPassword, fullName.trim() || undefined);
      const isGuestUser = user.role === 4 || user.role === 'Guest' || user.role === 'guest';
      toast.success(isGuestUser ? 'Tài khoản khách đã sẵn sàng.' : 'Đăng nhập thành công.');

      if (isGuestUser) {
        continueAsQuestionGuest();
        navigate('/booth/print-image', { replace: true });
      } else {
        navigate('/overview');
      }

      setFullName('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      const message = err.message || 'Xác thực không thành công.';
      setAuthError(message);
      toast.error(message);
    }
  };

  const handleGuestContinue = () => {
    continueAsQuestionGuest();
    toast.success('Đang tiếp tục với vai trò khách.');
    navigate('/booth/print-image', { replace: true });
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
          <p className="text-sm text-on-surface-variant">
            {stage === 'question' ? 'Trả lời câu hỏi để tiếp tục' : 'Chọn cách bạn muốn sử dụng hệ thống'}
          </p>
        </div>

        {stage === 'question' ? (
          <form onSubmit={handleQuestionSubmit} className="space-y-4 text-left">
            <label className="block text-sm font-semibold text-on-surface">
              {SECURITY_QUESTION}
              <input
                type="text"
                autoFocus
                autoComplete="off"
                placeholder="Chỉ gõ tên 1 từ"
                value={answer}
                disabled={isLocked}
                onChange={e => {
                  setAnswer(e.target.value);
                  setQuestionError('');
                }}
                aria-invalid={Boolean(questionError)}
                className={`mt-1.5 w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition disabled:bg-surface-2 ${
                  questionError ? 'border-error focus:ring-2 focus:ring-error/10' : 'border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10'
                }`}
              />
            </label>

            <p className="text-xs font-medium text-on-surface-variant">
              Lưu ý: chỉ cần gõ tên 1 từ duy nhất.
            </p>

            {questionError && (
              <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs font-medium text-on-error-container">
                {questionError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLocked}
              className="btn-primary w-full h-12"
            >
              Tiếp tục
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              <label className="block text-sm font-semibold text-on-surface">
                Tên hiển thị
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Chỉ cần nhập khi email chưa có tài khoản"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

              <label className="block text-sm font-semibold text-on-surface">
                Email
                <input
                  type="email"
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
                    placeholder="Email cũ: nhập mật khẩu cũ. Email mới: tạo mật khẩu."
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
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập hoặc tạo tài khoản'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGuestContinue}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface text-sm font-bold text-on-surface hover:bg-surface-2 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <UserRound className="h-4 w-4" />
              Tiếp tục với vai trò khách
            </button>

            <button
              type="button"
              onClick={() => {
                setStage('question');
                setAnswer('');
              }}
              className="w-full text-xs font-bold text-on-surface-variant hover:text-primary inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Trả lời lại câu hỏi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
