export type ThemeSettings = {
  fontSans: string;
  fontMono: string;
  primaryColor: string;
  primaryHoverColor: string;
  primaryActiveColor: string;
  primaryDisabledColor: string;
  primarySubtleColor: string;
  onPrimaryColor: string;
  primaryContainerColor: string;
  onPrimaryContainerColor: string;
  secondaryColor: string;
  secondaryContainerColor: string;
  onSecondaryContainerColor: string;
  primaryButtonColor: string;
  secondaryButtonColor: string;
  backgroundColor: string;
  surfaceColor: string;
  surface2Color: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  outlineVariantColor: string;
  errorColor: string;
  errorContainerColor: string;
  onErrorContainerColor: string;
  successColor: string;
  successContainerColor: string;
  onSuccessContainerColor: string;
  warningColor: string;
  warningContainerColor: string;
  onWarningContainerColor: string;
};

export type ThemeSettingResponse = ThemeSettings & {
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export const THEME_FONT_KEYS = ['fontSans', 'fontMono'] as const satisfies readonly (keyof ThemeSettings)[];

export const THEME_COLOR_KEYS = [
  'primaryColor',
  'primaryHoverColor',
  'primaryActiveColor',
  'primaryDisabledColor',
  'primarySubtleColor',
  'onPrimaryColor',
  'primaryContainerColor',
  'onPrimaryContainerColor',
  'secondaryColor',
  'secondaryContainerColor',
  'onSecondaryContainerColor',
  'primaryButtonColor',
  'secondaryButtonColor',
  'backgroundColor',
  'surfaceColor',
  'surface2Color',
  'primaryTextColor',
  'secondaryTextColor',
  'outlineVariantColor',
  'errorColor',
  'errorContainerColor',
  'onErrorContainerColor',
  'successColor',
  'successContainerColor',
  'onSuccessContainerColor',
  'warningColor',
  'warningContainerColor',
  'onWarningContainerColor',
] as const satisfies readonly (keyof ThemeSettings)[];

export const THEME_SETTING_KEYS = [
  ...THEME_FONT_KEYS,
  ...THEME_COLOR_KEYS,
] as const satisfies readonly (keyof ThemeSettings)[];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  fontSans: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  primaryColor: '#1B55BF',
  primaryHoverColor: '#0958D9',
  primaryActiveColor: '#003EB3',
  primaryDisabledColor: '#91CAFF',
  primarySubtleColor: '#E6F4FF',
  onPrimaryColor: '#FFFFFF',
  primaryContainerColor: '#0958D9',
  onPrimaryContainerColor: '#003EB3',
  secondaryColor: '#3C4A68',
  secondaryContainerColor: '#E4E9FB',
  onSecondaryContainerColor: '#3C4A68',
  primaryButtonColor: '#1B55BF',
  secondaryButtonColor: '#FFFFFF',
  backgroundColor: '#F6F7FB',
  surfaceColor: '#FFFFFF',
  surface2Color: '#EEF0F7',
  primaryTextColor: '#181B29',
  secondaryTextColor: '#5B6178',
  outlineVariantColor: '#D7DAE4',
  errorColor: '#B3261E',
  errorContainerColor: '#FBDEDB',
  onErrorContainerColor: '#8C2018',
  successColor: '#1A9C67',
  successContainerColor: '#D9F5E6',
  onSuccessContainerColor: '#0F6B47',
  warningColor: '#B5750A',
  warningContainerColor: '#FBECD0',
  onWarningContainerColor: '#7A4A05',
};
