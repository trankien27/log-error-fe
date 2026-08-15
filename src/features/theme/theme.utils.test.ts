import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME_COLORS } from './theme.types';
import { applyThemeColors, getContrastColor, mixHexColors } from './theme.utils';

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

  it('áp dụng đủ sáu nhóm màu lên CSS variables', () => {
    applyThemeColors(DEFAULT_THEME_COLORS);

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--color-primary')).toBe(DEFAULT_THEME_COLORS.primaryColor);
    expect(rootStyle.getPropertyValue('--color-secondary')).toBe(DEFAULT_THEME_COLORS.secondaryColor);
    expect(rootStyle.getPropertyValue('--color-button-primary')).toBe(DEFAULT_THEME_COLORS.primaryButtonColor);
    expect(rootStyle.getPropertyValue('--color-button-secondary')).toBe(DEFAULT_THEME_COLORS.secondaryButtonColor);
    expect(rootStyle.getPropertyValue('--color-on-surface')).toBe(DEFAULT_THEME_COLORS.primaryTextColor);
    expect(rootStyle.getPropertyValue('--color-on-surface-variant')).toBe(DEFAULT_THEME_COLORS.secondaryTextColor);
  });
});
