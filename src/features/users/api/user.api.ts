import type { User, Role } from '@/features/users/types/user.type';
import { apiClient } from '@/services/api/apiClient';

export const userApi = {
  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>('/users');
  },

  getRoles: async (): Promise<Role[]> => {
    return apiClient.get<Role[]>('/roles');
  },

  saveUser: async (user: Omit<User, 'id'> & { id?: string }): Promise<User> => {
    if (user.id) {
      return apiClient.put<User>(`/users/${encodeURIComponent(user.id)}`, user);
    }
    return apiClient.post<User>('/users', user);
  },

  deleteUser: async (id: string): Promise<boolean> => {
    await apiClient.delete<void>(`/users/${encodeURIComponent(id)}`);
    return true;
  },

  saveRole: async (role: Role, isEdit: boolean): Promise<Role> => {
    if (isEdit) {
      return apiClient.put<Role>(`/roles/${encodeURIComponent(role.name)}`, role);
    }
    return apiClient.post<Role>('/roles', role);
  }
};
