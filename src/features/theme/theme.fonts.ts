/**
 * Danh sách font phổ biến cho theme, kèm cơ chế tự tải web font (Google Fonts)
 * để font hiển thị trên MỌI máy — không phụ thuộc máy client có cài sẵn hay không.
 *
 * `stack` là chuỗi CSS font-family lưu vào ThemeSettings (fontSans/fontMono).
 * `googleFamily` có giá trị => tự inject <link> Google Fonts khi áp dụng.
 * Font hệ thống và font đã @import sẵn trong index.css (Plus Jakarta Sans,
 * JetBrains Mono) không cần tải nên bỏ trống `googleFamily`.
 */

export type FontCategory = 'sans' | 'serif' | 'mono';

export interface FontOption {
  id: string;
  label: string;
  category: FontCategory;
  stack: string;
  googleFamily?: string;
}

const SANS_FALLBACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
const SERIF_FALLBACK = 'ui-serif, Georgia, "Times New Roman", serif';
const MONO_FALLBACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// Các stack đặc biệt phải khớp CHÍNH XÁC với giá trị trong theme.presets/theme.types
export const SYSTEM_SANS_STACK = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
export const SYSTEM_MONO_STACK = '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
const PLUS_JAKARTA_STACK = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
const JETBRAINS_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const withFallback = (family: string, fallback: string) => `"${family}", ${fallback}`;

/** Font "hình thức" (sans + serif) dùng cho fontSans — font giao diện chung. */
export const SANS_FONT_OPTIONS: FontOption[] = [
  { id: 'system-sans', label: 'Mặc định hệ thống', category: 'sans', stack: SYSTEM_SANS_STACK },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans (gốc)', category: 'sans', stack: PLUS_JAKARTA_STACK },
  { id: 'inter', label: 'Inter', category: 'sans', stack: withFallback('Inter', SANS_FALLBACK), googleFamily: 'Inter' },
  { id: 'be-vietnam-pro', label: 'Be Vietnam Pro (tối ưu tiếng Việt)', category: 'sans', stack: withFallback('Be Vietnam Pro', SANS_FALLBACK), googleFamily: 'Be Vietnam Pro' },
  { id: 'roboto', label: 'Roboto', category: 'sans', stack: withFallback('Roboto', SANS_FALLBACK), googleFamily: 'Roboto' },
  { id: 'open-sans', label: 'Open Sans', category: 'sans', stack: withFallback('Open Sans', SANS_FALLBACK), googleFamily: 'Open Sans' },
  { id: 'montserrat', label: 'Montserrat', category: 'sans', stack: withFallback('Montserrat', SANS_FALLBACK), googleFamily: 'Montserrat' },
  { id: 'poppins', label: 'Poppins', category: 'sans', stack: withFallback('Poppins', SANS_FALLBACK), googleFamily: 'Poppins' },
  { id: 'nunito-sans', label: 'Nunito Sans', category: 'sans', stack: withFallback('Nunito Sans', SANS_FALLBACK), googleFamily: 'Nunito Sans' },
  { id: 'work-sans', label: 'Work Sans', category: 'sans', stack: withFallback('Work Sans', SANS_FALLBACK), googleFamily: 'Work Sans' },
  { id: 'manrope', label: 'Manrope', category: 'sans', stack: withFallback('Manrope', SANS_FALLBACK), googleFamily: 'Manrope' },
  { id: 'dm-sans', label: 'DM Sans', category: 'sans', stack: withFallback('DM Sans', SANS_FALLBACK), googleFamily: 'DM Sans' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', category: 'sans', stack: withFallback('IBM Plex Sans', SANS_FALLBACK), googleFamily: 'IBM Plex Sans' },
  { id: 'figtree', label: 'Figtree', category: 'sans', stack: withFallback('Figtree', SANS_FALLBACK), googleFamily: 'Figtree' },
  { id: 'lato', label: 'Lato', category: 'sans', stack: withFallback('Lato', SANS_FALLBACK), googleFamily: 'Lato' },
  { id: 'merriweather', label: 'Merriweather', category: 'serif', stack: withFallback('Merriweather', SERIF_FALLBACK), googleFamily: 'Merriweather' },
  { id: 'lora', label: 'Lora', category: 'serif', stack: withFallback('Lora', SERIF_FALLBACK), googleFamily: 'Lora' },
  { id: 'playfair-display', label: 'Playfair Display', category: 'serif', stack: withFallback('Playfair Display', SERIF_FALLBACK), googleFamily: 'Playfair Display' },
  { id: 'source-serif-4', label: 'Source Serif 4', category: 'serif', stack: withFallback('Source Serif 4', SERIF_FALLBACK), googleFamily: 'Source Serif 4' },
  { id: 'noto-serif', label: 'Noto Serif', category: 'serif', stack: withFallback('Noto Serif', SERIF_FALLBACK), googleFamily: 'Noto Serif' },
];

/** Font đơn cách (mono) dùng cho fontMono — mã lỗi, mã bản ghi, code. */
export const MONO_FONT_OPTIONS: FontOption[] = [
  { id: 'jetbrains-mono', label: 'JetBrains Mono (gốc)', category: 'mono', stack: JETBRAINS_STACK },
  { id: 'system-mono', label: 'SFMono / hệ thống', category: 'mono', stack: SYSTEM_MONO_STACK },
  { id: 'fira-code', label: 'Fira Code', category: 'mono', stack: withFallback('Fira Code', MONO_FALLBACK), googleFamily: 'Fira Code' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', category: 'mono', stack: withFallback('IBM Plex Mono', MONO_FALLBACK), googleFamily: 'IBM Plex Mono' },
  { id: 'source-code-pro', label: 'Source Code Pro', category: 'mono', stack: withFallback('Source Code Pro', MONO_FALLBACK), googleFamily: 'Source Code Pro' },
  { id: 'roboto-mono', label: 'Roboto Mono', category: 'mono', stack: withFallback('Roboto Mono', MONO_FALLBACK), googleFamily: 'Roboto Mono' },
  { id: 'space-mono', label: 'Space Mono', category: 'mono', stack: withFallback('Space Mono', MONO_FALLBACK), googleFamily: 'Space Mono' },
];

export const ALL_FONT_OPTIONS: FontOption[] = [...SANS_FONT_OPTIONS, ...MONO_FONT_OPTIONS];

const FONT_BY_STACK = new Map(ALL_FONT_OPTIONS.map(option => [option.stack, option]));

export function findFontOption(stack: string): FontOption | undefined {
  return FONT_BY_STACK.get(stack.trim());
}

/**
 * Dùng Google Fonts API v1 (khoan dung với weight không tồn tại — chỉ trả về
 * weight khả dụng thay vì lỗi cả request). Yêu cầu dải weight phủ nhu cầu UI
 * (400 → 800) để tiêu đề đậm không bị giả đậm.
 */
function googleFontsHref(family: string) {
  const encoded = family.trim().replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css?family=${encoded}:400,500,600,700,800&display=swap`;
}

/** Inject <link> Google Fonts cho một stack nếu cần và chưa có. An toàn khi gọi lặp. */
export function ensureFontLoaded(stack: string) {
  if (typeof document === 'undefined') return;
  const option = findFontOption(stack);
  if (!option?.googleFamily) return;

  const domId = `theme-font-${option.id}`;
  if (document.getElementById(domId)) return;

  const link = document.createElement('link');
  link.id = domId;
  link.rel = 'stylesheet';
  link.href = googleFontsHref(option.googleFamily);
  document.head.appendChild(link);
}

/** Đảm bảo cả font sans và font mono của theme đã được tải trên máy hiện tại. */
export function ensureThemeFontsLoaded(fontSans: string, fontMono: string) {
  ensureFontLoaded(fontSans);
  ensureFontLoaded(fontMono);
}
