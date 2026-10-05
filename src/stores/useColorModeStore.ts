import { create } from 'zustand';
import {
  COLOR_MODE_STORAGE_KEY,
  getResolvedColorMode,
  setResolvedColorMode,
  type ResolvedColorMode,
} from '../features/theme/theme.utils';

export type ColorModePreference = 'light' | 'dark' | 'system';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ColorModePreference {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolve(preference: ColorModePreference): ResolvedColorMode {
  if (preference !== 'system') return preference;
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

type ColorModeState = {
  preference: ColorModePreference;
  resolved: ResolvedColorMode;
  setPreference: (preference: ColorModePreference) => void;
  toggle: () => void;
};

export const useColorModeStore = create<ColorModeState>((set, get) => ({
  preference: readPreference(),
  resolved: getResolvedColorMode(),

  setPreference: preference => {
    try {
      if (preference === 'system') localStorage.removeItem(COLOR_MODE_STORAGE_KEY);
      else localStorage.setItem(COLOR_MODE_STORAGE_KEY, preference);
    } catch {
      // Storage unavailable: keep the choice for this session only.
    }
    const resolved = resolve(preference);
    setResolvedColorMode(resolved);
    set({ preference, resolved });
  },

  toggle: () => get().setPreference(get().resolved === 'dark' ? 'light' : 'dark'),
}));

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    const { preference } = useColorModeStore.getState();
    if (preference !== 'system') return;
    const resolved = resolve('system');
    setResolvedColorMode(resolved);
    useColorModeStore.setState({ resolved });
  });
}
