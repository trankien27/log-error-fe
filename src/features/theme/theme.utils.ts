import { ThemeSettings } from './theme.types';
import { ensureThemeFontsLoaded } from './theme.fonts';

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function hexToRgb(color: string) {
  const normalized = color.replace('#', '');
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function mixHexColors(color: string, target: '#000000' | '#FFFFFF', weight: number) {
  if (!HEX_COLOR_PATTERN.test(color)) return color;

  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);
  const mix = (source: number, destination: number) => (
    Math.round(source * (1 - weight) + destination * weight)
      .toString(16)
      .padStart(2, '0')
  );

  return `#${mix(sourceRgb.red, targetRgb.red)}${mix(sourceRgb.green, targetRgb.green)}${mix(sourceRgb.blue, targetRgb.blue)}`.toUpperCase();
}

/** Blends `color` toward any hex `target`; weight 0 keeps `color`, 1 returns `target`. */
export function blendHexColors(color: string, target: string, weight: number) {
  if (!HEX_COLOR_PATTERN.test(color) || !HEX_COLOR_PATTERN.test(target)) return color;

  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);
  const mix = (source: number, destination: number) => (
    Math.round(source * (1 - weight) + destination * weight)
      .toString(16)
      .padStart(2, '0')
  );

  return `#${mix(sourceRgb.red, targetRgb.red)}${mix(sourceRgb.green, targetRgb.green)}${mix(sourceRgb.blue, targetRgb.blue)}`.toUpperCase();
}

export type ResolvedColorMode = 'light' | 'dark';
export const COLOR_MODE_STORAGE_KEY = 'app-color-mode';

function readInitialColorMode(): ResolvedColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

let resolvedColorMode: ResolvedColorMode = typeof window === 'undefined' ? 'light' : readInitialColorMode();
let lastAppliedTheme: ThemeSettings | null = null;

const DARK_SURFACES = {
  background: '#0E1117',
  surface: '#161A22',
  surface2: '#1F242E',
  text: '#E7E9EE',
  textVariant: '#9CA3B4',
  outline: '#2C323D',
};

/** Derives a dark palette from a (light) theme, keeping its brand and semantic hues. */
export function buildDarkTheme(theme: ThemeSettings): ThemeSettings {
  const { background, surface, surface2, text, textVariant, outline } = DARK_SURFACES;
  const primary = blendHexColors(theme.primaryColor, '#FFFFFF', 0.28);
  const tone = (color: string) => ({
    main: blendHexColors(color, '#FFFFFF', 0.35),
    container: blendHexColors(color, surface, 0.78),
    onContainer: blendHexColors(color, '#FFFFFF', 0.62),
  });
  const error = tone(theme.errorColor);
  const success = tone(theme.successColor);
  const warning = tone(theme.warningColor);

  return {
    ...theme,
    primaryColor: primary,
    primaryHoverColor: blendHexColors(primary, '#FFFFFF', 0.15),
    primaryActiveColor: theme.primaryColor,
    primaryDisabledColor: blendHexColors(primary, surface, 0.55),
    primarySubtleColor: blendHexColors(primary, surface, 0.84),
    onPrimaryColor: getContrastColor(primary),
    primaryContainerColor: blendHexColors(primary, surface, 0.7),
    onPrimaryContainerColor: blendHexColors(primary, '#FFFFFF', 0.55),
    secondaryColor: blendHexColors(theme.secondaryColor, '#FFFFFF', 0.45),
    secondaryContainerColor: blendHexColors(primary, surface, 0.82),
    onSecondaryContainerColor: blendHexColors(primary, '#FFFFFF', 0.65),
    primaryButtonColor: blendHexColors(theme.primaryButtonColor, '#FFFFFF', 0.28),
    secondaryButtonColor: surface2,
    backgroundColor: background,
    surfaceColor: surface,
    surface2Color: surface2,
    primaryTextColor: text,
    secondaryTextColor: textVariant,
    outlineVariantColor: outline,
    errorColor: error.main,
    errorContainerColor: error.container,
    onErrorContainerColor: error.onContainer,
    successColor: success.main,
    successContainerColor: success.container,
    onSuccessContainerColor: success.onContainer,
    warningColor: warning.main,
    warningContainerColor: warning.container,
    onWarningContainerColor: warning.onContainer,
  };
}

export function getResolvedColorMode() {
  return resolvedColorMode;
}

/** Theme actually painted on screen (dark-derived when dark mode is active). */
export function getEffectiveTheme(theme: ThemeSettings) {
  return resolvedColorMode === 'dark' ? buildDarkTheme(theme) : theme;
}

export function setResolvedColorMode(mode: ResolvedColorMode) {
  resolvedColorMode = mode;
  if (lastAppliedTheme) applyThemeSettings(lastAppliedTheme);
  else syncColorSchemeAttribute();
}

function syncColorSchemeAttribute() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolvedColorMode;
  root.style.colorScheme = resolvedColorMode;
}

export function getContrastColor(backgroundColor: string) {
  if (!HEX_COLOR_PATTERN.test(backgroundColor)) return '#FFFFFF';

  const { red, green, blue } = hexToRgb(backgroundColor);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? '#181B29' : '#FFFFFF';
}

export function applyThemeSettings(sourceTheme: ThemeSettings) {
  lastAppliedTheme = sourceTheme;
  const theme = getEffectiveTheme(sourceTheme);
  const root = document.documentElement;
  syncColorSchemeAttribute();
  const cssVariables: Record<keyof ThemeSettings, string> = {
    fontSans: '--font-sans',
    fontMono: '--font-mono',
    primaryColor: '--color-primary',
    primaryHoverColor: '--color-primary-hover',
    primaryActiveColor: '--color-primary-active',
    primaryDisabledColor: '--color-primary-disabled',
    primarySubtleColor: '--color-primary-subtle',
    onPrimaryColor: '--color-on-primary',
    primaryContainerColor: '--color-primary-container',
    onPrimaryContainerColor: '--color-on-primary-container',
    secondaryColor: '--color-secondary',
    secondaryContainerColor: '--color-secondary-container',
    onSecondaryContainerColor: '--color-on-secondary-container',
    primaryButtonColor: '--color-button-primary',
    secondaryButtonColor: '--color-button-secondary',
    backgroundColor: '--color-background',
    surfaceColor: '--color-surface',
    surface2Color: '--color-surface-2',
    primaryTextColor: '--color-on-surface',
    secondaryTextColor: '--color-on-surface-variant',
    outlineVariantColor: '--color-outline-variant',
    errorColor: '--color-error',
    errorContainerColor: '--color-error-container',
    onErrorContainerColor: '--color-on-error-container',
    successColor: '--color-success',
    successContainerColor: '--color-success-container',
    onSuccessContainerColor: '--color-on-success-container',
    warningColor: '--color-warning',
    warningContainerColor: '--color-warning-container',
    onWarningContainerColor: '--color-on-warning-container',
  };

  Object.entries(cssVariables).forEach(([key, variable]) => {
    root.style.setProperty(variable, theme[key as keyof ThemeSettings]);
  });
  root.style.setProperty('--color-on-secondary', getContrastColor(theme.secondaryColor));
  root.style.setProperty('--color-on-button-primary', theme.onPrimaryColor);
  root.style.setProperty('--color-on-button-secondary', getContrastColor(theme.secondaryButtonColor));

  ensureThemeFontsLoaded(theme.fontSans, theme.fontMono);
}
