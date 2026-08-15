import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME_SETTINGS } from './theme.types';
import { applyThemeSettings, getContrastColor, mixHexColors } from './theme.utils';

describe('theme utilities', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('chọn màu chữ tương phản theo nền', () => {
    expect(getContrastColor('#FFFFFF')).toBe('#181B29');
    expect(getContrastColor('#000000')).toBe('#FFFFFF');
  });

  it('pha màu dùng cho trạng thái hover và active', () => {
    expect(mixHexColors('#1B55BF', '#000000', 0.12)).toBe('#184BA8');
    expect(mixHexColors('#000000', '#FFFFFF', 0.1)).toBe('#1A1A1A');
  });

  it('áp dụng font và toàn bộ nhóm màu lên CSS variables', () => {
    applyThemeSettings(DEFAULT_THEME_SETTINGS);

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--font-sans')).toBe(DEFAULT_THEME_SETTINGS.fontSans);
    expect(rootStyle.getPropertyValue('--font-mono')).toBe(DEFAULT_THEME_SETTINGS.fontMono);
    expect(rootStyle.getPropertyValue('--color-primary')).toBe(DEFAULT_THEME_SETTINGS.primaryColor);
    expect(rootStyle.getPropertyValue('--color-primary-hover')).toBe(DEFAULT_THEME_SETTINGS.primaryHoverColor);
    expect(rootStyle.getPropertyValue('--color-secondary')).toBe(DEFAULT_THEME_SETTINGS.secondaryColor);
    expect(rootStyle.getPropertyValue('--color-button-primary')).toBe(DEFAULT_THEME_SETTINGS.primaryButtonColor);
    expect(rootStyle.getPropertyValue('--color-background')).toBe(DEFAULT_THEME_SETTINGS.backgroundColor);
    expect(rootStyle.getPropertyValue('--color-on-surface')).toBe(DEFAULT_THEME_SETTINGS.primaryTextColor);
    expect(rootStyle.getPropertyValue('--color-error')).toBe(DEFAULT_THEME_SETTINGS.errorColor);
    expect(rootStyle.getPropertyValue('--color-success-container')).toBe(DEFAULT_THEME_SETTINGS.successContainerColor);
    expect(rootStyle.getPropertyValue('--color-on-warning-container')).toBe(DEFAULT_THEME_SETTINGS.onWarningContainerColor);
  });
});
