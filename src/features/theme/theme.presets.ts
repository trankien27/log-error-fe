import { DEFAULT_THEME_SETTINGS, ThemeSettings } from './theme.types';

export type ThemePresetId =
  | 'original'
  | 'notion'
  | 'slate'
  | 'graphite'
  | 'nord'
  | 'emerald'
  | 'violet'
  | 'amber';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  /** Vài màu tiêu biểu để vẽ swatch xem trước trên card chọn bộ. */
  swatches: string[];
  settings: ThemeSettings;
}

const FONT_JAKARTA = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_SYSTEM = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const FONT_MONO_JETBRAINS = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const FONT_MONO_SF = '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Bộ gốc: đúng bằng cấu hình mặc định của hệ thống (brand xanh + Plus Jakarta Sans).
 */
const ORIGINAL_PRESET: ThemePreset = {
  id: 'original',
  name: 'Bộ gốc',
  description: 'Giao diện gốc của hệ thống: brand xanh đậm, nền xanh xám, font Plus Jakarta Sans.',
  swatches: ['#1B55BF', '#F6F7FB', '#181B29', '#1A9C67', '#B3261E'],
  settings: DEFAULT_THEME_SETTINGS,
};

/**
 * Bộ Notion: tham khảo phong cách màu của Notion — nền trắng ấm, chữ near-black,
 * viền rất nhẹ, accent xanh Notion, font hệ thống.
 */
const NOTION_PRESET: ThemePreset = {
  id: 'notion',
  name: 'Bộ Notion',
  description: 'Phong cách Notion: nền trắng ấm, chữ near-black, viền nhạt, accent xanh Notion, font hệ thống.',
  swatches: ['#2383E2', '#F7F6F3', '#37352F', '#448361', '#E03E3E'],
  settings: {
    fontSans: FONT_SYSTEM,
    fontMono: FONT_MONO_SF,
    primaryColor: '#2383E2',
    primaryHoverColor: '#1A73D1',
    primaryActiveColor: '#0B6BCB',
    primaryDisabledColor: '#A9D2F5',
    primarySubtleColor: '#E7F3F8',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#E7F3F8',
    onPrimaryContainerColor: '#205FA6',
    secondaryColor: '#5A5952',
    secondaryContainerColor: '#EDECE9',
    onSecondaryContainerColor: '#37352F',
    primaryButtonColor: '#2383E2',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#F7F6F3',
    surfaceColor: '#FFFFFF',
    surface2Color: '#F1F1EF',
    primaryTextColor: '#37352F',
    secondaryTextColor: '#787774',
    outlineVariantColor: '#E3E2DF',
    errorColor: '#E03E3E',
    errorContainerColor: '#FBE4E4',
    onErrorContainerColor: '#A5201C',
    successColor: '#448361',
    successContainerColor: '#DDEDEA',
    onSuccessContainerColor: '#2B5F49',
    warningColor: '#CB7B29',
    warningContainerColor: '#FAEBDD',
    onWarningContainerColor: '#8A5417',
  },
};

/**
 * Bộ Slate Pro: indigo hiện đại trên nền xám lạnh, kiểu dashboard SaaS. An toàn, trung tính.
 */
const SLATE_PRESET: ThemePreset = {
  id: 'slate',
  name: 'Slate Pro',
  description: 'Indigo hiện đại trên xám lạnh, kiểu dashboard SaaS. Trung tính, an toàn cho công việc.',
  swatches: ['#4F46E5', '#F8FAFC', '#0F172A', '#059669', '#DC2626'],
  settings: {
    fontSans: FONT_JAKARTA,
    fontMono: FONT_MONO_JETBRAINS,
    primaryColor: '#4F46E5',
    primaryHoverColor: '#4338CA',
    primaryActiveColor: '#3730A3',
    primaryDisabledColor: '#C7D2FE',
    primarySubtleColor: '#EEF0FE',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#E5E7FD',
    onPrimaryContainerColor: '#3730A3',
    secondaryColor: '#475569',
    secondaryContainerColor: '#E5E7FD',
    onSecondaryContainerColor: '#0F172A',
    primaryButtonColor: '#4F46E5',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    surface2Color: '#F1F5F9',
    primaryTextColor: '#0F172A',
    secondaryTextColor: '#64748B',
    outlineVariantColor: '#E2E8F0',
    errorColor: '#DC2626',
    errorContainerColor: '#FEE2E2',
    onErrorContainerColor: '#991B1B',
    successColor: '#059669',
    successContainerColor: '#D1FAE5',
    onSuccessContainerColor: '#065F46',
    warningColor: '#D97706',
    warningContainerColor: '#FEF3C7',
    onWarningContainerColor: '#92400E',
  },
};

/**
 * Bộ Graphite Mono: near-black tối giản, nút đen thuần — gần với thẩm mỹ Notion đen.
 */
const GRAPHITE_PRESET: ThemePreset = {
  id: 'graphite',
  name: 'Graphite Mono',
  description: 'Tối giản near-black, nút đen thuần, xám trung tính, font hệ thống. Gọn và hiện đại.',
  swatches: ['#18181B', '#FAFAFA', '#71717A', '#16A34A', '#DC2626'],
  settings: {
    fontSans: FONT_SYSTEM,
    fontMono: FONT_MONO_SF,
    primaryColor: '#18181B',
    primaryHoverColor: '#27272A',
    primaryActiveColor: '#09090B',
    primaryDisabledColor: '#A1A1AA',
    primarySubtleColor: '#F4F4F5',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#E4E4E7',
    onPrimaryContainerColor: '#18181B',
    secondaryColor: '#52525B',
    secondaryContainerColor: '#E4E4E7',
    onSecondaryContainerColor: '#18181B',
    primaryButtonColor: '#18181B',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#FAFAFA',
    surfaceColor: '#FFFFFF',
    surface2Color: '#F4F4F5',
    primaryTextColor: '#18181B',
    secondaryTextColor: '#71717A',
    outlineVariantColor: '#E4E4E7',
    errorColor: '#DC2626',
    errorContainerColor: '#FEE2E2',
    onErrorContainerColor: '#991B1B',
    successColor: '#16A34A',
    successContainerColor: '#DCFCE7',
    onSuccessContainerColor: '#15803D',
    warningColor: '#CA8A04',
    warningContainerColor: '#FEF9C3',
    onWarningContainerColor: '#854D0E',
  },
};

/**
 * Bộ Nord Frost: bảng màu Nord (Bắc Âu) — xanh trầm, xám lạnh, dịu mắt khi nhìn lâu.
 */
const NORD_PRESET: ThemePreset = {
  id: 'nord',
  name: 'Nord Frost',
  description: 'Bảng màu Nord Bắc Âu: xanh trầm, xám lạnh, dịu mắt khi nhìn lâu.',
  swatches: ['#4C6C93', '#ECEFF4', '#2E3440', '#5E8C4A', '#BF616A'],
  settings: {
    fontSans: FONT_SYSTEM,
    fontMono: FONT_MONO_SF,
    primaryColor: '#4C6C93',
    primaryHoverColor: '#3E5A7C',
    primaryActiveColor: '#2E496A',
    primaryDisabledColor: '#AEC0D6',
    primarySubtleColor: '#E7ECF4',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#E1E7F0',
    onPrimaryContainerColor: '#34435A',
    secondaryColor: '#4C566A',
    secondaryContainerColor: '#E1E7F0',
    onSecondaryContainerColor: '#2E3440',
    primaryButtonColor: '#4C6C93',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#ECEFF4',
    surfaceColor: '#FFFFFF',
    surface2Color: '#E5E9F0',
    primaryTextColor: '#2E3440',
    secondaryTextColor: '#4C566A',
    outlineVariantColor: '#D8DEE9',
    errorColor: '#BF616A',
    errorContainerColor: '#F3E0E2',
    onErrorContainerColor: '#8A343D',
    successColor: '#5E8C4A',
    successContainerColor: '#E4EDDB',
    onSuccessContainerColor: '#3B5A2E',
    warningColor: '#B06B3C',
    warningContainerColor: '#F3E4D6',
    onWarningContainerColor: '#7A3F1F',
  },
};

/**
 * Bộ Emerald Calm: xanh lá tươi trên nền trung tính ấm. Cảm giác tích cực, "khỏe".
 */
const EMERALD_PRESET: ThemePreset = {
  id: 'emerald',
  name: 'Emerald Calm',
  description: 'Xanh lá tươi trên nền trung tính ấm. Cảm giác tích cực, dễ chịu.',
  swatches: ['#047857', '#F6FBF8', '#14251C', '#059669', '#DC2626'],
  settings: {
    fontSans: FONT_JAKARTA,
    fontMono: FONT_MONO_JETBRAINS,
    primaryColor: '#047857',
    primaryHoverColor: '#036B4E',
    primaryActiveColor: '#04543C',
    primaryDisabledColor: '#A7F3D0',
    primarySubtleColor: '#E6F7F0',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#D7F0E6',
    onPrimaryContainerColor: '#065F46',
    secondaryColor: '#4B5D54',
    secondaryContainerColor: '#D7F0E6',
    onSecondaryContainerColor: '#14251C',
    primaryButtonColor: '#047857',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#F6FBF8',
    surfaceColor: '#FFFFFF',
    surface2Color: '#ECF6F1',
    primaryTextColor: '#14251C',
    secondaryTextColor: '#5E6B63',
    outlineVariantColor: '#DCE6E0',
    errorColor: '#DC2626',
    errorContainerColor: '#FDE4E1',
    onErrorContainerColor: '#991B1B',
    successColor: '#059669',
    successContainerColor: '#D1FAE5',
    onSuccessContainerColor: '#065F46',
    warningColor: '#C77D0A',
    warningContainerColor: '#FBEECF',
    onWarningContainerColor: '#7A4C05',
  },
};

/**
 * Bộ Violet Dream: tím sáng tạo trên nền hơi tím. Nổi bật, trẻ trung.
 */
const VIOLET_PRESET: ThemePreset = {
  id: 'violet',
  name: 'Violet Dream',
  description: 'Tím sáng tạo trên nền hơi tím. Nổi bật, trẻ trung, giàu cá tính.',
  swatches: ['#7C3AED', '#FAF8FF', '#241B33', '#0E9F6E', '#DC2626'],
  settings: {
    fontSans: FONT_JAKARTA,
    fontMono: FONT_MONO_JETBRAINS,
    primaryColor: '#7C3AED',
    primaryHoverColor: '#6D28D9',
    primaryActiveColor: '#5B21B6',
    primaryDisabledColor: '#DDD0FB',
    primarySubtleColor: '#F1EBFD',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#EBE3FB',
    onPrimaryContainerColor: '#5B21B6',
    secondaryColor: '#574B6E',
    secondaryContainerColor: '#EBE3FB',
    onSecondaryContainerColor: '#241B33',
    primaryButtonColor: '#7C3AED',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#FAF8FF',
    surfaceColor: '#FFFFFF',
    surface2Color: '#F3EFFB',
    primaryTextColor: '#241B33',
    secondaryTextColor: '#6B6382',
    outlineVariantColor: '#E6DFF2',
    errorColor: '#DC2626',
    errorContainerColor: '#FCE3E1',
    onErrorContainerColor: '#991B1B',
    successColor: '#0E9F6E',
    successContainerColor: '#D8F3E7',
    onSuccessContainerColor: '#05613F',
    warningColor: '#C77D0A',
    warningContainerColor: '#FBEAD1',
    onWarningContainerColor: '#7A4C05',
  },
};

/**
 * Bộ Amber Warm: cam ấm cozy trên nền kem. Ấm áp, thân thiện.
 */
const AMBER_PRESET: ThemePreset = {
  id: 'amber',
  name: 'Amber Warm',
  description: 'Cam ấm cozy trên nền kem. Ấm áp, thân thiện, dễ gần.',
  swatches: ['#B45309', '#FDFBF7', '#292014', '#4D7C0F', '#C0392B'],
  settings: {
    fontSans: FONT_JAKARTA,
    fontMono: FONT_MONO_JETBRAINS,
    primaryColor: '#B45309',
    primaryHoverColor: '#92400E',
    primaryActiveColor: '#78350F',
    primaryDisabledColor: '#FBD38D',
    primarySubtleColor: '#FCF0DD',
    onPrimaryColor: '#FFFFFF',
    primaryContainerColor: '#FBE9CE',
    onPrimaryContainerColor: '#7A3D06',
    secondaryColor: '#6B5A3E',
    secondaryContainerColor: '#FBE9CE',
    onSecondaryContainerColor: '#292014',
    primaryButtonColor: '#B45309',
    secondaryButtonColor: '#FFFFFF',
    backgroundColor: '#FDFBF7',
    surfaceColor: '#FFFFFF',
    surface2Color: '#FBF3E7',
    primaryTextColor: '#292014',
    secondaryTextColor: '#7A6A52',
    outlineVariantColor: '#EDE2CF',
    errorColor: '#C0392B',
    errorContainerColor: '#FBE4DE',
    onErrorContainerColor: '#8A2317',
    successColor: '#4D7C0F',
    successContainerColor: '#E7F3CF',
    onSuccessContainerColor: '#3F630C',
    warningColor: '#CA8A04',
    warningContainerColor: '#FDF0C8',
    onWarningContainerColor: '#7A5306',
  },
};

export const THEME_PRESETS: ThemePreset[] = [
  ORIGINAL_PRESET,
  NOTION_PRESET,
  SLATE_PRESET,
  GRAPHITE_PRESET,
  NORD_PRESET,
  EMERALD_PRESET,
  VIOLET_PRESET,
  AMBER_PRESET,
];

/**
 * Xác định theme hiện tại trùng preset nào (so khớp toàn bộ token, không phân biệt
 * hoa/thường ở mã màu). Trả về null nếu admin đã tinh chỉnh tay khác mọi bộ.
 */
export function matchThemePreset(theme: ThemeSettings): ThemePresetId | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const matches = (preset: ThemePreset) =>
    (Object.keys(preset.settings) as (keyof ThemeSettings)[]).every(
      key => normalize(theme[key]) === normalize(preset.settings[key]),
    );

  return THEME_PRESETS.find(matches)?.id ?? null;
}
