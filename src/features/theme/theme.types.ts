export type ThemeColors = {
  primaryColor: string;
  secondaryColor: string;
  primaryButtonColor: string;
  secondaryButtonColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
};

export type ThemeSettingResponse = ThemeColors & {
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primaryColor: '#1B55BF',
  secondaryColor: '#3C4A68',
  primaryButtonColor: '#1B55BF',
  secondaryButtonColor: '#FFFFFF',
  primaryTextColor: '#181B29',
  secondaryTextColor: '#5B6178',
};
