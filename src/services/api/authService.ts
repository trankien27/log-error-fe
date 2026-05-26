import { User } from '../../types';
import { apiClient, AUTH_TOKEN_KEY } from './apiClient';

type AuthResponse = User | {
  user: User;
  token?: string;
  accessToken?: string;
};

function normalizeAuthResponse(response: AuthResponse): User {
  if ('user' in response) {
    const token = response.token || response.accessToken;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    return response.user;
  }

  return response;
}

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return normalizeAuthResponse(response);
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    return normalizeAuthResponse(response);
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};
