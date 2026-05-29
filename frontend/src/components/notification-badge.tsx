import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationBadgeProps {
  size?: number;
  maxCount?: number;
  showZero?: boolean;
  onPress?: () => void;
  style?: any;
}

/**
 * Komponen badge notifikasi untuk ditampilkan di navbar
 */
export function NotificationBadge({
  size = 20,
  maxCount = 99,
  showZero = false,
  onPress,
  style,
}: NotificationBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadNotificationCount();
  }, []);

  const loadNotificationCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        const unread = notifications.filter((n: any) => !n.is_read).length;
        setCount(unread);
      }
    } catch {
      // Silent fail
    }
  };

  const getDisplayCount = () => {
    if (count === 0 && !showZero) return null;
    if (count > maxCount) return `${maxCount}+`;
    return count.toString();
  };

  const displayCount = getDisplayCount();

  if (!displayCount && !showZero) {
    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} style={style}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      );
    }
    return (
      <View style={style}>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={24} color="#fff" />
      <View
        style={[
          styles.badge,
          {
            minWidth: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: size * 0.5 }]}>
          {displayCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Role indicator dot untuk navbar
 */
export function RoleIndicatorDot({ roles }: { roles?: string[] }) {
  const getColor = () => {
    if (!roles || roles.length === 0) return '#6B7280';
    if (roles.includes('super_admin')) return '#DC2626';
    if (roles.includes('admin')) return '#F59E0B';
    if (roles.includes('wali_kelas')) return '#8B5CF6';
    if (roles.includes('guru')) return '#3B82F6';
    if (roles.includes('kepala_sekolah')) return '#059669';
    if (roles.includes('siswa')) return '#10B981';
    return '#6B7280';
  };

  return <View style={[styles.roleDot, { backgroundColor: getColor() }]} />;
}

/**
 * Quick action indicator untuk navbar (seperti avatar/icon user)
 */
export function QuickRoleIndicator({ roles }: { roles?: string[] }) {
  const getIcon = () => {
    if (!roles || roles.length === 0) return '👤';
    if (roles.includes('super_admin')) return '🔰';
    if (roles.includes('admin')) return '⚙️';
    if (roles.includes('wali_kelas')) return '📋';
    if (roles.includes('guru')) return '👨‍🏫';
    if (roles.includes('kepala_sekolah')) return '🏫';
    if (roles.includes('siswa')) return '🎓';
    return '👤';
  };

  return (
    <View style={styles.roleIndicator}>
      <Text style={styles.roleIcon}>{getIcon()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleIndicator: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  roleIcon: {
    fontSize: 14,
  },
});
