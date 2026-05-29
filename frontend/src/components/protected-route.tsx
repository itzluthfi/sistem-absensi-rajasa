import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useRoleAccess } from '../hooks/use-role-access';
import { ROLES } from '../constants/roles';
import type { RoleType } from '../constants/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: RoleType[];
  fallbackRoute?: string;
}

/**
 * Komponen untuk memproteksi rute berdasarkan role
 * Jika user tidak punya akses, akan diarahkan ke fallbackRoute atau home
 */
export function ProtectedRoute({ children, requiredRoles, fallbackRoute = '/' }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { canAccess, isAdminOrAbove } = useRoleAccess();

  useEffect(() => {
    if (!isInitialized) return;

    // Cek apakah sudah login
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    // Cek role jika diperlukan
    if (requiredRoles && requiredRoles.length > 0) {
      // Admin dan Super Admin punya akses ke semua
      if (!isAdminOrAbove && !canAccess(requiredRoles)) {
        router.replace(fallbackRoute as never);
      }
    }
  }, [isInitialized, isAuthenticated, requiredRoles]);

  // Loading state
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  // Tidak punya akses - tampilkan pesan
  if (requiredRoles && requiredRoles.length > 0 && !canAccess(requiredRoles) && !isAdminOrAbove) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedIcon}>🔒</Text>
        <Text style={styles.accessDeniedTitle}>Akses Ditolak</Text>
        <Text style={styles.accessDeniedText}>
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Hook untuk proteksi halaman
 */
export function usePageGuard(requiredRoles?: RoleType[], fallbackRoute?: string) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { canAccess, isAdminOrAbove } = useRoleAccess();

  const checkAccess = () => {
    if (!isInitialized) return false;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return false;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!isAdminOrAbove && !canAccess(requiredRoles)) {
        router.replace(fallbackRoute as never);
        return false;
      }
    }

    return true;
  };

  return {
    checkAccess,
    isReady: isInitialized && isAuthenticated,
  };
}

// Quick access component untuk fitur tertentu
interface RoleFeatureProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
  fallback?: React.ReactNode;
}

export function RoleFeature({ children, allowedRoles, fallback = null }: RoleFeatureProps) {
  const { canAccess, isAdminOrAbove } = useRoleAccess();

  if (!isAdminOrAbove && !canAccess(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Admin-only feature wrapper
interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleFeature allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} fallback={fallback}>
      {children}
    </RoleFeature>
  );
}

// Teacher-only feature wrapper
interface TeacherOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  includeWaliKelas?: boolean;
}

export function TeacherOnly({ children, fallback = null, includeWaliKelas = true }: TeacherOnlyProps) {
  const roles = includeWaliKelas
    ? [ROLES.GURU, ROLES.WALI_KELAS, ROLES.SUPER_ADMIN, ROLES.ADMIN]
    : [ROLES.GURU, ROLES.SUPER_ADMIN, ROLES.ADMIN];

  return (
    <RoleFeature allowedRoles={roles as RoleType[]} fallback={fallback}>
      {children}
    </RoleFeature>
  );
}

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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 32,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});