import { ThemeSettings } from './theme.types';

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

export function getContrastColor(backgroundColor: string) {
  if (!HEX_COLOR_PATTERN.test(backgroundColor)) return '#FFFFFF';

  const { red, green, blue } = hexToRgb(backgroundColor);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? '#181B29' : '#FFFFFF';
}

export function applyThemeSettings(theme: ThemeSettings) {
  const root = document.documentElement;
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
}
