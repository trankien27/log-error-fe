import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/api/authService';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/api/apiClient';

interface AuthState {
  isLoggedIn: boolean;
  currentUser: User | null;
  authMode: 'login' | 'register';
  isLoading: boolean;
  error: string | null;
  
  // Security password change states
  settingsStage: 'password' | 'success';
  settingsPasswordCurrent: string;
  settingsPasswordNew: string;
  settingsPasswordConfirm: string;

  // Setters/Actions
  setAuthMode: (mode: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  
  // Security settings actions
  setSettingsStage: (stage: 'password' | 'success') => void;
  setSettingsPasswordCurrent: (val: string) => void;
  setSettingsPasswordNew: (val: string) => void;
  setSettingsPasswordConfirm: (val: string) => void;
  resetSecurityForm: () => void;
}

function getStoredUser(): User | null {
  try {
    const user = localStorage.getItem(AUTH_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
  currentUser: getStoredUser(),
  authMode: 'login',
  isLoading: false,
  error: null,

  settingsStage: 'password',
  settingsPasswordCurrent: '',
  settingsPasswordNew: '',
  settingsPasswordConfirm: '',

  setAuthMode: (authMode) => set({ authMode }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(email, password);
      set({ isLoggedIn: true, currentUser: user, isLoading: false });
      return user;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const [firstName, ...lastNameParts] = name.trim().split(/\s+/);
      const user = await authService.register(firstName, lastNameParts.join(' '), email, password);
      set({ isLoggedIn: true, currentUser: user, isLoading: false });
      return user;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    authService.logout();
    set({ isLoggedIn: false, currentUser: null, settingsStage: 'password' });
  },

  setSettingsStage: (settingsStage) => set({ settingsStage }),
  setSettingsPasswordCurrent: (settingsPasswordCurrent) => set({ settingsPasswordCurrent }),
  setSettingsPasswordNew: (settingsPasswordNew) => set({ settingsPasswordNew }),
  setSettingsPasswordConfirm: (settingsPasswordConfirm) => set({ settingsPasswordConfirm }),

  resetSecurityForm: () => set({
    settingsStage: 'password',
    settingsPasswordCurrent: '',
    settingsPasswordNew: '',
    settingsPasswordConfirm: '',
  })
}));
