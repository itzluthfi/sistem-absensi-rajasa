import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { formatRoleLabel } from '../../src/hooks/use-role-access';
import { ROLES } from '../../src/constants/roles';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  showNotification?: boolean;
  notificationCount?: number;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
  };
}

export function HeaderNavbar({
  title = 'SMKS Rajasa',
  showBack = false,
  showNotification = true,
  notificationCount = 0,
  rightAction,
}: NavbarProps) {
  const router = useRouter();
  const { user, isSiswa, isGuru, isWaliKelas, isAdminOrAbove } = useAuthStore();

  const notificationBadge = notificationCount > 0 && notificationCount <= 99
    ? notificationCount.toString()
    : notificationCount > 99
      ? '99+'
      : '';

  return (
    <View style={styles.navbar}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={styles.roleIndicator}>
            <View style={[styles.roleDot, { backgroundColor: getRoleColor(user?.roles) }]} />
            <Text style={styles.roleText}>{formatRoleLabel(user?.roles)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Quick Status Indicator */}
        {isSiswa && (
          <View style={styles.statusBadge} title="Status Siswa">
            <Text style={styles.statusIcon}>🎓</Text>
          </View>
        )}
        {isGuru && (
          <View style={styles.statusBadge} title="Status Guru">
            <Text style={styles.statusIcon}>👨‍🏫</Text>
          </View>
        )}
        {isWaliKelas && (
          <View style={styles.statusBadge} title="Status Wali Kelas">
            <Text style={styles.statusIcon}>📋</Text>
          </View>
        )}
        {isAdminOrAbove && (
          <View style={styles.statusBadge} title="Status Admin">
            <Text style={styles.statusIcon}>⚙️</Text>
          </View>
        )}

        {/* Right action button (custom) */}
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.actionButton}>
            <Ionicons name={rightAction.icon} size={24} color={rightAction.color || '#fff'} />
          </TouchableOpacity>
        )}

        {/* Notification Bell */}
        {showNotification && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications' as never)}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {notificationBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationBadge}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function getRoleColor(roles?: string[]): string {
  if (!roles || roles.length === 0) return '#6B7280';

  if (roles.includes(ROLES.SUPER_ADMIN)) return '#DC2626';
  if (roles.includes(ROLES.ADMIN)) return '#F59E0B';
  if (roles.includes(ROLES.WALI_KELAS)) return '#8B5CF6';
  if (roles.includes(ROLES.GURU)) return '#3B82F6';
  if (roles.includes(ROLES.KEPALA_SEKOLAH)) return '#059669';
  if (roles.includes(ROLES.SISWA)) return '#10B981';

  return '#6B7280';
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  roleText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  statusIcon: {
    fontSize: 14,
  },
  actionButton: {
    padding: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
});
