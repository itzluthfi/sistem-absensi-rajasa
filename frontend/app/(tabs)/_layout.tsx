import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  const canSeeAttendance = !isKepalaSekolah; // All except Kepala Sekolah
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

  return (
    <>
      {/* Custom Header with Notification & Profile icons */}
      <View style={[styles.customHeader, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
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

          {/* Profile Button */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Tab Navigation */}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            position: 'absolute',
            bottom: safeBottom,
            left: 16,
            right: 16,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            height: 64,
            paddingBottom: 8,
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
            fontSize: 11,
            fontWeight: '800',
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

        {/* Master Data */}
        <Tabs.Screen
          name="master-data"
          options={{
            title: 'Data',
            href: canSeeMasterData ? '/(tabs)/master-data' : null,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder-outline" size={size} color={color} />
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

        {/* Hide Profile from bottom tab bar */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            href: null,
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
      </Tabs>
    </>
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
    paddingTop: 48, // Safe area for notch
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
});