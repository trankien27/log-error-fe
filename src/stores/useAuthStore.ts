import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/api/authService';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/api/apiClient';

interface AuthState {
  isLoggedIn: boolean;
  currentUser: User | null;
  currentRoleNumber: number | null;
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
  questionAuth: (answer: string, email: string, password: string, fullName?: string) => Promise<User>;
  logout: () => void;
  getCurrentUserName: () => string;
  getCurrentRoleNumber: () => number | null;
  hasAnyRole: (roles: Array<number | string>) => boolean;
  updateCurrentUser: (user: Partial<User>) => void;
  
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

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function resolveRoleNumber(role: unknown) {
  const roleMap: Record<string, number> = {
    Admin: 1,
    ITSupport: 2,
    'IT Support': 2,
    Manager: 3,
    ITSupportManager: 3,
    Guest: 4,
    guest: 4,
  };

  if (typeof role === 'string' && roleMap[role] !== undefined) {
    return roleMap[role];
  }

  const numericRole = Number(role);
  return Number.isFinite(numericRole) ? numericRole : null;
}

function getTokenRoleNumber() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const payload = token ? decodeJwtPayload(token) : null;
  const role =
    payload?.role ??
    payload?.roleId ??
    payload?.RoleId ??
    payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

  return resolveRoleNumber(role);
}

const storedUser = getStoredUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
  currentUser: storedUser,
  currentRoleNumber: resolveRoleNumber(storedUser?.role) ?? getTokenRoleNumber(),
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
      set({
        isLoggedIn: true,
        currentUser: user,
        currentRoleNumber: resolveRoleNumber(user.role) ?? getTokenRoleNumber(),
        isLoading: false,
      });
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
      set({
        isLoggedIn: true,
        currentUser: user,
        currentRoleNumber: resolveRoleNumber(user.role) ?? getTokenRoleNumber(),
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  questionAuth: async (answer, email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.questionAuth(answer, email, password, fullName);
      set({
        isLoggedIn: true,
        currentUser: user,
        currentRoleNumber: resolveRoleNumber(user.role) ?? getTokenRoleNumber(),
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    authService.logout();
    set({ isLoggedIn: false, currentUser: null, currentRoleNumber: null, settingsStage: 'password' });
  },

  getCurrentUserName: () => get().currentUser?.name || 'Người dùng',

  getCurrentRoleNumber: () => (
    resolveRoleNumber(get().currentUser?.role) ??
    get().currentRoleNumber ??
    getTokenRoleNumber()
  ),

  hasAnyRole: (roles) => {
    const currentRole = get().getCurrentRoleNumber();
    if (currentRole === null) return false;

    return roles
      .map(resolveRoleNumber)
      .some(role => role === currentRole);
  },

  updateCurrentUser: (user) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    const nextUser = { ...currentUser, ...user };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    set({
      currentUser: nextUser,
      currentRoleNumber: resolveRoleNumber(nextUser.role) ?? getTokenRoleNumber(),
    });
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
