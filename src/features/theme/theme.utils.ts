import { ThemeColors } from './theme.types';

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

export function applyThemeColors(theme: ThemeColors) {
  const root = document.documentElement;

  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-on-primary', getContrastColor(theme.primaryColor));
  root.style.setProperty('--color-on-secondary', getContrastColor(theme.secondaryColor));
  root.style.setProperty('--color-button-primary', theme.primaryButtonColor);
  root.style.setProperty('--color-on-button-primary', getContrastColor(theme.primaryButtonColor));
  root.style.setProperty('--color-button-secondary', theme.secondaryButtonColor);
  root.style.setProperty('--color-on-button-secondary', getContrastColor(theme.secondaryButtonColor));
  root.style.setProperty('--color-on-surface', theme.primaryTextColor);
  root.style.setProperty('--color-on-surface-variant', theme.secondaryTextColor);
}
