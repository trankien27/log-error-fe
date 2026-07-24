import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Delete, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBoothGuestStore } from '../../../stores/useBoothGuestStore';

const PIN_LENGTH = 6;

export default function BoothPinPage() {
  const navigate = useNavigate();
  const { verifyPin, isVerifying, isBoothGuest } = useBoothGuestStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isBoothGuest) {
      navigate('/booth/print-image', { replace: true });
    }
  }, [isBoothGuest, navigate]);

  const submitPin = async (value: string) => {
    if (value.length !== PIN_LENGTH) {
      setError(`Mã PIN phải gồm ${PIN_LENGTH} chữ số.`);
      return;
    }

    setError('');
    try {
      await verifyPin(value);
      toast.success('Mã PIN hợp lệ.');
      navigate('/booth/print-image', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mã PIN không hợp lệ.';
      setError(message);
      setPin('');
      toast.error(message);
    }
  };

  const appendDigit = (digit: string) => {
    if (isVerifying || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === PIN_LENGTH) {
      void submitPin(next);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitPin(pin);
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 animate-fadeIn overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />
      <div className="relative w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-brand">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold text-on-surface">Nhập mã PIN</h1>
          <p className="text-sm text-on-surface-variant">
            Nhập mã PIN {PIN_LENGTH} chữ số để dùng chức năng in ảnh và tạo lại ảnh trên booth này.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
              value={pin}
              disabled={isVerifying}
              onChange={event => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
                setPin(digits);
                setError('');
                if (digits.length === PIN_LENGTH) {
                  void submitPin(digits);
                }
              }}
              aria-label="Mã PIN"
              aria-invalid={Boolean(error)}
              className={`w-full h-16 text-center text-3xl font-bold tracking-[0.6em] indent-[0.6em] border rounded-xl outline-none transition disabled:bg-surface-2 ${
                error
                  ? 'border-error focus:ring-2 focus:ring-error/10'
                  : 'border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10'
              }`}
            />
            <div className="mt-2 flex justify-center gap-2">
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    index < pin.length ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs font-medium text-on-error-container text-center">
              {error}
            </p>
          )}

          {/* Ban phim so cho man hinh cam ung cua booth */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <button
                key={digit}
                type="button"
                onClick={() => appendDigit(digit)}
                disabled={isVerifying}
                className="h-14 rounded-xl border border-outline-variant bg-surface text-xl font-bold text-on-surface hover:bg-surface-2 active:scale-95 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError('');
              }}
              disabled={isVerifying}
              className="h-14 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface-variant hover:bg-surface-2 active:scale-95 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Xóa hết
            </button>
            <button
              type="button"
              onClick={() => appendDigit('0')}
              disabled={isVerifying}
              className="h-14 rounded-xl border border-outline-variant bg-surface text-xl font-bold text-on-surface hover:bg-surface-2 active:scale-95 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                setPin(current => current.slice(0, -1));
                setError('');
              }}
              disabled={isVerifying}
              className="h-14 rounded-xl border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-2 active:scale-95 transition cursor-pointer inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Xóa một ký tự"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isVerifying || pin.length !== PIN_LENGTH}
            className="btn-primary w-full h-12"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isVerifying ? 'Đang kiểm tra...' : 'Xác nhận'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="w-full text-xs font-bold text-on-surface-variant hover:text-primary inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}
