/**
 * Role-Based Access Control Configuration
 * Konfigurasi menu dan akses berdasarkan role user
 */

// Role identifiers
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  GURU: 'guru',
  WALI_KELAS: 'wali_kelas',
  SISWA: 'siswa',
  KEPALA_SEKOLAH: 'kepala_sekolah',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// Role labels for display
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin TU',
  [ROLES.GURU]: 'Guru',
  [ROLES.WALI_KELAS]: 'Wali Kelas',
  [ROLES.SISWA]: 'Siswa',
  [ROLES.KEPALA_SEKOLAH]: 'Kepala Sekolah',
};

// Menu types
export interface MenuItem {
  name: string;
  route: string;
  icon: string;
  headerTitle: string;
  roles: RoleType[];
}

// Tab menu configuration with role-based visibility
export const TAB_MENUS: MenuItem[] = [
  {
    name: 'Beranda',
    route: 'index',
    icon: 'home-outline',
    headerTitle: 'SMKS Rajasa',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA, ROLES.KEPALA_SEKOLAH],
  },
  {
    name: 'Absensi',
    route: 'attendance',
    icon: 'qr-code-outline',
    headerTitle: 'Absensi',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA],
  },
  {
    name: 'Data',
    route: 'master-data',
    icon: 'file-tray-full-outline',
    headerTitle: 'Master Data',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WALI_KELAS],
  },
  {
    name: 'Laporan',
    route: 'reports',
    icon: 'bar-chart-outline',
    headerTitle: 'Laporan',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.KEPALA_SEKOLAH],
  },
  {
    name: 'Izin',
    route: 'leave-request',
    icon: 'document-text-outline',
    headerTitle: 'Pengajuan Izin',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA],
  },
  {
    name: 'Notifikasi',
    route: 'notifications',
    icon: 'notifications-outline',
    headerTitle: 'Notifikasi',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA, ROLES.KEPALA_SEKOLAH],
  },
  {
    name: 'Profil',
    route: 'profile',
    icon: 'person-outline',
    headerTitle: 'Profil Saya',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA, ROLES.KEPALA_SEKOLAH],
  },
];

// Quick actions based on role (for home screen)
export interface QuickAction {
  label: string;
  icon: string;
  route: string;
  roles: RoleType[];
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Scan Absensi',
    icon: 'qr-code-outline',
    route: '/(tabs)/attendance',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA],
  },
  {
    label: 'Master Data',
    icon: 'file-tray-full-outline',
    route: '/(tabs)/master-data',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WALI_KELAS],
  },
  {
    label: 'Ajukan Izin',
    icon: 'document-text-outline',
    route: '/(tabs)/leave-request',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA],
  },
  {
    label: 'Lihat Laporan',
    icon: 'bar-chart-outline',
    route: '/(tabs)/reports',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.KEPALA_SEKOLAH],
  },
  {
    label: 'Notifikasi',
    icon: 'notifications-outline',
    route: '/(tabs)/notifications',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GURU, ROLES.WALI_KELAS, ROLES.SISWA, ROLES.KEPALA_SEKOLAH],
  },
];

// Role hierarchy for determining primary role
export const ROLE_HIERARCHY: RoleType[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.WALI_KELAS,
  ROLES.GURU,
  ROLES.KEPALA_SEKOLAH,
  ROLES.SISWA,
];

// Get primary role (highest in hierarchy)
export function getPrimaryRole(roles?: string[]): RoleType | null {
  if (!roles || roles.length === 0) return null;

  for (const role of ROLE_HIERARCHY) {
    if (roles.includes(role)) {
      return role as RoleType;
    }
  }

  return roles[0] as RoleType;
}

// Filter tabs based on user roles
export function getAccessibleMenus(userRoles?: string[]): MenuItem[] {
  if (!userRoles || userRoles.length === 0) return [];

  return TAB_MENUS.filter(menu => {
    // Super admin dan admin bisa akses semua
    if (userRoles.includes(ROLES.SUPER_ADMIN) || userRoles.includes(ROLES.ADMIN)) {
      return true;
    }
    // Cek apakah user role cocok dengan menu
    return menu.roles.some(role => userRoles.includes(role));
  });
}

// Filter quick actions based on user roles
export function getAccessibleActions(userRoles?: string[]): QuickAction[] {
  if (!userRoles || userRoles.length === 0) return [];

  return QUICK_ACTIONS.filter(action => {
    if (userRoles.includes(ROLES.SUPER_ADMIN) || userRoles.includes(ROLES.ADMIN)) {
      return true;
    }
    return action.roles.some(role => userRoles.includes(role));
  });
}