import { User, Role } from '../../types';
import { apiClient } from './apiClient';

type UsersResponse = User[] | {
  items?: User[];
};

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function normalizeUser(user: any): User {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const name = user.name || `${firstName} ${lastName}`.trim() || user.email || '';

  return {
    ...user,
    id: String(user.id ?? user.userId ?? ''),
    name,
    email: user.email || '',
    role: user.role ?? user.roleId,
    status: user.status || 'Hoạt động',
  };
}

export const usersService = {
  getUsers: async (params: { role?: string | number } = {}): Promise<User[]> => {
    const result = await apiClient.get<UsersResponse>(`/api/users${buildQuery(params)}`);

    if (Array.isArray(result)) {
      return result.map(normalizeUser);
    }

    return Array.isArray(result.items) ? result.items.map(normalizeUser) : [];
  },

  saveUser: async (user: Omit<User, 'id'> & { id?: string }): Promise<User> => {
    if (user.id) {
      const saved = await apiClient.put<User>(`/api/users/${encodeURIComponent(user.id)}`, user);
      return normalizeUser(saved);
    }
    const saved = await apiClient.post<User>('/api/users', user);
    return normalizeUser(saved);
  },

  deleteUser: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/api/users/${encodeURIComponent(id)}`);
    return true;
  },

  getRoles: async (): Promise<Role[]> => {
    return apiClient.get<Role[]>('/api/roles');
  },

  saveRole: async (role: Role, isEdit: boolean): Promise<Role> => {
    if (isEdit) {
      return apiClient.put<Role>(`/api/roles/${encodeURIComponent(role.name)}`, role);
    }
    return apiClient.post<Role>('/api/roles', role);
  }
};
