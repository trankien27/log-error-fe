import { Monitor, Moon, Palette, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { PageHeader, SectionCard } from '../../../components/ui';
import { useColorModeStore, type ColorModePreference } from '../../../stores/useColorModeStore';
import ThemeSettingsSection from './ThemeSettingsSection';

const COLOR_MODE_OPTIONS: { value: ColorModePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor },
];

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
        <ColorModeSection />
        <ThemeSettingsSection />
      </div>
    </div>
  );
}
