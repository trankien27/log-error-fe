import { User } from '../../types';
import { apiClient, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY } from './apiClient';

type BackendUser = Partial<User> & {
  userId?: string;
  roleId?: string | number;
  firstName?: string;
  lastName?: string;
  sub?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
};

type AuthResponse = BackendUser | {
  user?: BackendUser;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
};

function decodeTokenPayload(token: string): BackendUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(char => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeUser(user: BackendUser): User {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = user.name || `${firstName} ${lastName}`.trim() || user.email || 'Người dùng';
  const roleClaim = user.role ?? user.roleId ?? user['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  const numericRole = Number(roleClaim);
  const normalizedRole =
    Number.isFinite(numericRole) && numericRole > 0
      ? (numericRole as User['role'])
      : roleClaim === 'Admin' || roleClaim === 'ITSupport' || roleClaim === 'IT Support' || roleClaim === 'ITSupportManager' || roleClaim === 'Manager'
      ? roleClaim
      : 'ITSupport';

  return {
    id:
      user.id ||
      user.userId ||
      user.sub ||
      user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      user.email ||
      'current-user',
    name: fullName,
    email: user.email || '',
    role: normalizedRole,
    status: user.status || 'Hoạt động',
    avatar: user.avatar,
    phone: user.phone,
    department: user.department,
    lastLoginAt: user.lastLoginAt,
    lastSeenAt: user.lastSeenAt,
    loginCount: user.loginCount,
    isOnline: user.isOnline,
  };
}

function normalizeAuthResponse(response: AuthResponse): User {
  const token =
    ('token' in response ? response.token : undefined) ||
    ('accessToken' in response ? response.accessToken : undefined);

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if ('refreshToken' in response && response.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  }

  const hasAuthFields =
    'user' in response ||
    'token' in response ||
    'accessToken' in response ||
    'refreshToken' in response;

  const userSource =
    'user' in response && response.user
      ? response.user
      : token
      ? { ...(response as BackendUser), ...(decodeTokenPayload(token) || {}) }
      : hasAuthFields
      ? {}
      : (response as BackendUser);

  const user = normalizeUser(userSource || {});
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
}

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
    return normalizeAuthResponse(response);
  },

  register: async (firstName: string, lastName: string, email: string, password: string): Promise<User> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', {
      firstName,
      lastName,
      email,
      password,
    });
    return normalizeAuthResponse(response);
  },

  refreshToken: async (refreshToken: string): Promise<User> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/refresh-token', { refreshToken });
    return normalizeAuthResponse(response);
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
};
