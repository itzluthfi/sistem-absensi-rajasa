import { useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  ROLES,
  ROLE_LABELS,
  getPrimaryRole,
  getAccessibleMenus,
  getAccessibleActions,
  type RoleType,
  type MenuItem,
  type QuickAction,
} from '../constants/roles';

/**
 * Custom hook untuk role-based access control
 * Mudah digunakan di komponen React
 */
export function useRoleAccess() {
  const { user, hasRole, hasPermission } = useAuthStore();

  const primaryRole = useMemo(() => {
    return getPrimaryRole(user?.roles);
  }, [user?.roles]);

  const roleLabel = useMemo(() => {
    return primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : 'Pengguna';
  }, [primaryRole]);

  const accessibleMenus = useMemo(() => {
    return getAccessibleMenus(user?.roles);
  }, [user?.roles]);

  const accessibleActions = useMemo(() => {
    return getAccessibleActions(user?.roles);
  }, [user?.roles]);

  const canAccess = (requiredRoles: RoleType | RoleType[]) => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Super admin dan admin selalu punya akses
    if (hasRole([ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return true;
    }

    return roles.some(role => user?.roles?.includes(role));
  };

  const canAccessPage = (pageRoute: string) => {
    const menu = accessibleMenus.find(m => m.route === pageRoute);
    return !!menu;
  };

  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isAdmin = hasRole(ROLES.ADMIN);
  const isGuru = hasRole(ROLES.GURU);
  const isWaliKelas = hasRole(ROLES.WALI_KELAS);
  const isSiswa = hasRole(ROLES.SISWA);
  const isKepalaSekolah = hasRole(ROLES.KEPALA_SEKOLAH);

  return {
    // User info
    user,
    primaryRole,
    roleLabel,

    // Access checks
    hasRole,
    hasPermission,
    canAccess,
    canAccessPage,

    // Convenience flags
    isSuperAdmin,
    isAdmin,
    isGuru,
    isWaliKelas,
    isSiswa,
    isKepalaSekolah,

    // Role check helpers
    isAdminOrAbove: isSuperAdmin || isAdmin,
    isGuruOrAbove: isSuperAdmin || isAdmin || isGuru || isWaliKelas || isKepalaSekolah,

    // Menu access
    accessibleMenus,
    accessibleActions,

    // Constants
    ROLES,
    ROLE_LABELS,
  };
}

/**
 * Helper function untuk format role label
 */
export function formatRoleLabel(roles?: string[]): string {
  const primary = getPrimaryRole(roles);
  return primary ? ROLE_LABELS[primary] || primary : 'Pengguna';
}

/**
 * Helper untuk cek apakah user adalah siswa
 */
export function isStudent(roles?: string[]): boolean {
  return roles?.includes(ROLES.SISWA) || false;
}

/**
 * Helper untuk cek apakah user adalah guru
 */
export function isTeacher(roles?: string[]): boolean {
  return roles?.includes(ROLES.GURU) || roles?.includes(ROLES.WALI_KELAS) || false;
}

/**
 * Helper untuk cek apakah user adalah admin/staff
 */
export function isStaff(roles?: string[]): boolean {
  return roles?.includes(ROLES.ADMIN) || roles?.includes(ROLES.SUPER_ADMIN) || false;
}