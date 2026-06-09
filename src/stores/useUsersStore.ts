import { create } from 'zustand';
import { User, Role } from '../types';
import { usersService } from '../services/api/usersService';

interface UsersState {
  users: User[];
  roles: Role[];
  isLoading: boolean;
  error: string | null;

  // Search & Filter
  searchQuery: string;
  userRoleFilter: string;

  // Selected profile
  selectedUserProfileUser: User | null;

  // Modals & Form editing
  isUserModalOpen: boolean;
  currentEditingUser: User | null;
  isRoleModalOpen: boolean;
  currentEditingRole: Role | null;

  // Setters/Actions
  setSearchQuery: (query: string) => void;
  setUserRoleFilter: (role: string) => void;
  setSelectedUserProfileUser: (user: User | null) => void;
  setIsUserModalOpen: (isOpen: boolean) => void;
  setCurrentEditingUser: (user: User | null) => void;
  setIsRoleModalOpen: (isOpen: boolean) => void;
  setCurrentEditingRole: (role: Role | null) => void;

  fetchUsersAndRoles: () => Promise<void>;
  saveUser: (user: Omit<User, 'id'> & { id?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveRole: (role: Role, isEdit: boolean) => Promise<void>;
  
  // Helpers
  getFilteredUsers: () => User[];
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  roles: [],
  isLoading: false,
  error: null,

  searchQuery: '',
  userRoleFilter: '',

  selectedUserProfileUser: null,

  isUserModalOpen: false,
  currentEditingUser: null,
  isRoleModalOpen: false,
  currentEditingRole: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setUserRoleFilter: (userRoleFilter) => set({ userRoleFilter }),
  setSelectedUserProfileUser: (selectedUserProfileUser) => set({ selectedUserProfileUser }),
  setIsUserModalOpen: (isUserModalOpen) => set({ isUserModalOpen }),
  setCurrentEditingUser: (currentEditingUser) => set({ currentEditingUser }),
  setIsRoleModalOpen: (isRoleModalOpen) => set({ isRoleModalOpen }),
  setCurrentEditingRole: (currentEditingRole) => set({ currentEditingRole }),

  fetchUsersAndRoles: async () => {
    set({ isLoading: true });
    try {
      const [usersResult, rolesResult] = await Promise.allSettled([
        usersService.getUsers(),
        usersService.getRoles(),
      ]);

      set({
        users: usersResult.status === 'fulfilled' ? usersResult.value : [],
        roles: rolesResult.status === 'fulfilled' ? rolesResult.value : [],
        error:
          usersResult.status === 'rejected'
            ? usersResult.reason?.message || 'Không thể tải danh sách người dùng.'
            : rolesResult.status === 'rejected'
            ? rolesResult.reason?.message || 'Không thể tải danh sách vai trò.'
            : null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const savedUser = await usersService.saveUser(userData);
      set((state) => {
        const exists = state.users.some(u => u.id === savedUser.id);
        const updatedUsers = exists
          ? state.users.map(u => u.id === savedUser.id ? savedUser : u)
          : [...state.users, savedUser];
        
        // Also update selected profile if it is the edited user
        const updatedProfile = state.selectedUserProfileUser?.id === savedUser.id ? savedUser : state.selectedUserProfileUser;

        return { users: updatedUsers, selectedUserProfileUser: updatedProfile, isLoading: false };
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.deleteUser(id);
      set((state) => ({
        users: state.users.filter(u => u.id !== id),
        selectedUserProfileUser: state.selectedUserProfileUser?.id === id ? null : state.selectedUserProfileUser,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  saveRole: async (role, isEdit) => {
    set({ isLoading: true, error: null });
    try {
      const savedRole = await usersService.saveRole(role, isEdit);
      set((state) => {
        const updatedRoles = isEdit
          ? state.roles.map(r => r.name === savedRole.name ? savedRole : r)
          : [...state.roles, savedRole];
        return { roles: updatedRoles, isLoading: false };
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  getFilteredUsers: () => {
    const { users, searchQuery, userRoleFilter } = get();
    return users.filter(user => {
      const sQuery = searchQuery.toLowerCase();
      const infoMatch = 
        user.name.toLowerCase().includes(sQuery) || 
        user.email.toLowerCase().includes(sQuery) || 
        user.id.toLowerCase().includes(sQuery);
      const roleMatch = userRoleFilter ? user.role === userRoleFilter : true;
      return infoMatch && roleMatch;
    });
  }
}));
