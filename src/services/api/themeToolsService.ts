import { apiClient } from './apiClient';
import type {
  ThemeCategory,
  ThemeLayout,
  ThemeList,
  ThemeUploadProfile,
  SaveThemeUploadProfile,
} from '../../features/theme-image-tools/types';

export const themeToolsService = {
  getLayouts: () => apiClient.get<ThemeLayout[]>('/api/theme-tools/layouts'),

  getThemeCategories: () =>
    apiClient.get<ThemeCategory[]>('/api/theme-tools/theme-categories?pageIndex=0&pageSize=100'),

  getThemeLists: () =>
    apiClient.get<ThemeList[]>('/api/theme-tools/theme-lists?pageIndex=0&pageSize=1000'),

  uploadTheme: (formData: FormData) =>
    apiClient.post<unknown>('/api/theme-tools/themes', formData),

  getUploadProfiles: () =>
    apiClient.get<ThemeUploadProfile[]>('/api/theme-tools/upload-profiles'),

  createUploadProfile: (profile: SaveThemeUploadProfile) =>
    apiClient.post<ThemeUploadProfile>('/api/theme-tools/upload-profiles', profile),

  updateUploadProfile: (id: number, profile: SaveThemeUploadProfile) =>
    apiClient.put<ThemeUploadProfile>(`/api/theme-tools/upload-profiles/${id}`, profile),

  deleteUploadProfile: (id: number) =>
    apiClient.delete<void>(`/api/theme-tools/upload-profiles/${id}`),
};
