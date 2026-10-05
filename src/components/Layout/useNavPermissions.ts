import { useAuthStore } from '../../stores/useAuthStore';
import type { NavPermissions } from './navigation';

export function useNavPermissions(): NavPermissions {
  // Subscribe to currentUser so permissions recompute after login/logout.
  useAuthStore(state => state.currentUser);
  const hasAnyRole = useAuthStore(state => state.hasAnyRole);
  const getCurrentRoleNumber = useAuthStore(state => state.getCurrentRoleNumber);

  return {
    isAdmin: hasAnyRole([1, 'Admin']),
    canApproveOvertime: hasAnyRole([1, 3, 'Admin', 'ITSupportManager']),
    canViewR2Usage: hasAnyRole([1, 3, 'Admin', 'ITSupportManager']),
    canViewShifts: getCurrentRoleNumber() !== 2,
  };
}
