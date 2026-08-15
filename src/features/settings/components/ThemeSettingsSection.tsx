import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, Palette, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeColors } from '../../theme/theme.types';
import { getContrastColor, HEX_COLOR_PATTERN } from '../../theme/theme.utils';
import { useThemeStore } from '../../../stores/useThemeStore';

type ThemeColorKey = keyof ThemeColors;

const themeColorFields: Array<{
  key: ThemeColorKey;
  label: string;
  description: string;
}> = [
  { key: 'primaryColor', label: 'Màu chính', description: 'Điểm nhấn, liên kết và trạng thái đang chọn.' },
  { key: 'secondaryColor', label: 'Màu phụ', description: 'Badge và các điểm nhấn cấp hai.' },
  { key: 'primaryButtonColor', label: 'Button chính', description: 'Nút lưu, tạo mới và xác nhận.' },
  { key: 'secondaryButtonColor', label: 'Button phụ', description: 'Nút hủy, quay lại và thao tác phụ.' },
  { key: 'primaryTextColor', label: 'Chữ chính', description: 'Tiêu đề và nội dung quan trọng.' },
  { key: 'secondaryTextColor', label: 'Chữ phụ', description: 'Mô tả, nhãn và nội dung bổ trợ.' },
];

export default function ThemeSettingsSection() {
  const theme = useThemeStore(state => state.theme);
  const isLoading = useThemeStore(state => state.isLoading);
  const updateTheme = useThemeStore(state => state.updateTheme);
  const [draft, setDraft] = useState<ThemeColors>(theme);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setDraft(theme), [theme]);

  const isDirty = useMemo(
    () => themeColorFields.some(field => draft[field.key].toUpperCase() !== theme[field.key].toUpperCase()),
    [draft, theme],
  );

  const updateDraft = (key: ThemeColorKey, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const invalidField = themeColorFields.find(field => !HEX_COLOR_PATTERN.test(draft[field.key]));
    if (invalidField) {
      toast.error(`${invalidField.label} phải có định dạng HEX #RRGGBB.`);
      return;
    }

    try {
      setIsSaving(true);
      await updateTheme(Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [key, value.toUpperCase()]),
      ) as ThemeColors);
      toast.success('Đã lưu và áp dụng màu giao diện.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể cập nhật màu giao diện.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card-surface p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-on-surface">Màu giao diện toàn hệ thống</h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Chỉ Admin được cấu hình. Màu được lưu trong database và áp dụng cho mọi người dùng.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {themeColorFields.map(field => (
            <label key={field.key} className="rounded-xl border border-outline-variant bg-surface-2/50 p-3">
              <span className="text-xs font-black text-on-surface">{field.label}</span>
              <span className="mt-1 block min-h-8 text-[11px] font-medium text-on-surface-variant">
                {field.description}
              </span>
              <span className="mt-3 flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(draft[field.key]) ? draft[field.key] : '#000000'}
                  onChange={event => updateDraft(field.key, event.target.value.toUpperCase())}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-outline-variant bg-surface p-1"
                  aria-label={`Chọn ${field.label.toLowerCase()}`}
                />
                <input
                  type="text"
                  value={draft[field.key]}
                  onChange={event => updateDraft(field.key, event.target.value)}
                  maxLength={7}
                  placeholder="#RRGGBB"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 font-mono text-sm font-bold uppercase text-on-surface focus:outline-primary"
                />
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-outline-variant bg-surface-2/50 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-on-surface-variant">Xem trước</p>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold"
              style={{ backgroundColor: draft.primaryColor, color: getContrastColor(draft.primaryColor) }}
            >
              Màu chính
            </span>
            <span
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold"
              style={{ backgroundColor: draft.secondaryColor, color: getContrastColor(draft.secondaryColor) }}
            >
              Màu phụ
            </span>
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold"
              style={{ backgroundColor: draft.primaryButtonColor, color: getContrastColor(draft.primaryButtonColor) }}
            >
              Button chính
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-lg border border-outline-variant px-4 text-sm font-bold"
              style={{ backgroundColor: draft.secondaryButtonColor, color: getContrastColor(draft.secondaryButtonColor) }}
            >
              Button phụ
            </button>
            <span className="text-sm font-black" style={{ color: draft.primaryTextColor }}>Chữ chính</span>
            <span className="text-sm font-bold" style={{ color: draft.secondaryTextColor }}>Chữ phụ</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-outline-variant pt-4">
          <button
            type="submit"
            disabled={isSaving || isLoading || !isDirty}
            className="btn-primary h-10 w-full px-5 sm:w-auto"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? 'Đang lưu...' : 'Lưu màu giao diện'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
