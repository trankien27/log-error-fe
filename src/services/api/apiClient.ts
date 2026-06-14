export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7168').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const AUTH_USER_KEY = 'auth_user';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type RefreshTokenResponse = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
};

export class ApiError extends Error {
  code?: string;
  data?: unknown;
  status: number;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

let refreshTokenPromise: Promise<string> | null = null;

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload?.code, payload?.data);
  }

  return (payload?.data ?? payload) as T;
}

function clearAuthStorage() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

async function refreshAccessToken(): Promise<string> {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      clearAuthStorage();
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const payload = await parseResponse<RefreshTokenResponse>(response);
    const accessToken = payload.accessToken || payload.token;

    if (!accessToken) {
      clearAuthStorage();
      throw new Error('Không thể làm mới phiên đăng nhập.');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (payload.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    }

    return accessToken;
  })().catch(error => {
    clearAuthStorage();
    throw error;
  }).finally(() => {
    refreshTokenPromise = null;
  });

  return refreshTokenPromise;
}

export const apiClient = {
  request: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const executeRequest = async () => {
      const headers = new Headers(options.headers);

      if (!headers.has('Content-Type') && options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
      }

      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    };

    let response = await executeRequest();

    if (response.status === 401 && path !== '/api/auth/refresh-token') {
      await refreshAccessToken();
      response = await executeRequest();
    }

    return parseResponse<T>(response);
  },

  get: <T>(path: string) => apiClient.request<T>(path),
  post: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiClient.request<T>(path, { method: 'DELETE' }),
};
