import { DEFAULT_THEME_SETTINGS, ThemeSettings } from './theme.types';

export type ThemePresetId = 'original' | 'notion';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  /** Vài màu tiêu biểu để vẽ swatch xem trước trên card chọn bộ. */
  swatches: string[];
  settings: ThemeSettings;
}

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
 * viền rất nhẹ, accent xanh Notion, font hệ thống. Dùng bảng highlight chính thức
 * của Notion cho các trạng thái (đỏ/xanh lá/cam).
 */
const NOTION_PRESET: ThemePreset = {
  id: 'notion',
  name: 'Bộ Notion',
  description: 'Phong cách Notion: nền trắng ấm, chữ near-black, viền nhạt, accent xanh Notion, font hệ thống.',
  swatches: ['#2383E2', '#F7F6F3', '#37352F', '#448361', '#E03E3E'],
  settings: {
    fontSans: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontMono: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
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

export const THEME_PRESETS: ThemePreset[] = [ORIGINAL_PRESET, NOTION_PRESET];

/**
 * Xác định theme hiện tại trùng preset nào (so khớp toàn bộ token, không phân biệt
 * hoa/thường ở mã màu). Trả về null nếu admin đã tinh chỉnh tay khác cả hai bộ.
 */
export function matchThemePreset(theme: ThemeSettings): ThemePresetId | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const matches = (preset: ThemePreset) =>
    (Object.keys(preset.settings) as (keyof ThemeSettings)[]).every(
      key => normalize(theme[key]) === normalize(preset.settings[key]),
    );

  return THEME_PRESETS.find(matches)?.id ?? null;
}
