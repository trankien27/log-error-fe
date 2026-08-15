import { ThemeSettings, ThemeSettingResponse } from '../../features/theme/theme.types';
import { apiClient } from './apiClient';

export const themeSettingsService = {
  get: () => apiClient.get<ThemeSettingResponse>('/api/theme-settings'),
  update: (theme: ThemeSettings) => apiClient.put<ThemeSettingResponse>('/api/theme-settings', theme),
};
