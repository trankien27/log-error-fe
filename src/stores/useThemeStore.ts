import { create } from 'zustand';
import { themeSettingsService } from '../services/api/themeSettingsService';
import {
  DEFAULT_THEME_SETTINGS,
  THEME_COLOR_KEYS,
  THEME_FONT_KEYS,
  THEME_SETTING_KEYS,
  ThemeSettingResponse,
  ThemeSettings,
  UI_STYLES,
  UiStyle,
  DEFAULT_UI_STYLE,
} from '../features/theme/theme.types';
import { useColorModeStore } from './useColorModeStore';
import { applyThemeSettings, HEX_COLOR_PATTERN } from '../features/theme/theme.utils';

const THEME_CACHE_KEY = 'application_theme_settings_v2';
const UI_STYLE_CACHE_KEY = 'application_ui_style_v1';

function normalizeUiStyle(value: unknown): UiStyle {
  return UI_STYLES.includes(value as UiStyle) ? (value as UiStyle) : DEFAULT_UI_STYLE;
}

function readCachedUiStyle(): UiStyle {
  try {
    return normalizeUiStyle(localStorage.getItem(UI_STYLE_CACHE_KEY));
  } catch {
    return DEFAULT_UI_STYLE;
  }
}

function applyUiStyle(style: UiStyle) {
  if (style === 'standard') document.documentElement.removeAttribute('data-style');
  else document.documentElement.dataset.style = style;
  try {
    localStorage.setItem(UI_STYLE_CACHE_KEY, style);
  } catch {
    // Storage unavailable: the style still applies for this session.
  }
  useColorModeStore.getState().syncWithStyle();
}

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

const initialUiStyle = readCachedUiStyle();
applyUiStyle(initialUiStyle);
const initialTheme = readCachedTheme();
applyThemeSettings(initialTheme);

interface ThemeState {
  theme: ThemeSettings;
  uiStyle: UiStyle;
  isLoading: boolean;
  loadTheme: () => Promise<void>;
  updateTheme: (theme: ThemeSettings) => Promise<ThemeSettings>;
  updateUiStyle: (style: UiStyle) => Promise<UiStyle>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  uiStyle: initialUiStyle,
  isLoading: false,

  loadTheme: async () => {
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const response = await themeSettingsService.get();
      const theme = extractThemeSettings(response);
      const uiStyle = normalizeUiStyle(response.uiStyle);
      applyUiStyle(uiStyle);
      persistAndApply(theme);
      set({ theme, uiStyle });
    } catch {
      applyThemeSettings(get().theme);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTheme: async theme => {
    const savedTheme = extractThemeSettings(await themeSettingsService.update(theme, get().uiStyle));
    persistAndApply(savedTheme);
    set({ theme: savedTheme });
    return savedTheme;
  },

  updateUiStyle: async style => {
    const response = await themeSettingsService.update(get().theme, style);
    const savedStyle = normalizeUiStyle(response.uiStyle);
    applyUiStyle(savedStyle);
    set({ uiStyle: savedStyle });
    return savedStyle;
  },
}));
