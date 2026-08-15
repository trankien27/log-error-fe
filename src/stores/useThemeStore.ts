import { create } from 'zustand';
import { themeSettingsService } from '../services/api/themeSettingsService';
import { DEFAULT_THEME_COLORS, ThemeColors } from '../features/theme/theme.types';
import { applyThemeColors, HEX_COLOR_PATTERN } from '../features/theme/theme.utils';

const THEME_CACHE_KEY = 'application_theme_colors';

function isThemeColors(value: unknown): value is ThemeColors {
  if (!value || typeof value !== 'object') return false;
  const theme = value as ThemeColors;
  return [
    theme.primaryColor,
    theme.secondaryColor,
    theme.primaryButtonColor,
    theme.secondaryButtonColor,
    theme.primaryTextColor,
    theme.secondaryTextColor,
  ].every(color => typeof color === 'string' && HEX_COLOR_PATTERN.test(color));
}

function readCachedTheme() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : null;
    return isThemeColors(parsed) ? parsed : DEFAULT_THEME_COLORS;
  } catch {
    return DEFAULT_THEME_COLORS;
  }
}

function persistAndApply(theme: ThemeColors) {
  localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
  applyThemeColors(theme);
}

const initialTheme = readCachedTheme();
applyThemeColors(initialTheme);

interface ThemeState {
  theme: ThemeColors;
  isLoading: boolean;
  loadTheme: () => Promise<void>;
  updateTheme: (theme: ThemeColors) => Promise<ThemeColors>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  isLoading: false,

  loadTheme: async () => {
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const response = await themeSettingsService.get();
      const theme: ThemeColors = {
        primaryColor: response.primaryColor,
        secondaryColor: response.secondaryColor,
        primaryButtonColor: response.primaryButtonColor,
        secondaryButtonColor: response.secondaryButtonColor,
        primaryTextColor: response.primaryTextColor,
        secondaryTextColor: response.secondaryTextColor,
      };
      persistAndApply(theme);
      set({ theme });
    } catch {
      applyThemeColors(get().theme);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTheme: async theme => {
    const response = await themeSettingsService.update(theme);
    const savedTheme: ThemeColors = {
      primaryColor: response.primaryColor,
      secondaryColor: response.secondaryColor,
      primaryButtonColor: response.primaryButtonColor,
      secondaryButtonColor: response.secondaryButtonColor,
      primaryTextColor: response.primaryTextColor,
      secondaryTextColor: response.secondaryTextColor,
    };
    persistAndApply(savedTheme);
    set({ theme: savedTheme });
    return savedTheme;
  },
}));
