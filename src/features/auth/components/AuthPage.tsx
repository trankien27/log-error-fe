import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Eye, EyeOff, Headset, KeyRound, MessageSquare, UserRound } from 'lucide-react';
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

/** `withToggle`: input sits inside a wrapper that already has the top margin and a trailing icon button. */
const inputClass = (hasError = false, withToggle = false) =>
  `${withToggle ? 'pr-11' : 'mt-1.5'} w-full h-11 px-3.5 bg-surface border rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition disabled:bg-surface-2 ${
    hasError ? 'border-error focus:ring-4 focus:ring-error/10' : 'border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10'
  }`;

const secondaryButtonClass =
  'w-full h-11 rounded-lg border border-outline-variant bg-surface text-sm font-medium text-on-surface hover:bg-surface-2 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors';

const HIGHLIGHTS = [
  { icon: AlertTriangle, title: 'Theo dõi lỗi tập trung', text: 'Nắm tình trạng booth và cửa hàng theo thời gian thực.' },
  { icon: CalendarClock, title: 'Lịch trực rõ ràng', text: 'Xếp ca, duyệt tăng ca và theo dõi công việc trong một nơi.' },
  { icon: MessageSquare, title: 'Phối hợp nhanh', text: 'Trò chuyện, thông báo và tài liệu dùng chung cho cả đội.' },
];

function isGuestRole(role: unknown) {
  return role === 4 || role === 'Guest' || role === 'guest';
}

export default function AuthPage() {
  const navigate = useNavigate();

  const { login, questionAuth, isLoading } = useAuthStore();
  const { continueAsQuestionGuest } = useBoothGuestStore();

  const [authMethod, setAuthMethod] = useState<'password' | 'question'>('password');
  const [questionStage, setQuestionStage] = useState<'answer' | 'choice'>('answer');
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [questionError, setQuestionError] = useState('');
  const [fullName, setFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const isLocked = attempts >= MAX_SECURITY_ATTEMPTS;
  const isQuestionMode = authMethod === 'question';

  const resetErrors = () => {
    setAuthError('');
    setQuestionError('');
  };

  const switchToPassword = () => {
    setAuthMethod('password');
    setQuestionStage('answer');
    resetErrors();
  };

  const switchToQuestion = () => {
    setAuthMethod('question');
    resetErrors();
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
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
    setQuestionStage('choice');
    setQuestionError('');
  };

  const handleQuestionAccountSubmit = async (e: React.FormEvent) => {
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
      const guestUser = isGuestRole(user.role);
      toast.success(guestUser ? 'Tài khoản khách đã sẵn sàng.' : 'Đăng nhập thành công.');

      if (guestUser) {
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
    <div className="min-h-screen bg-background grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] animate-fadeIn">
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-on-primary"
        style={{ background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-active) 100%)' }}
      >
        <div className="absolute inset-0 noise-overlay pointer-events-none" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-on-primary/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-on-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-on-primary/15 inline-flex items-center justify-center">
            <Headset className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">IT Support</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Mọi việc vận hành, gọn trong một màn hình.</h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="h-9 w-9 shrink-0 rounded-lg bg-on-primary/15 inline-flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm opacity-80">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm opacity-70">Hệ thống quản trị nội bộ</p>
      </aside>

      <main className="flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-sm space-y-7">
        <div className="space-y-2">
          <span className="lg:hidden mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary shadow-brand">
            <Headset className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-semibold text-on-surface">
            {isQuestionMode ? 'Xác thực bằng câu hỏi' : 'Chào mừng trở lại 👋'}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {isQuestionMode ? 'Trả lời câu hỏi bảo mật để tiếp tục.' : 'Đăng nhập để tiếp tục làm việc.'}
          </p>
        </div>

        {!isQuestionMode ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-left">
            <label className="block text-sm font-medium text-on-surface">
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
                className={inputClass(Boolean(authError))}
              />
            </label>

            <label className="block text-sm font-medium text-on-surface">
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
                  className={inputClass(Boolean(authError), true)}
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

            <button type="submit" disabled={isLoading} className="btn-primary w-full h-11">
              {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>

            <button
              type="button"
              onClick={switchToQuestion}
              className={secondaryButtonClass}
            >
              <KeyRound className="h-4 w-4" />
              Xác thực bằng câu hỏi
            </button>
          </form>
        ) : questionStage === 'answer' ? (
          <form onSubmit={handleQuestionSubmit} className="space-y-4 text-left">
            <label className="block text-sm font-medium text-on-surface">
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
                className={inputClass(Boolean(questionError))}
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

            <button type="submit" disabled={isLocked} className="btn-primary w-full h-11">
              Tiếp tục
            </button>

            <button
              type="button"
              onClick={switchToPassword}
              className={secondaryButtonClass}
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleQuestionAccountSubmit} className="space-y-4 text-left">
              <label className="block text-sm font-medium text-on-surface">
                Tên hiển thị
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Chỉ cần nhập khi email chưa có tài khoản"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="block text-sm font-medium text-on-surface">
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
                  className={inputClass(Boolean(authError))}
                />
              </label>

              <label className="block text-sm font-medium text-on-surface">
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
                    className={inputClass(Boolean(authError), true)}
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

              <button type="submit" disabled={isLoading} className="btn-primary w-full h-11">
                {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập hoặc tạo tài khoản'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGuestContinue}
              className={secondaryButtonClass}
            >
              <UserRound className="h-4 w-4" />
              Tiếp tục với vai trò khách
            </button>

            <button
              type="button"
              onClick={switchToPassword}
              className="w-full text-sm font-medium text-on-surface-variant hover:text-primary inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Quay lại đăng nhập
            </button>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
