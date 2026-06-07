/**
 * Role-specific dashboard configuration
 */

import { ROLES, type RoleType } from '../constants/roles';

export interface DashboardConfig {
  role: RoleType;
  title: string;
  subtitle: string;
  greeting: string;
  primaryColor: string;
  features: DashboardFeature[];
}

export interface DashboardFeature {
  label: string;
  icon: string;
  route: string;
  description: string;
  badge?: string;
}

// Dashboard configurations per role
export const DASHBOARD_CONFIGS: Record<RoleType, DashboardConfig> = {
  [ROLES.SUPER_ADMIN]: {
    role: ROLES.SUPER_ADMIN,
    title: 'Dashboard Super Admin',
    subtitle: 'Kelola seluruh sistem absensi',
    greeting: 'Halo, Administrator!',
    primaryColor: '#DC2626',
    features: [
      { label: 'Live Monitor Gerbang', icon: 'pulse-outline', route: '/monitor', description: 'Pantau kedatangan gerbang real-time' },
      { label: 'Kelola Pengguna', icon: 'key-outline', route: '/admin/users', description: 'Kelola login pengguna dan hak akses' },
      { label: 'Kelola Siswa', icon: 'school-outline', route: '/admin/students', description: 'Tambah, edit, hapus data siswa' },
      { label: 'Kelola Guru', icon: 'people-outline', route: '/admin/teachers', description: 'Kelola data guru dan wali kelas' },
      { label: 'Kelola Kelas', icon: 'business-outline', route: '/admin/classes', description: 'Kelola rombel kelas' },
      { label: 'Kelola Jadwal', icon: 'calendar-outline', route: '/admin/schedules', description: 'Kelola jadwal belajar mengajar' },
      { label: 'Log Notifikasi', icon: 'list-circle-outline', route: '/admin/notification-logs', description: 'Pantau status notifikasi & Firebase' },
      { label: 'Pengaturan GPS Lokasi Absen', icon: 'locate-outline', route: '/admin/gps-settings', description: 'Konfigurasi lokasi & radius absen sekolah' },
      { label: 'Laporan Absensi', icon: 'bar-chart-outline', route: '/(tabs)/reports', description: 'Lihat dan ekspor laporan' },
      { label: 'Persetujuan Izin', icon: 'checkmark-circle-outline', route: '/(tabs)/leave-request', description: 'Approval pengajuan izin' },
    ],
  },
  [ROLES.ADMIN]: {
    role: ROLES.ADMIN,
    title: 'Dashboard Admin TU',
    subtitle: 'Kelola data dan laporan',
    greeting: 'Halo, Admin TU!',
    primaryColor: '#F59E0B',
    features: [
      { label: 'Live Monitor Gerbang', icon: 'pulse-outline', route: '/monitor', description: 'Pantau kedatangan gerbang real-time' },
      { label: 'Kelola Pengguna', icon: 'key-outline', route: '/admin/users', description: 'Kelola login pengguna' },
      { label: 'Kelola Siswa', icon: 'school-outline', route: '/admin/students', description: 'Kelola data siswa' },
      { label: 'Kelola Guru', icon: 'people-outline', route: '/admin/teachers', description: 'Kelola data guru' },
      { label: 'Kelola Kelas', icon: 'business-outline', route: '/admin/classes', description: 'Kelola kelas' },
      { label: 'Kelola Jadwal', icon: 'calendar-outline', route: '/admin/schedules', description: 'Kelola jadwal' },
      { label: 'Log Notifikasi', icon: 'list-circle-outline', route: '/admin/notification-logs', description: 'Pantau status notifikasi & Firebase' },
      { label: 'pengaturan GPS Lokasi Absen', icon: 'locate-outline', route: '/admin/gps-settings', description: 'Konfigurasi lokasi & radius absen sekolah' },
      { label: 'Scan Absensi', icon: 'qr-code-outline', route: '/(tabs)/attendance', description: 'Scan QR siswa' },
      { label: 'Laporan', icon: 'bar-chart-outline', route: '/(tabs)/reports', description: 'Ekspor laporan' },
    ],
  },
  [ROLES.GURU]: {
    role: ROLES.GURU,
    title: 'Dashboard Guru',
    subtitle: 'Kelola absensi dan jadwal',
    greeting: 'Selamat datang, Guru!',
    primaryColor: '#3B82F6',
    features: [
      { label: 'Live Monitor Gerbang', icon: 'pulse-outline', route: '/monitor', description: 'Pantau kedatangan gerbang real-time' },
      { label: 'Scan Absensi', icon: 'qr-code-outline', route: '/(tabs)/attendance', description: 'Scan QR untuk absen' },
      { label: 'Input Manual', icon: 'create-outline', route: '/(tabs)/attendance', description: 'Input absensi manual' },
      { label: 'Ajukan Izin', icon: 'document-text-outline', route: '/(tabs)/leave-request', description: 'Ajukan izin ketidakhadiran' },
      { label: 'Lihat Laporan', icon: 'bar-chart-outline', route: '/(tabs)/reports', description: 'Lihat statistik' },
    ],
  },
  [ROLES.WALI_KELAS]: {
    role: ROLES.WALI_KELAS,
    title: 'Dashboard Wali Kelas',
    subtitle: 'Kelola absensi kelas',
    greeting: 'Selamat datang, Wali Kelas!',
    primaryColor: '#8B5CF6',
    features: [
      { label: 'Live Monitor Gerbang', icon: 'pulse-outline', route: '/monitor', description: 'Pantau kedatangan gerbang real-time' },
      { label: 'Kelas Perwalian', icon: 'ribbon-outline', route: '/teacher/perwalian', description: 'Kelola roster, jadwal, & izin kelas perwalian' },
      { label: 'Absensi Siswa', icon: 'qr-code-outline', route: '/(tabs)/attendance', description: 'Scan dan input absensi' },
      { label: 'Laporan Kelas', icon: 'bar-chart-outline', route: '/(tabs)/reports', description: 'Statistik kelas' },
      { label: 'Lihat Siswa', icon: 'people-outline', route: '/admin/students', description: 'Data siswa kelas' },
      { label: 'Jadwal Kelas', icon: 'calendar-outline', route: '/admin/schedules', description: 'Jadwal pelajaran kelas bimbingan' },
    ],
  },
  [ROLES.SISWA]: {
    role: ROLES.SISWA,
    title: 'Dashboard Siswa',
    subtitle: 'Lihat absensi dan ajukan izin',
    greeting: 'Selamat datang, Siswa!',
    primaryColor: '#10B981',
    features: [
      { label: 'Scan Absensi', icon: 'qr-code-outline', route: '/(tabs)/attendance', description: 'Scan QR untuk absen' },
      { label: 'Riwayat Absensi', icon: 'time-outline', route: '/(tabs)/attendance', description: 'Lihat absensi saya' },
      { label: 'Ajukan Izin', icon: 'document-text-outline', route: '/(tabs)/leave-request', description: 'Ajukan izin sakit/ijin' },
      { label: 'Notifikasi', icon: 'notifications-outline', route: '/(tabs)/notifications', description: 'Pengumuman terbaru' },
    ],
  },
  [ROLES.KEPALA_SEKOLAH]: {
    role: ROLES.KEPALA_SEKOLAH,
    title: 'Dashboard Kepala Sekolah',
    subtitle: 'Monitoring seluruh sekolah',
    greeting: 'Selamat datang, Kepala Sekolah!',
    primaryColor: '#EC4899',
    features: [
      { label: 'Live Monitor Gerbang', icon: 'pulse-outline', route: '/monitor', description: 'Pantau kedatangan gerbang real-time' },
      { label: 'Overview Sekolah', icon: 'school-outline', route: '/(tabs)/reports', description: 'Statistik sekolah' },
      { label: 'Laporan Absensi', icon: 'bar-chart-outline', route: '/(tabs)/reports', description: 'Semua laporan' },
      { label: 'Notifikasi', icon: 'notifications-outline', route: '/(tabs)/notifications', description: 'Pengumuman terbaru' },
      { label: 'Profil', icon: 'person-outline', route: '/(tabs)/profile', description: 'Pengaturan akun' },
    ],
  },
};

// Helper function to get dashboard config
export function getDashboardConfig(roles?: string[]): DashboardConfig | null {
  if (!roles || roles.length === 0) return null;

  // Check roles in order of priority
  const rolePriority: RoleType[] = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.WALI_KELAS,
    ROLES.GURU,
    ROLES.KEPALA_SEKOLAH,
    ROLES.SISWA,
  ];

  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return DASHBOARD_CONFIGS[role];
    }
  }

  return null;
}

// Get role-specific quick stats
export function getQuickStats(role: RoleType): QuickStatConfig {
  const configs: Record<RoleType, QuickStatConfig> = {
    [ROLES.SUPER_ADMIN]: {
      totalStudents: true,
      totalTeachers: true,
      totalClasses: true,
      todayAttendance: true,
      pendingLeaves: true,
      absentRate: true,
    },
    [ROLES.ADMIN]: {
      totalStudents: true,
      todayAttendance: true,
      pendingLeaves: true,
      absentRate: true,
    },
    [ROLES.GURU]: {
      myClasses: true,
      todayAttendance: true,
      pendingLeaves: true,
    },
    [ROLES.WALI_KELAS]: {
      myClass: true,
      myStudents: true,
      classAttendance: true,
      pendingLeaves: true,
    },
    [ROLES.SISWA]: {
      myAttendance: true,
      myClass: true,
      izinStatus: true,
    },
    [ROLES.KEPALA_SEKOLAH]: {
      totalStudents: true,
      totalTeachers: true,
      schoolAttendance: true,
      topClasses: true,
    },
  };

  return configs[role] || {};
}

export interface QuickStatConfig {
  totalStudents?: boolean;
  totalTeachers?: boolean;
  totalClasses?: boolean;
  todayAttendance?: boolean;
  pendingLeaves?: boolean;
  absentRate?: boolean;
  myClasses?: boolean;
  myClass?: boolean;
  myStudents?: boolean;
  classAttendance?: boolean;
  myAttendance?: boolean;
  izinStatus?: boolean;
  schoolAttendance?: boolean;
  topClasses?: boolean;
}