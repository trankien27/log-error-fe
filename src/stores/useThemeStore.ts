import { create } from 'zustand';
import { themeSettingsService } from '../services/api/themeSettingsService';
import {
  DEFAULT_THEME_SETTINGS,
  THEME_COLOR_KEYS,
  THEME_FONT_KEYS,
  THEME_SETTING_KEYS,
  ThemeSettingResponse,
  ThemeSettings,
} from '../features/theme/theme.types';
import { applyThemeSettings, HEX_COLOR_PATTERN } from '../features/theme/theme.utils';

const THEME_CACHE_KEY = 'application_theme_settings_v2';

function isThemeSettings(value: unknown): value is ThemeSettings {
  if (!value || typeof value !== 'object') return false;
  const theme = value as ThemeSettings;
  return THEME_COLOR_KEYS.every(key => HEX_COLOR_PATTERN.test(theme[key])) &&
    THEME_FONT_KEYS.every(key => typeof theme[key] === 'string' && theme[key].trim().length > 0);
}

function extractThemeSettings(response: ThemeSettingResponse): ThemeSettings {
  return Object.fromEntries(
    THEME_SETTING_KEYS.map(key => [key, response[key]]),
  ) as ThemeSettings;
}

function readCachedTheme() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : null;
    return isThemeSettings(parsed) ? parsed : DEFAULT_THEME_SETTINGS;
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

function persistAndApply(theme: ThemeSettings) {
  localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
  applyThemeSettings(theme);
}

const initialTheme = readCachedTheme();
applyThemeSettings(initialTheme);

interface ThemeState {
  theme: ThemeSettings;
  isLoading: boolean;
  loadTheme: () => Promise<void>;
  updateTheme: (theme: ThemeSettings) => Promise<ThemeSettings>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  isLoading: false,

  loadTheme: async () => {
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const theme = extractThemeSettings(await themeSettingsService.get());
      persistAndApply(theme);
      set({ theme });
    } catch {
      applyThemeSettings(get().theme);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTheme: async theme => {
    const savedTheme = extractThemeSettings(await themeSettingsService.update(theme));
    persistAndApply(savedTheme);
    set({ theme: savedTheme });
    return savedTheme;
  },
}));
