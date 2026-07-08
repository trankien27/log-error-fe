import React, { ChangeEvent, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Loader2, Lock, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { accountService } from '../../../services/api/accountService';
import { useAuthStore } from '../../../stores/useAuthStore';

const MAX_AVATAR_BYTES = 1024 * 1024;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsTab() {
  const {
    currentUser,
    settingsPasswordCurrent,
    settingsPasswordNew,
    settingsPasswordConfirm,
    setSettingsPasswordCurrent,
    setSettingsPasswordNew,
    setSettingsPasswordConfirm,
    resetSecurityForm,
    updateCurrentUser,
  } = useAuthStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh.');
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Ảnh avatar phải nhỏ hơn 1MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const avatarDataUrl = await fileToDataUrl(file);
      const user = await accountService.updateAvatar(avatarDataUrl);
      updateCurrentUser({ avatar: user.avatar });
      toast.success('Đã cập nhật avatar.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể cập nhật avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!settingsPasswordCurrent) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (settingsPasswordNew.length < 6) {
      toast.error('Mật khẩu mới phải dài tối thiểu 6 ký tự.');
      return;
    }
    if (settingsPasswordNew !== settingsPasswordConfirm) {
      toast.error('Mật khẩu xác nhận không khớp nhau.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await accountService.changePassword(settingsPasswordCurrent, settingsPasswordNew);
      resetSecurityForm();
      toast.success('Đã đổi mật khẩu.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 text-left text-[#191b23] animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-sans">Thiết lập tài khoản</h2>
        <p className="mt-1 text-xs text-gray-500">Đổi mật khẩu đăng nhập và cập nhật ảnh đại diện.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm lg:col-span-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full border border-outline-variant object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-outline-variant bg-primary/10">
                  <span className="text-3xl font-black text-primary">
                    {(currentUser?.name || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-white text-primary shadow-sm hover:bg-blue-50 disabled:opacity-60"
                aria-label="Tải avatar"
              >
                {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <h3 className="mt-4 text-base font-black text-gray-950">{currentUser?.name || 'Tài khoản'}</h3>
            <p className="mt-1 max-w-full truncate text-xs font-medium text-gray-500">{currentUser?.email}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-outline-variant text-sm font-bold text-primary hover:bg-blue-50 disabled:opacity-60"
            >
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>Upload avatar</span>
            </button>
            <p className="mt-2 text-xs font-medium text-gray-500">Chỉ nhận ảnh dưới 1MB.</p>
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-white p-5 shadow-sm lg:col-span-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-[#ff6f00]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-950">Đổi mật khẩu</h3>
              <p className="mt-1 text-xs text-gray-500">Nhập mật khẩu hiện tại trước khi đặt mật khẩu mới.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Mật khẩu hiện tại
              <div className="relative mt-1.5">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={settingsPasswordCurrent}
                  onChange={event => setSettingsPasswordCurrent(event.target.value)}
                  className="h-10 w-full rounded-md border border-outline-variant bg-slate-50 px-3 pr-10 text-sm font-medium focus:bg-white focus:outline-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(current => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Mật khẩu mới
              <div className="relative mt-1.5">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={settingsPasswordNew}
                  onChange={event => setSettingsPasswordNew(event.target.value)}
                  className="h-10 w-full rounded-md border border-outline-variant bg-slate-50 px-3 pr-10 text-sm font-medium focus:bg-white focus:outline-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(current => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Xác nhận mật khẩu mới
              <div className="relative mt-1.5">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  value={settingsPasswordConfirm}
                  onChange={event => setSettingsPasswordConfirm(event.target.value)}
                  className="h-10 w-full rounded-md border border-outline-variant bg-slate-50 px-3 pr-10 text-sm font-medium focus:bg-white focus:outline-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(current => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={isChangingPassword}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-white hover:bg-primary-container disabled:opacity-60 sm:w-auto"
            >
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Lưu mật khẩu</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
