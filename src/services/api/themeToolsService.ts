import { apiClient } from './apiClient';
import type {
  ThemeCategory,
  ThemeLayout,
  ThemeList,
} from '../../features/theme-image-tools/types';

export const themeToolsService = {
  getLayouts: () => apiClient.get<ThemeLayout[]>('/api/theme-tools/layouts'),

  getThemeCategories: () =>
    apiClient.get<ThemeCategory[]>('/api/theme-tools/theme-categories?pageIndex=0&pageSize=100'),

  getThemeLists: () =>
    apiClient.get<ThemeList[]>('/api/theme-tools/theme-lists?pageIndex=0&pageSize=1000'),

  uploadTheme: (formData: FormData) =>
    apiClient.post<unknown>('/api/theme-tools/themes', formData),
};
