import { ThemeSettings, ThemeSettingResponse, UiStyle } from '../../features/theme/theme.types';
import { apiClient } from './apiClient';

export const themeSettingsService = {
  get: () => apiClient.get<ThemeSettingResponse>('/api/theme-settings'),
  update: (theme: ThemeSettings, uiStyle: UiStyle, glassOpacity: number) =>
    apiClient.put<ThemeSettingResponse>('/api/theme-settings', { ...theme, uiStyle, glassOpacity }),
};
