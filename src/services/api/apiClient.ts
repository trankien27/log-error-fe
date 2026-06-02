export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7168').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const AUTH_USER_KEY = 'auth_user';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload?.data ?? payload) as T;
}

export const apiClient = {
  request: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    return parseResponse<T>(response);
  },

  get: <T>(path: string) => apiClient.request<T>(path),
  post: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiClient.request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiClient.request<T>(path, { method: 'DELETE' }),
};
