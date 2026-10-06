import React, { ChangeEvent, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Loader2, Lock, Save, Upload, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { accountService } from '../../../services/api/accountService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { PageHeader, SectionCard } from '../../../components/ui';
import AiConnectionSection from './AiConnectionSection';

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
  const canConnectAi = useAuthStore(state => state.hasAnyRole([1, 2, 3, 'Admin', 'ITSupport', 'ITSupportManager']));

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
      toast.error('Ảnh đại diện phải nhỏ hơn 1MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const avatarDataUrl = await fileToDataUrl(file);
      const user = await accountService.updateAvatar(avatarDataUrl);
      updateCurrentUser({ avatar: user.avatar });
      toast.success('Đã cập nhật ảnh đại diện.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể cập nhật ảnh đại diện.');
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
    <div className="text-left text-on-surface animate-fadeIn">
      <PageHeader
        title="Tài khoản"
        description="Cập nhật ảnh đại diện và đổi mật khẩu đăng nhập."
        icon={UserCog}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="card-surface p-5 lg:col-span-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full border border-outline-variant object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-outline-variant bg-primary-subtle">
                  <span className="text-3xl font-semibold text-primary">
                    {(currentUser?.name || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface text-primary shadow-sm hover:bg-primary-subtle cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Đổi ảnh đại diện"
                title="Đổi ảnh đại diện"
              >
                {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <h3 className="mt-4 text-base font-semibold text-on-surface">{currentUser?.name || 'Tài khoản'}</h3>
            <p className="mt-0.5 max-w-full truncate text-sm text-on-surface-variant">{currentUser?.email}</p>

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
              className="btn-secondary mt-5 w-full"
            >
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>Đổi ảnh đại diện</span>
            </button>
            <p className="mt-2 text-xs text-on-surface-variant">PNG, JPG, WEBP hoặc GIF, dưới 1MB.</p>
          </div>
        </section>

        <SectionCard
          className="lg:col-span-8"
          title="Đổi mật khẩu"
          description="Nhập mật khẩu hiện tại trước khi đặt mật khẩu mới."
          icon={Lock}
        >

          <div className="space-y-4">
            <label className="block text-sm font-medium text-on-surface">
              Mật khẩu hiện tại
              <div className="relative mt-1.5">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={settingsPasswordCurrent}
                  onChange={event => setSettingsPasswordCurrent(event.target.value)}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 pr-10 text-sm font-normal text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(current => !current)}
                  aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block text-sm font-medium text-on-surface">
              Mật khẩu mới
              <div className="relative mt-1.5">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={settingsPasswordNew}
                  onChange={event => setSettingsPasswordNew(event.target.value)}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 pr-10 text-sm font-normal text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(current => !current)}
                  aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block text-sm font-medium text-on-surface">
              Xác nhận mật khẩu mới
              <div className="relative mt-1.5">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  value={settingsPasswordConfirm}
                  onChange={event => setSettingsPasswordConfirm(event.target.value)}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 pr-10 text-sm font-normal text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(current => !current)}
                  aria-label={showConfirmNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showConfirmNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                >
                  {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end border-t border-outline-variant pt-4 -mx-4 px-4 sm:-mx-5 sm:px-5">
            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={isChangingPassword}
              className="btn-primary h-10 w-full px-5 sm:w-auto"
            >
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Lưu mật khẩu</span>
            </button>
          </div>
        </SectionCard>

        {canConnectAi && <AiConnectionSection />}
      </div>
    </div>
  );
}
