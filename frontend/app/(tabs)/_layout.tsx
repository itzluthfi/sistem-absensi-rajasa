import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, useWindowDimensions, Platform, ScrollView } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Notification badge count helper
async function getNotificationCount(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem('notifications');
    if (stored) {
      const notifications = JSON.parse(stored);
      return notifications.filter((n: any) => !n.is_read).length;
    }
  } catch {}
  return 0;
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isInitialized, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    setMounted(true);
    loadNotificationCount();
  }, []);

  const loadNotificationCount = async () => {
    const count = await getNotificationCount();
    setNotificationCount(count);
  };

  // Wait for auth to initialize
  if (!mounted || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Mengalihkan...</Text>
      </View>
    );
  }

  // Check user's roles
  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes('super_admin');
  const isAdmin = userRoles.includes('admin');
  const isWaliKelas = userRoles.includes('wali_kelas');
  const isGuru = userRoles.includes('guru');
  const isSiswa = userRoles.includes('siswa');
  const isKepalaSekolah = userRoles.includes('kepala_sekolah');

  // Permission checks for bottom tabs
  const canSeeMasterData = isSuperAdmin || isAdmin || isWaliKelas; // Admin, Super Admin, Wali Kelas
  const canSeeAttendance = isSiswa || isSuperAdmin || isAdmin || isGuru || isWaliKelas; // Only Siswa, Super Admin, Admin TU, and Teachers can see Scan Absensi tab
  const canSeeReports = !isSiswa; // All role except Siswa
  const canSeeLeaveRequest = !isKepalaSekolah; // All except Kepala Sekolah

  // Get role display info
  const getRoleColor = () => {
    if (userRoles.includes('super_admin')) return '#DC2626';
    if (userRoles.includes('admin')) return '#F59E0B';
    if (userRoles.includes('wali_kelas')) return '#8B5CF6';
    if (userRoles.includes('guru')) return '#3B82F6';
    if (userRoles.includes('kepala_sekolah')) return '#EC4899';
    if (userRoles.includes('siswa')) return '#10B981';
    return '#6B7280';
  };

  const getRoleLabel = () => {
    const roleMap: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin TU',
      guru: 'Guru',
      wali_kelas: 'Wali Kelas',
      siswa: 'Siswa',
      kepala_sekolah: 'Kepsek',
    };
    return roleMap[userRoles[0]] || 'Pengguna';
  };

  const sections = [
    {
      title: 'UTAMA',
      show: true,
      items: [
        { name: 'index', label: 'Beranda', icon: 'home-outline', activeIcon: 'home', href: '/(tabs)', show: true },
        { name: 'attendance', label: 'Scan Absensi', icon: 'qr-code-outline', activeIcon: 'qr-code', href: '/(tabs)/attendance', show: canSeeAttendance },
        { name: 'history', label: 'Riwayat', icon: 'time-outline', activeIcon: 'time', href: '/(tabs)/history', show: true },
        { name: 'leave-request', label: 'Izin', icon: 'document-text-outline', activeIcon: 'document-text', href: '/(tabs)/leave-request', show: canSeeLeaveRequest },
        { name: 'reports', label: 'Laporan', icon: 'bar-chart-outline', activeIcon: 'bar-chart', href: '/(tabs)/reports', show: canSeeReports },
      ]
    },
    {
      title: 'MANAJEMEN DATA',
      show: isSuperAdmin || isAdmin,
      items: [
        { name: 'users', label: 'Data User', icon: 'people-outline', activeIcon: 'people', href: '/admin/users', show: true },
        { name: 'students', label: 'Data Siswa', icon: 'school-outline', activeIcon: 'school', href: '/admin/students', show: true },
        { name: 'teachers', label: 'Data Guru', icon: 'person-outline', activeIcon: 'person', href: '/admin/teachers', show: true },
        { name: 'classes', label: 'Data Kelas', icon: 'business-outline', activeIcon: 'business', href: '/admin/classes', show: true },
        { name: 'schedules', label: 'Data Jadwal', icon: 'calendar-outline', activeIcon: 'calendar', href: '/admin/schedules', show: true },
        { name: 'gps-settings', label: 'Pengaturan GPS', icon: 'locate-outline', activeIcon: 'locate', href: '/admin/gps-settings', show: true },
      ]
    },
    {
      title: 'AKUN',
      show: true,
      items: [
        { name: 'notifications', label: 'Notifikasi', icon: 'notifications-outline', activeIcon: 'notifications', href: '/(tabs)/notifications', show: true },
        { name: 'profile', label: 'Profil Saya', icon: 'person-circle-outline', activeIcon: 'person-circle', href: '/(tabs)/profile', show: true },
      ]
    }
  ];

  const isActive = (itemHref: string) => {
    const normalizedHref = itemHref.replace('/(tabs)', '') || '/';
    const normalizedPathname = pathname || '/';
    
    if (normalizedHref === '/') {
      return normalizedPathname === '/' || normalizedPathname === '/index';
    }
    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + '/');
  };

  const renderTabsComponent = () => (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: !isMobile ? { display: 'none' } : {
          position: 'absolute',
          bottom: safeBottom,
          left: 16,
          right: 16,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.05)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false, // Hide default header
      }}
    >
      {/* Beranda */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Absensi / Scan QR */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Scan Absensi',
          href: canSeeAttendance ? '/(tabs)/attendance' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Riwayat Absensi */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Pengajuan Izin */}
      <Tabs.Screen
        name="leave-request"
        options={{
          title: 'Izin',
          href: canSeeLeaveRequest ? '/(tabs)/leave-request' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Laporan */}
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          href: canSeeReports ? '/(tabs)/reports' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Profil Saya */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />

      {/* Hide Notifications from bottom tab bar */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          href: null,
        }}
      />

      {/* Hide master-data route since it is removed */}
      <Tabs.Screen
        name="master-data"
        options={{
          title: 'Data',
          href: null,
        }}
      />

      {/* Admin Management Screens - Hidden from bottom tab bar but inheriting TabsLayout */}
      <Tabs.Screen
        name="admin/users"
        options={{
          title: 'Data User',
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/students"
        options={{
          title: 'Data Siswa',
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/teachers"
        options={{
          title: 'Data Guru',
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/classes"
        options={{
          title: 'Data Kelas',
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/schedules"
        options={{
          title: 'Data Jadwal',
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/gps-settings"
        options={{
          title: 'Pengaturan GPS',
          href: null,
        }}
      />
    </Tabs>
  );

  if (isMobile) {
    return (
      <>
        {/* Custom Header with Notification & Profile icons */}
        <View style={[
          styles.customHeader,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
            paddingTop: Platform.OS === 'web' ? 8 : Math.max(8, insets.top - 6),
            paddingBottom: 8,
          }
        ]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>SMKS Rajasa</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor()}20` }]}>
              <Text style={[styles.roleText, { color: getRoleColor() }]}>{getRoleLabel()}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Notifications Button with Badge */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/(tabs)/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {renderTabsComponent()}
      </>
    );
  }

  // DESKTOP LAYOUT (WITH SIDEBAR)
  return (
    <View style={styles.desktopLayout}>
      {/* Sidebar Navigation */}
      <View style={styles.sidebarContainer}>
        <View style={[styles.sidebarTopSection, { flex: 1 }]}>
          {/* School branding */}
          <View style={styles.sidebarHeader}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.sidebarLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.sidebarTitle}>SMKS Rajasa</Text>
              <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor()}20`, marginTop: 2 }]}>
                <Text style={[styles.roleText, { color: getRoleColor() }]}>{getRoleLabel()}</Text>
              </View>
            </View>
          </View>

          {/* User profile card */}
          <View style={styles.sidebarUserCard}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.sidebarUserTexts}>
              <Text style={styles.sidebarUserName} numberOfLines={1}>{user?.name}</Text>
              <Text style={styles.sidebarUserEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>

          {/* Grouped Menu Sections */}
          <ScrollView
            style={[styles.sidebarMenu, { flex: 1 }]}
            contentContainerStyle={{ gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section) => {
              if (section.show === false) return null;
              return (
                <View key={section.title} style={styles.sidebarSection}>
                  <Text style={styles.sidebarSectionHeader}>{section.title}</Text>
                  <View style={{ gap: 4 }}>
                    {section.items.map((item) => {
                      if (item.show === false) return null;
                      const active = isActive(item.href);
                      return (
                        <TouchableOpacity
                          key={item.name}
                          style={[styles.sidebarMenuItem, active && styles.sidebarMenuItemActive]}
                          onPress={() => router.push(item.href as any)}
                        >
                          <Ionicons
                            name={(active ? item.activeIcon : item.icon) as any}
                            size={18}
                            color={active ? '#3B82F6' : '#4B5563'}
                          />
                          <Text style={[styles.sidebarMenuText, active && styles.sidebarMenuTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Sidebar Footer with Logout Button */}
        <View style={styles.sidebarFooter}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={async () => {
              const { logout } = useAuthStore.getState();
              await logout();
              router.replace('/(auth)/login');
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.desktopContent}>
        {/* Desktop Mini Header */}
        <View style={styles.desktopHeader}>
          <Text style={styles.desktopPageTitle}>Rajasa Academic System (RAS)</Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {renderTabsComponent()}
      </View>
    </View>
  );
}

// Import authStore
import { useAuthStore } from '../../store/authStore';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 48, // Safe area for notch
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
  },
  sidebarContainer: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    padding: 20,
    justifyContent: 'space-between',
  },
  sidebarTopSection: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingTop: 12,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  sidebarUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarLargeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B82F6',
  },
  sidebarUserTexts: {
    flex: 1,
    overflow: 'hidden',
  },
  sidebarUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  sidebarUserEmail: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  sidebarMenu: {
    flex: 1,
    gap: 6,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sidebarMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  sidebarMenuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  sidebarMenuTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  sidebarFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  desktopContent: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  desktopPageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  sidebarSection: {
    marginBottom: 16,
  },
  sidebarSectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 6,
    paddingHorizontal: 16,
    letterSpacing: 1,
  },
});