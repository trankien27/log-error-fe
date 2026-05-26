import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Key, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function SettingsTab() {
  // Zustand State subscription
  const {
    settingsStage,
    settingsPasswordCurrent,
    settingsPasswordNew,
    settingsPasswordConfirm,
    settingsOTPValues,
    settingsOTPTimer,
    setSettingsStage,
    setSettingsPasswordCurrent,
    setSettingsPasswordNew,
    setSettingsPasswordConfirm,
    setSettingsOTPValues,
    setSettingsOTPTimer,
    resetSecurityForm
  } = useAuthStore();

  // Local UI visibility togglers
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // OTP Countdown Timer effect
  useEffect(() => {
    let interval: any = null;
    if (settingsStage === 'otp' && settingsOTPTimer > 0) {
      interval = setInterval(() => {
        setSettingsOTPTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [settingsStage, settingsOTPTimer]);

  const handlePasswordSubmit = () => {
    if (!settingsPasswordCurrent) {
      alert('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }
    if (settingsPasswordNew.length < 6) {
      alert('Mật khẩu mới phải dài tối thiểu 6 ký tự!');
      return;
    }
    if (settingsPasswordNew !== settingsPasswordConfirm) {
      alert('Mật khẩu xác nhận không khớp nhau!');
      return;
    }
    // Transition to OTP verification stage
    setSettingsStage('otp');
    setSettingsOTPTimer(59);
    alert('Đã kích hoạt cấp mã OTP gửi về số máy liên kết +84 xxxxxxx34!');
  };

  const handleOTPSubmit = () => {
    const fullOTP = settingsOTPValues.join('');
    if (fullOTP.length < 6) {
      alert('Mã OTP xác thực không đủ chuỗi 6 chữ số!');
      return;
    }
    // Success stage transition and reset
    setSettingsStage('success');
    alert('Mã OTP chính xác. Mật khẩu đồng bộ bảo mật thành công!');
  };

  return (
    <div className="space-y-6 text-[#191b23] text-left animate-fadeIn">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-sans">Thiết lập bảo mật & Cài đặt hệ thống</h2>
        <p className="text-xs text-gray-500 mt-1">Quản lý mật khẩu quản trị, đồng bộ khóa bảo mật phần cứng, cấu hình OTP đa lớp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left panel instructions bento */}
        <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff6f00]">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider font-sans">Nguyên tắc bảo vệ tài khoản</h3>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Mật khẩu điều hành cấp đặc quyền (Privileged Identity) bắt buộc phải đạt tiêu chuẩn SRE cấp độ cao, tích hợp OTP 6 chữ số gửi qua SMS để ngăn chặn tấn công giả mạo phiên giao dịch.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Bao gồm ít nhất 8 ký tự</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Chứa ít nhất 1 chữ số (0-9)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Chứa ít nhất 1 ký tự đặc biệt</span>
            </div>
          </div>
        </div>

        {/* Right panel interactive secure form stages */}
        <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
          
          {/* STAGE 1: PASSWORD FORM */}
          {settingsStage === 'password' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="space-y-6"
            >
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 font-sans">Thay đổi mật khẩu đăng nhập</h4>
                <p className="text-xs text-slate-400">Yêu cầu xác nhận mật khẩu hiện tại trước khi thiết lập chuỗi khóa bảo mật mới.</p>
              </div>

              <div className="space-y-4">
                {/* Current password */}
                <div className="space-y-1.5 relative cursor-text text-left">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={settingsPasswordCurrent}
                      onChange={e => setSettingsPasswordCurrent(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại..."
                      className="w-full text-xs pl-3.5 pr-10 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-955 font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1.5 relative cursor-text text-left">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'}
                      value={settingsPasswordNew}
                      onChange={e => setSettingsPasswordNew(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full text-xs pl-3.5 pr-10 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-955 font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Dynamic Password Strength Indicator */}
                  {settingsPasswordNew.length > 0 && (
                    <div className="space-y-1.5 pt-1 font-sans">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-left">
                        <span className={
                          settingsPasswordNew.length < 6 ? 'text-red-650' :
                          settingsPasswordNew.length < 10 ? 'text-amber-500' : 'text-emerald-500'
                        }>
                          Độ mạnh khóa bảo mật:{' '}
                          {settingsPasswordNew.length < 6 ? 'Yếu (Dễ bẻ khóa)' :
                           settingsPasswordNew.length < 10 ? 'Trung bình (Đủ bảo vệ)' : 'Mạnh (Tiêu chuẩn tối ưu)'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <span className={`h-full transition-all duration-500 ${
                          settingsPasswordNew.length < 6 ? 'w-1/3 bg-red-500' :
                          settingsPasswordNew.length < 10 ? 'w-2/3 bg-amber-500' : 'w-full bg-emerald-500'
                        }`}></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5 relative cursor-text text-left">
                  <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input 
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={settingsPasswordConfirm}
                      onChange={e => setSettingsPasswordConfirm(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full text-xs pl-3.5 pr-10 py-2 border border-outline-variant rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-primary transition-all font-medium text-slate-955 font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button 
                  onClick={handlePasswordSubmit}
                  className="px-5 py-2.5 bg-[#004ac6] text-white hover:bg-primary-container rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Gửi OTP xác thực</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE 2: OTP VERIFICATION */}
          {settingsStage === 'otp' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="space-y-6 text-center max-w-sm mx-auto py-4"
            >
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-[#ebefff] rounded-full flex items-center justify-center text-[#004ac6]">
                  <Key className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-slate-900 font-sans">Nhập mã OTP Xác thực</h4>
                <p className="text-[11px] text-slate-400">Chúng tôi vừa gửi mã OTP bảo mật 6 số qua số điện thoại liên kết.</p>
              </div>

              {/* 6 digits split input fields */}
              <div className="flex justify-between gap-2.5">
                {settingsOTPValues.map((val, idx) => (
                  <input 
                    key={idx}
                    id={`settings-otp-box-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      const copy = [...settingsOTPValues];
                      copy[idx] = v;
                      setSettingsOTPValues(copy);
                      
                      if (v && idx < 5) {
                        document.getElementById(`settings-otp-box-${idx + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !settingsOTPValues[idx] && idx > 0) {
                        document.getElementById(`settings-otp-box-${idx - 1}`)?.focus();
                      }
                    }}
                    className="w-11 h-12 border-2 border-outline-variant text-[#004ac6] text-center font-extrabold text-lg rounded-xl focus:border-[#004ac6] focus:outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-mono"
                  />
                ))}
              </div>

              <div className="space-y-4 font-sans">
                <div className="text-[11px] font-bold text-slate-500">
                  {settingsOTPTimer > 0 ? (
                    <span>Gửi lại OTP sau <span className="font-mono text-[#004ac6]">{settingsOTPTimer} giây</span></span>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        setSettingsOTPTimer(59);
                        alert('Đã gửi lại thành công mã xác thực OTP mới!');
                      }}
                      className="text-[#004ac6] hover:underline hover:text-black font-extrabold cursor-pointer"
                    >
                      Gửi lại mã OTP mới
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button 
                    onClick={() => setSettingsStage('password')}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button 
                    onClick={handleOTPSubmit}
                    className="flex-1 px-4 py-2 bg-[#004ac6] text-white hover:bg-primary-container text-xs font-bold rounded-lg transition-all shadow hover:shadow-md cursor-pointer"
                  >
                    Xác thực
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: SUCCESS BLOCK */}
          {settingsStage === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="space-y-6 text-center max-w-sm mx-auto py-8"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-emerald-55 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-250 border-double">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black text-gray-950 font-sans">Mật khẩu đồng bộ thành công!</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Yêu cầu đổi khóa phân quyền quản trị đã hoàn thành. Hệ thống kỹ thuật vận hành ghi nhận trạng thái từ cổng xác nhận OTP đa tầng.
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={resetSecurityForm}
                  className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-850 text-xs font-bold rounded-lg transition-all shadow cursor-pointer active:scale-95"
                >
                  Cấu hình mật khẩu khác
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
