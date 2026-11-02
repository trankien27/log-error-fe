import { Droplets, Monitor, Moon, Palette, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { PageHeader, SectionCard } from '../../../components/ui';
import { useColorModeStore, type ColorModePreference } from '../../../stores/useColorModeStore';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useThemeStore } from '../../../stores/useThemeStore';
import type { UiStyle } from '../../theme/theme.types';
import ThemeSettingsSection from './ThemeSettingsSection';

const COLOR_MODE_OPTIONS: { value: ColorModePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor },
];

const UI_STYLE_OPTIONS: { value: UiStyle; label: string; hint: string }[] = [
  { value: 'standard', label: 'Tiêu chuẩn', hint: 'Nền đặc, giao diện hiện tại.' },
  { value: 'glass', label: 'Liquid glass nhạt', hint: 'Kính mờ nhẹ, viền sáng.' },
  { value: 'glass-ios', label: 'Liquid glass iOS', hint: 'Kính khúc xạ ở mép, bo góc lớn.' },
];

function UiStyleSection() {
  const uiStyle = useThemeStore(state => state.uiStyle);
  const updateUiStyle = useThemeStore(state => state.updateUiStyle);
  const [pending, setPending] = useState<UiStyle | null>(null);
  const savedOpacity = useThemeStore(state => state.glassOpacity);
  const previewOpacity = useThemeStore(state => state.previewGlassOpacity);
  const updateOpacity = useThemeStore(state => state.updateGlassOpacity);
  const [opacity, setOpacity] = useState(savedOpacity);
  const [isSavingOpacity, setIsSavingOpacity] = useState(false);

  useEffect(() => setOpacity(savedOpacity), [savedOpacity]);

  const saveOpacity = async () => {
    if (opacity === savedOpacity || isSavingOpacity) return;
    try {
      setIsSavingOpacity(true);
      await updateOpacity(opacity);
      toast.success('Đã lưu độ đục cho cả hệ thống.');
    } catch (error: any) {
      previewOpacity(savedOpacity);
      setOpacity(savedOpacity);
      toast.error(error?.message || 'Không thể lưu độ đục.');
    } finally {
      setIsSavingOpacity(false);
    }
  };

  const choose = async (value: UiStyle) => {
    if (pending || value === uiStyle) return;
    try {
      setPending(value);
      await updateUiStyle(value);
      toast.success('Đã đổi phong cách giao diện cho cả hệ thống. Người dùng khác thấy sau khi tải lại trang.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đổi phong cách giao diện.');
    } finally {
      setPending(null);
    }
  };

  return (
    <SectionCard
      title="Phong cách giao diện"
      description="Áp dụng cho toàn hệ thống. Chỉ quản trị viên được đổi."
      icon={Droplets}
    >
      <div role="radiogroup" aria-label="Phong cách giao diện" className="grid gap-3 sm:grid-cols-3">
        {UI_STYLE_OPTIONS.map(({ value, label, hint }) => {
          const active = uiStyle === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending !== null}
              onClick={() => choose(value)}
              className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer disabled:cursor-wait ${
                active ? 'border-primary bg-primary-subtle' : 'border-outline-variant hover:bg-surface-2'
              }`}
            >
              <span className="block text-sm font-semibold text-on-surface">{label}</span>
              <span className="mt-0.5 block text-xs text-on-surface-variant">{hint}</span>
            </button>
          );
        })}
      </div>

      {uiStyle !== 'standard' && (
        <div className="mt-5 rounded-xl border border-outline-variant p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="glass-opacity" className="text-sm font-semibold text-on-surface">Độ đục của kính</label>
            <span className="text-sm font-medium tabular-nums text-on-surface">{opacity}%</span>
          </div>
          <input
            id="glass-opacity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacity}
            disabled={isSavingOpacity}
            onChange={event => {
              const value = Number(event.target.value);
              setOpacity(value);
              previewOpacity(value);
            }}
            onPointerUp={saveOpacity}
            onKeyUp={saveOpacity}
            onBlur={saveOpacity}
            className="mt-3 w-full cursor-pointer accent-primary"
          />
          <p className="mt-1.5 text-xs text-on-surface-variant">
            Thấp = trong suốt hơn, cao = đục hơn. Thả thanh kéo để lưu cho cả hệ thống.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

function ColorModeSection() {
  const preference = useColorModeStore(state => state.preference);
  const setPreference = useColorModeStore(state => state.setPreference);

  return (
    <SectionCard
      title="Chế độ hiển thị"
      description="Áp dụng cho trình duyệt này của bạn."
      icon={SunMoon}
    >
      <div
        role="radiogroup"
        aria-label="Chế độ hiển thị"
        className="inline-flex w-full max-w-md rounded-xl border border-outline-variant bg-surface-2 p-1"
      >
        {COLOR_MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(value)}
              className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default function AppearanceSettingsTab() {
  return (
    <div className="text-left text-on-surface animate-fadeIn">
      <PageHeader
        title="Giao diện"
        description="Chọn bộ giao diện, màu sắc và font chữ dùng chung cho cả hệ thống."
        icon={Palette}
      />

      <div className="space-y-5">
        <UiStyleSection />
        <ColorModeSection />
        <ThemeSettingsSection />
      </div>
    </div>
  );
}
