import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Loader2, Palette, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  THEME_COLOR_KEYS,
  THEME_FONT_KEYS,
  THEME_SETTING_KEYS,
  ThemeSettings,
} from '../../theme/theme.types';
import { getContrastColor, HEX_COLOR_PATTERN } from '../../theme/theme.utils';
import { useThemeStore } from '../../../stores/useThemeStore';

type ThemeSettingKey = keyof ThemeSettings;

type ThemeField = {
  key: ThemeSettingKey;
  kind: 'color' | 'font';
  label: string;
  variable: string;
  usage: string;
};

type ThemeGroup = {
  title: string;
  description: string;
  fields: ThemeField[];
};

const THEME_GROUPS: ThemeGroup[] = [
  {
    title: 'Font chữ',
    description: 'Font mặc định cho nội dung thường và nội dung dạng mã.',
    fields: [
      { key: 'fontSans', kind: 'font', label: 'Font chữ thường', variable: '--font-sans', usage: 'Áp dụng cho hầu hết tiêu đề, nội dung, form và button. Nhập một CSS font-family hợp lệ.' },
      { key: 'fontMono', kind: 'font', label: 'Font chữ mã', variable: '--font-mono', usage: 'Áp dụng cho mã danh mục, mã lỗi, mã bản ghi và các nội dung dùng class font-mono.' },
    ],
  },
  {
    title: 'Màu thương hiệu',
    description: 'Màu nhận diện chính, phụ và các trạng thái tương tác.',
    fields: [
      { key: 'primaryColor', kind: 'color', label: 'Primary', variable: '--color-primary', usage: 'Màu nhận diện chính: link, icon, focus ring, tab đang chọn, btn-ghost và các class bg/text-primary.' },
      { key: 'primaryHoverColor', kind: 'color', label: 'Primary hover', variable: '--color-primary-hover', usage: 'Nền của button chính và control Ant Design khi người dùng rê chuột.' },
      { key: 'primaryActiveColor', kind: 'color', label: 'Primary active', variable: '--color-primary-active', usage: 'Nền của button chính trong lúc người dùng đang nhấn.' },
      { key: 'primaryDisabledColor', kind: 'color', label: 'Primary disabled', variable: '--color-primary-disabled', usage: 'Màu button/control chính khi bị vô hiệu hóa và không thể thao tác.' },
      { key: 'primarySubtleColor', kind: 'color', label: 'Primary subtle', variable: '--color-primary-subtle', usage: 'Nền primary rất nhạt, dùng cho hover của button ghost và các vùng nhấn nhẹ.' },
      { key: 'onPrimaryColor', kind: 'color', label: 'On primary', variable: '--color-on-primary', usage: 'Màu chữ/icon nằm trực tiếp trên nền primary, bao gồm chữ của button chính.' },
      { key: 'primaryContainerColor', kind: 'color', label: 'Primary container', variable: '--color-primary-container', usage: 'Nền khối thông tin hoặc vùng chứa cần nhấn mạnh theo màu chính.' },
      { key: 'onPrimaryContainerColor', kind: 'color', label: 'On primary container', variable: '--color-on-primary-container', usage: 'Màu chữ/icon nằm trong primary container.' },
      { key: 'secondaryColor', kind: 'color', label: 'Secondary', variable: '--color-secondary', usage: 'Màu thương hiệu cấp hai, dành cho điểm nhấn không phải hành động chính.' },
      { key: 'secondaryContainerColor', kind: 'color', label: 'Secondary container', variable: '--color-secondary-container', usage: 'Nền của badge thông tin và các khối nhấn cấp hai.' },
      { key: 'onSecondaryContainerColor', kind: 'color', label: 'On secondary container', variable: '--color-on-secondary-container', usage: 'Màu chữ/icon trong badge thông tin và secondary container.' },
    ],
  },
  {
    title: 'Button',
    description: 'Màu nền riêng cho hai nhóm button dùng chung toàn hệ thống.',
    fields: [
      { key: 'primaryButtonColor', kind: 'color', label: 'Button chính', variable: '--color-button-primary', usage: 'Nền class btn-primary và Ant Design Button type="primary": Lưu, Tạo mới, Xác nhận.' },
      { key: 'secondaryButtonColor', kind: 'color', label: 'Button phụ', variable: '--color-button-secondary', usage: 'Nền class btn-secondary và Ant Design Button mặc định: Hủy, Quay lại, thao tác phụ.' },
    ],
  },
  {
    title: 'Bề mặt, chữ và đường viền',
    description: 'Nền trang, card, input, nội dung chữ và border.',
    fields: [
      { key: 'backgroundColor', kind: 'color', label: 'Background', variable: '--color-background', usage: 'Nền ngoài cùng của toàn bộ trang và layout ứng dụng.' },
      { key: 'surfaceColor', kind: 'color', label: 'Surface', variable: '--color-surface', usage: 'Nền card, modal, dropdown, input và các khối nội dung chính.' },
      { key: 'surface2Color', kind: 'color', label: 'Surface 2', variable: '--color-surface-2', usage: 'Nền phụ của toolbar, header bảng, skeleton, input phụ và empty state.' },
      { key: 'primaryTextColor', kind: 'color', label: 'Chữ chính', variable: '--color-on-surface', usage: 'Tiêu đề và nội dung chính trên surface.' },
      { key: 'secondaryTextColor', kind: 'color', label: 'Chữ phụ', variable: '--color-on-surface-variant', usage: 'Mô tả, label, placeholder và nội dung ít quan trọng hơn.' },
      { key: 'outlineVariantColor', kind: 'color', label: 'Đường viền', variable: '--color-outline-variant', usage: 'Border của card, input, modal, bảng, divider và scrollbar.' },
    ],
  },
  {
    title: 'Trạng thái hệ thống',
    description: 'Màu lỗi, thành công và cảnh báo cùng màu container tương ứng.',
    fields: [
      { key: 'errorColor', kind: 'color', label: 'Error', variable: '--color-error', usage: 'Nút xoá, lỗi validation, icon lỗi và trạng thái nguy hiểm.' },
      { key: 'errorContainerColor', kind: 'color', label: 'Error container', variable: '--color-error-container', usage: 'Nền badge lỗi và vùng thông báo lỗi.' },
      { key: 'onErrorContainerColor', kind: 'color', label: 'On error container', variable: '--color-on-error-container', usage: 'Màu chữ/icon nằm trong error container.' },
      { key: 'successColor', kind: 'color', label: 'Success', variable: '--color-success', usage: 'Trạng thái hoàn tất, đang hoạt động và số liệu tích cực.' },
      { key: 'successContainerColor', kind: 'color', label: 'Success container', variable: '--color-success-container', usage: 'Nền badge thành công và vùng thông báo thành công.' },
      { key: 'onSuccessContainerColor', kind: 'color', label: 'On success container', variable: '--color-on-success-container', usage: 'Màu chữ/icon nằm trong success container.' },
      { key: 'warningColor', kind: 'color', label: 'Warning', variable: '--color-warning', usage: 'Trạng thái cảnh báo, đang chờ hoặc cần chú ý.' },
      { key: 'warningContainerColor', kind: 'color', label: 'Warning container', variable: '--color-warning-container', usage: 'Nền badge cảnh báo và vùng thông báo cảnh báo.' },
      { key: 'onWarningContainerColor', kind: 'color', label: 'On warning container', variable: '--color-on-warning-container', usage: 'Màu chữ/icon nằm trong warning container.' },
    ],
  },
];

const ALL_THEME_FIELDS = THEME_GROUPS.flatMap(group => group.fields);
const COLOR_KEY_SET = new Set<ThemeSettingKey>(THEME_COLOR_KEYS);

function safeColor(value: string, fallback: string) {
  return HEX_COLOR_PATTERN.test(value) ? value : fallback;
}

export default function ThemeSettingsSection() {
  const theme = useThemeStore(state => state.theme);
  const isLoading = useThemeStore(state => state.isLoading);
  const updateTheme = useThemeStore(state => state.updateTheme);
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const [infoField, setInfoField] = useState<ThemeSettingKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setDraft(theme), [theme]);

  const isDirty = useMemo(
    () => THEME_SETTING_KEYS.some(key => draft[key] !== theme[key]),
    [draft, theme],
  );

  const updateDraft = (key: ThemeSettingKey, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const invalidColor = ALL_THEME_FIELDS.find(field =>
      field.kind === 'color' && !HEX_COLOR_PATTERN.test(draft[field.key]),
    );
    if (invalidColor) {
      toast.error(`${invalidColor.label} phải có định dạng HEX #RRGGBB.`);
      return;
    }

    const invalidFontKey = THEME_FONT_KEYS.find(key => {
      const value = draft[key].trim();
      return !value || value.length > 300 || /[;{}<>]/.test(value);
    });
    if (invalidFontKey) {
      toast.error('Font chữ không hợp lệ hoặc vượt quá 300 ký tự.');
      return;
    }

    const normalized = Object.fromEntries(
      THEME_SETTING_KEYS.map(key => [
        key,
        COLOR_KEY_SET.has(key) ? draft[key].toUpperCase() : draft[key].trim(),
      ]),
    ) as ThemeSettings;

    try {
      setIsSaving(true);
      await updateTheme(normalized);
      toast.success('Đã lưu và áp dụng toàn bộ cấu hình giao diện.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể cập nhật cấu hình giao diện.');
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
          <h3 className="text-base font-black text-on-surface">Theme toàn hệ thống</h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Cấu hình 30 token giao diện. Bấm dấu chấm than cạnh từng token để xem thành phần chịu ảnh hưởng.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {THEME_GROUPS.map(group => (
          <section key={group.title} className="rounded-2xl border border-outline-variant bg-surface-2/30 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-black text-on-surface">{group.title}</h4>
              <p className="mt-1 text-xs text-on-surface-variant">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.fields.map(field => (
                <div key={field.key} className="rounded-xl border border-outline-variant bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-on-surface">{field.label}</p>
                      <code className="mt-1 block truncate text-[10px] font-bold text-primary">{field.variable}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfoField(current => current === field.key ? null : field.key)}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        infoField === field.key
                          ? 'border-warning bg-warning-container text-on-warning-container'
                          : 'border-outline-variant text-on-surface-variant hover:border-warning hover:text-warning'
                      }`}
                      title={`Xem ${field.label} dùng cho phần nào`}
                      aria-label={`Xem thông tin ${field.label}`}
                      aria-expanded={infoField === field.key}
                    >
                      <CircleAlert className="h-4 w-4" />
                    </button>
                  </div>

                  {field.kind === 'color' ? (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="color"
                        value={safeColor(draft[field.key], '#000000')}
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
                        className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-2 px-3 font-mono text-sm font-bold uppercase text-on-surface focus:outline-primary"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={draft[field.key]}
                      onChange={event => updateDraft(field.key, event.target.value)}
                      maxLength={300}
                      className="mt-3 h-10 w-full rounded-lg border border-outline-variant bg-surface-2 px-3 font-mono text-xs font-bold text-on-surface focus:outline-primary"
                    />
                  )}

                  {infoField === field.key && (
                    <div className="mt-3 rounded-lg border border-warning/20 bg-warning-container/50 px-3 py-2 text-xs leading-5 text-on-warning-container">
                      <span className="font-black">Dùng cho: </span>{field.usage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: safeColor(draft.backgroundColor, '#F6F7FB'),
            borderColor: safeColor(draft.outlineVariantColor, '#D7DAE4'),
            fontFamily: draft.fontSans,
          }}
        >
          <p className="mb-3 text-xs font-black uppercase tracking-wide" style={{ color: safeColor(draft.secondaryTextColor, '#5B6178') }}>
            Xem trước tổng hợp
          </p>
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: safeColor(draft.surfaceColor, '#FFFFFF'),
              borderColor: safeColor(draft.outlineVariantColor, '#D7DAE4'),
            }}
          >
            <p className="text-base font-black" style={{ color: safeColor(draft.primaryTextColor, '#181B29') }}>Tiêu đề và nội dung chính</p>
            <p className="mt-1 text-xs font-bold" style={{ color: safeColor(draft.secondaryTextColor, '#5B6178') }}>Mô tả sử dụng màu chữ phụ trên surface.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="inline-flex h-9 items-center rounded-lg px-4 text-xs font-black" style={{ backgroundColor: safeColor(draft.primaryButtonColor, '#1B55BF'), color: safeColor(draft.onPrimaryColor, '#FFFFFF') }}>Button chính</button>
              <button type="button" className="inline-flex h-9 items-center rounded-lg border px-4 text-xs font-black" style={{ backgroundColor: safeColor(draft.secondaryButtonColor, '#FFFFFF'), color: getContrastColor(draft.secondaryButtonColor), borderColor: safeColor(draft.outlineVariantColor, '#D7DAE4') }}>Button phụ</button>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ backgroundColor: safeColor(draft.successContainerColor, '#D9F5E6'), color: safeColor(draft.onSuccessContainerColor, '#0F6B47') }}>Thành công</span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ backgroundColor: safeColor(draft.warningContainerColor, '#FBECD0'), color: safeColor(draft.onWarningContainerColor, '#7A4A05') }}>Cảnh báo</span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ backgroundColor: safeColor(draft.errorContainerColor, '#FBDEDB'), color: safeColor(draft.onErrorContainerColor, '#8C2018') }}>Lỗi</span>
              <code className="rounded px-2 py-1 text-xs" style={{ backgroundColor: safeColor(draft.surface2Color, '#EEF0F7'), color: safeColor(draft.secondaryColor, '#3C4A68'), fontFamily: draft.fontMono }}>CODE-001</code>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-outline-variant pt-4">
          <button
            type="submit"
            disabled={isSaving || isLoading || !isDirty}
            className="btn-primary h-10 w-full px-5 sm:w-auto"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? 'Đang lưu...' : 'Lưu toàn bộ theme'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
