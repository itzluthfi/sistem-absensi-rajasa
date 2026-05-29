import { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { attendanceApi } from '../../services/api';
import FuturisticLoader from '../../components/ui/FuturisticLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isSiswa = user?.roles?.includes('siswa');

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await attendanceApi.getAll();
      const data = response.data?.data ?? response.data ?? [];
      
      const studentId = user?.student_info?.id;
      if (isSiswa && studentId) {
        const myAttendance = data.filter((a: any) => a.student_id === studentId);
        setAttendanceHistory(myAttendance);
      } else {
        setAttendanceHistory(data);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Image
        source={isMobile ? require('../../assets/images/wallpaper-app-mobile.png') : require('../../assets/images/wallpapaer-app-desktop.png')}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(243, 244, 246, 0.75)', width: '100%', height: '100%' }]} />
      <View style={[styles.titleBar, { backgroundColor: 'transparent', borderBottomColor: 'rgba(0, 0, 0, 0.05)' }]}>
        <Text style={styles.titleText}>Riwayat Kehadiran</Text>
        <Text style={styles.subtitleText}>
          {isSiswa ? 'Daftar kehadiran absensi Anda' : 'Daftar kehadiran absensi sekolah'}
        </Text>
      </View>

      {isLoading && attendanceHistory.length === 0 ? (
        <View style={styles.loadingContainer}>
          <FuturisticLoader text="Memuat Riwayat" color="#06B6D4" />
        </View>
      ) : (
        <FlatList
          data={attendanceHistory}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={loadAttendance} 
              tintColor="#06B6D4" 
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Belum Ada Data</Text>
              <Text style={styles.emptyText}>
                {isSiswa ? 'Belum ada absensi tercatat untuk Anda' : 'Belum ada absensi tercatat hari ini'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dateSection}>
                  <Text style={styles.dateText}>
                    {new Date(item.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  {item.time && (
                    <View style={styles.timeBadge}>
                      <Ionicons name="time-outline" size={12} color="#6B7280" />
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                  )}
                </View>
                <StatusBadge status={item.status} />
              </View>
              
              {!isSiswa && item.student && (
                <View style={styles.studentSection}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={styles.studentName}>{item.student.full_name || 'Siswa'}</Text>
                  {item.student.class && (
                    <Text style={styles.className}> • {item.student.class.class_name}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    hadir: '#10B981',
    telat: '#F59E0B',
    izin: '#3B82F6',
    sakit: '#EF4444',
    alpha: '#6B7280',
  };
  const color = colors[status] || '#6B7280';
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.statusBadgeText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  titleBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitleText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Protect from floating bottom tab bar
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateSection: {
    flex: 1,
    paddingRight: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  studentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  className: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
