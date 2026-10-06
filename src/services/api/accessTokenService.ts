import { API_BASE_URL, apiClient } from './apiClient';

export type AccessToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
};

export type CreatedAccessToken = {
  token: AccessToken;
  /** Shown once; the backend only keeps a hash. */
  plainToken: string;
};

export const MCP_SERVER_URL = `${API_BASE_URL}/mcp`;

export const accessTokenService = {
  getAll: () => apiClient.get<AccessToken[]>('/api/account/access-tokens'),
  create: (name: string, expiresInDays: number | null) =>
    apiClient.post<CreatedAccessToken>('/api/account/access-tokens', { name, expiresInDays }),
  revoke: (id: string) => apiClient.delete<boolean>(`/api/account/access-tokens/${id}`),
};
