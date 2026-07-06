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

function mapRoleForApi(role: User['role']) {
  const roleMap: Record<string, number> = {
    Admin: 1,
    Manager: 2,
    User: 2,
    Staff: 2,
    'IT Support': 3,
    ITSupportManager: 3,
  };

  if (typeof role === 'string' && roleMap[role] !== undefined) {
    return roleMap[role];
  }

  return role;
}

function buildUserPayload(user: Omit<User, 'id'> & { id?: string; password?: string }) {
  const [firstName, ...lastNameParts] = user.name.trim().split(/\s+/);

  return {
    firstName: firstName || user.name.trim(),
    lastName: lastNameParts.join(' '),
    email: user.email,
    role: mapRoleForApi(user.role),
    password: user.password,
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

  saveUser: async (user: Omit<User, 'id'> & { id?: string; password?: string }): Promise<User> => {
    const payload = buildUserPayload(user);

    if (user.id) {
      const saved = await apiClient.put<User>(`/api/users/${encodeURIComponent(user.id)}`, payload);
      return normalizeUser(saved);
    }
    const saved = await apiClient.post<User>('/api/users', payload);
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
