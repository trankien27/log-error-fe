import { User } from '../../types';
import { apiClient } from './apiClient';

type AccountUserResponse = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: User['role'];
  isActive: boolean;
  avatar?: string | null;
};

function normalizeAccountUser(user: AccountUserResponse): User {
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Người dùng';

  return {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
    status: user.isActive ? 'Hoạt động' : 'Vô hiệu hóa',
    avatar: user.avatar || undefined,
  };
}

export const accountService = {
  changePassword: async (currentPassword: string, newPassword: string): Promise<User> => {
    const response = await apiClient.post<AccountUserResponse>('/api/account/change-password', {
      currentPassword,
      newPassword,
    });
    return normalizeAccountUser(response);
  },

  updateAvatar: async (avatarDataUrl: string): Promise<User> => {
    const response = await apiClient.post<AccountUserResponse>('/api/account/avatar', {
      avatarDataUrl,
    });
    return normalizeAccountUser(response);
  },
};
