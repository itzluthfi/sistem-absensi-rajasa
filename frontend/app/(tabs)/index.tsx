import { useEffect, useState, useMemo } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore, type ScheduleRecord } from '../../store/attendanceStore';
import { formatRoleLabel } from '../../src/hooks/use-role-access';
import { getDashboardConfig } from '../../src/constants/dashboard-config';
import { useWindowDimensions } from 'react-native';
import FuturisticLoader from '../../components/ui/FuturisticLoader';
import ShimmerButton from '../../components/ui/ShimmerButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    todaySchedules, 
    fetchTodaySchedules, 
    openAttendanceSession, 
    closeAttendanceSession,
    isLoading,
    fetchAttendances,
    attendances,
    dailyCheckIn
  } = useAttendanceStore();

  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  const [dailyCheckInLoading, setDailyCheckInLoading] = useState(false);
  const todayDateStr = new Date().toISOString().split('T')[0];

  const dailyCheckInRecord = useMemo(() => {
    return attendances.find((att) => {
      const attDate = typeof att.date === 'string' ? att.date : new Date(att.date).toISOString().split('T')[0];
      return attDate === todayDateStr && att.schedule_id === null;
    });
  }, [attendances]);

  const loadData = () => {
    fetchTodaySchedules();
    fetchAttendances();
  };

  const handleDailyCheckIn = async () => {
    setDailyCheckInLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi Diperlukan', 'Kami memerlukan akses lokasi Anda untuk memastikan Anda berada di area sekolah.');
        setDailyCheckInLoading(false);
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      
      const result = await dailyCheckIn({ location: coords });
      if (result.success) {
        Alert.alert('Sukses', result.message || 'Absen masuk sekolah berhasil dicatat.');
        loadData();
      } else {
        Alert.alert('Gagal', result.message);
      }
    } catch (e: any) {
      Alert.alert('Gagal', 'Terjadi kesalahan sistem saat memproses absen masuk.');
    } finally {
      setDailyCheckInLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dashboardConfig = getDashboardConfig(user?.roles);

  // Get role-specific greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const handleOpenPresensi = async (scheduleId: number) => {
    Alert.alert(
      'Pilih Metode Presensi',
      'Tentukan metode pencatatan kehadiran untuk siswa:',
      [
        {
          text: 'Hanya Klik Tombol (Rekomendasi / Default)',
          onPress: async () => {
            const result = await openAttendanceSession(scheduleId, false);
            if (result.success) {
              fetchTodaySchedules();
              router.push('/(tabs)/attendance' as never);
            }
          }
        },
        {
          text: 'Wajib Scan QR Code',
          onPress: async () => {
            const result = await openAttendanceSession(scheduleId, true);
            if (result.success) {
              fetchTodaySchedules();
              router.push('/(tabs)/attendance' as never);
            }
          }
        },
        {
          text: 'Batal',
          style: 'cancel'
        }
      ]
    );
  };

  const handleClosePresensi = async (sessionId: number) => {
    const result = await closeAttendanceSession(sessionId);
    if (result.success) {
      fetchTodaySchedules();
    }
  };

  if (!dashboardConfig) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' }]}>
        <FuturisticLoader text="Menyiapkan Portal" />
      </View>
    );
  }

  const isSiswa = user?.roles?.includes('siswa');
  const isGuru = user?.roles?.includes('guru') || user?.roles?.includes('wali_kelas');
  const isAdminOrSuper = user?.roles?.includes('super_admin') || user?.roles?.includes('admin');
  const isKepalaSekolah = user?.roles?.includes('kepala_sekolah');

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Image
        source={isMobile ? require('../../assets/images/wallpaper-app-mobile.png') : require('../../assets/images/wallpapaer-app-desktop.png')}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(243, 244, 246, 0.75)', width: '100%', height: '100%' }]} />
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
      >
        {/* Header with User Info and Role Badge */}
        <View style={[styles.header, { backgroundColor: dashboardConfig.primaryColor }]}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Pengguna'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{formatRoleLabel(user?.roles)}</Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={[styles.avatarText, { color: dashboardConfig.primaryColor }]}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* Role-specific Banner */}
        <View style={[styles.roleBanner, { backgroundColor: `${dashboardConfig.primaryColor}15` }]}>
          <Ionicons 
            name={isSiswa ? 'school-outline' : isAdminOrSuper ? 'shield-checkmark-outline' : isKepalaSekolah ? 'analytics-outline' : 'people-outline'} 
            size={20} 
            color={dashboardConfig.primaryColor} 
          />
          <View style={styles.roleBannerText}>
            <Text style={[styles.roleBannerTitle, { color: dashboardConfig.primaryColor }]}>
              {isSiswa ? 'Portal Kehadiran Siswa' : isAdminOrSuper ? 'Portal Kontrol Administrasi' : isKepalaSekolah ? 'Portal Monitoring Kepala Sekolah' : 'Portal Manajemen Kelas'}
            </Text>
            <Text style={styles.roleBannerSubtitle}>SMKS Rajasa Surabaya • 5 Hari Kerja (Full Day)</Text>
          </View>
        </View>

        {/* 1. Admin & Super Admin & Kepala Sekolah Views */}
        {(isAdminOrSuper || isKepalaSekolah) && (
          <>
            {/* Quick Stats Grid */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistik Sekolah Hari Ini</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="school-outline" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>20</Text>
                    <Text style={styles.statLabel}>Siswa</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="people-outline" size={20} color="#10B981" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>8</Text>
                    <Text style={styles.statLabel}>Guru</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="business-outline" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>17</Text>
                    <Text style={styles.statLabel}>Rombel</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="stats-chart-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>98.2%</Text>
                    <Text style={styles.statLabel}>Kehadiran</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Actions / Features Grid */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Akses Pintar & Fitur Utama</Text>
              <View style={styles.featuresGrid}>
                {dashboardConfig.features.map((feature, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.featureCard}
                    onPress={() => router.push(feature.route as any)}
                  >
                    <View style={[styles.featureIconContainer, { backgroundColor: `${dashboardConfig.primaryColor}10` }]}>
                      <Ionicons name={feature.icon as any} size={22} color={dashboardConfig.primaryColor} />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureDescription} numberOfLines={2}>
                        {feature.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* 2. Siswa & Guru Schedule Feed */}
        {(isSiswa || isGuru) && (
          <View style={styles.scheduleSection}>
            
            {/* Daily School Entry Attendance for Students */}
            {isSiswa && (
              <View style={styles.dailyCheckInContainer}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Kehadiran Harian Sekolah</Text>
                
                {dailyCheckInRecord ? (
                  <View style={[styles.dailyCheckInCard, styles.dailyCheckInSuccess]}>
                    <View style={styles.dailyCheckInIconSuccess}>
                      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dailyCheckInTitleSuccess}>Absen Masuk Sekolah Berhasil</Text>
                      <Text style={styles.dailyCheckInTimeText}>
                        Jam Masuk: {dailyCheckInRecord.time?.substring(0, 5)} WIB • Status: {dailyCheckInRecord.status === 'hadir' ? 'Hadir Tepat Waktu' : `Terlambat (${dailyCheckInRecord.late_minutes}m)`}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.dailyCheckInCard, styles.dailyCheckInPending]}>
                    <View style={styles.dailyCheckInIconPending}>
                      <Ionicons name="location-outline" size={22} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.dailyCheckInTitlePending}>Belum Absen Masuk Sekolah</Text>
                      <Text style={styles.dailyCheckInDesc}>
                        Batas toleransi masuk 07:00 pagi. Wajib klik tombol untuk melapor kehadiran harian Anda.
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.dailyCheckInButton}
                      onPress={handleDailyCheckIn}
                      disabled={dailyCheckInLoading}
                    >
                      {dailyCheckInLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="finger-print-outline" size={14} color="#fff" />
                          <Text style={styles.dailyCheckInButtonText}>Absen Masuk</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isSiswa ? 'Jadwal Pelajaran Saya Hari Ini' : 'Jadwal Mengajar Saya Hari Ini'}
              </Text>
              <Text style={styles.currentDate}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>

            {todaySchedules.length > 0 ? (
              <View style={styles.scheduleList}>
                {todaySchedules.map((schedule: ScheduleRecord) => {
                  const isActive = !!schedule.active_session;
                  const isFinished = schedule.attendance_status === 'hadir' || schedule.attendance_status === 'telat';
                  
                  return (
                    <View key={schedule.id} style={[styles.scheduleCard, isActive && styles.activeScheduleCard]}>
                      {/* Card Header info */}
                      <View style={styles.cardHeader}>
                        <View style={styles.timeContainer}>
                          <Ionicons name="time-outline" size={14} color="#6B7280" />
                          <Text style={styles.timeText}>
                            {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                          </Text>
                        </View>
                        {isSiswa ? (
                          <StudentStatusBadge status={schedule.attendance_status} time={schedule.attendance_time} />
                        ) : (
                          <TeacherSessionBadge isActive={isActive} />
                        )}
                      </View>

                      {/* Main content: Subject and Class */}
                      <View style={styles.cardBody}>
                        <Text style={styles.subjectName}>{schedule.subject?.subject_name || 'Mata Pelajaran'}</Text>
                        <View style={classInfoStyle(isActive)}>
                          <Ionicons name="business-outline" size={14} color="#4B5563" />
                          <Text style={styles.classNameText}>{schedule.class?.class_name || 'Rombel'}</Text>
                          <View style={styles.bulletSeparator} />
                          <Ionicons name="person-outline" size={14} color="#4B5563" />
                          <Text style={styles.teacherNameText}>
                            {isSiswa ? (schedule.teacher?.full_name || 'Guru') : 'Mengajar'}
                          </Text>
                        </View>
                      </View>

                      {/* Action triggers */}
                      {!isSiswa && (
                        <View style={styles.cardActions}>
                          {isActive ? (
                            <View style={styles.activeActionsRow}>
                              <TouchableOpacity 
                                style={styles.manageButton}
                                onPress={() => router.push('/(tabs)/attendance' as never)}
                              >
                                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                                <Text style={styles.actionButtonText}>Kelola Presensi</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={() => handleClosePresensi(schedule.active_session!.id)}
                              >
                                <Text style={styles.closeButtonText}>Tutup Sesi</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <ShimmerButton
                              onPress={() => handleOpenPresensi(schedule.id)}
                              style={styles.shimmerBtnStyle}
                            >
                              <View style={styles.shimmerBtnContent}>
                                <Ionicons name="play-circle-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Buka Presensi Kelas</Text>
                              </View>
                            </ShimmerButton>
                          )}
                        </View>
                      )}

                      {isSiswa && isActive && !isFinished && (
                        <View style={styles.cardActions}>
                          <TouchableOpacity 
                            style={styles.studentAbsenButton}
                            onPress={() => router.push('/(tabs)/attendance' as never)}
                          >
                            <Ionicons name="scan-outline" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Absen Sekarang</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#1E3A8A" />
                <Text style={styles.emptyTitle}>Tidak Ada Jadwal Hari Ini</Text>
                <Text style={styles.emptyText}>Nikmati hari libur Anda! Tidak ada jadwal mengajar atau pelajaran terdaftar hari ini.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper to determine classInfo style dynamically
function classInfoStyle(isActive: boolean) {
  return [styles.classInfo, isActive && { borderBottomWidth: 0 }];
}

// Student Status Badge
function StudentStatusBadge({ status, time }: { status?: string; time?: string | null }) {
  let badgeColor = '#6B7280';
  let badgeBg = '#F3F4F6';
  let label = 'Belum Absen';
  let icon = 'ellipse-outline';

  if (status === 'hadir') {
    badgeColor = '#10B981';
    badgeBg = '#E6F4EA';
    label = `Hadir • ${time || ''}`;
    icon = 'checkmark-circle';
  } else if (status === 'telat') {
    badgeColor = '#F59E0B';
    badgeBg = '#FEF3C7';
    label = `Telat • ${time || ''}`;
    icon = 'warning';
  } else if (status === 'izin' || status === 'sakit') {
    badgeColor = '#3B82F6';
    badgeBg = '#E0F2FE';
    label = status === 'izin' ? 'Izin' : 'Sakit';
    icon = 'document-text';
  } else if (status === 'alpha') {
    badgeColor = '#EF4444';
    badgeBg = '#FEE2E2';
    label = 'Alpha';
    icon = 'close-circle';
  }

  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
      <Ionicons name={icon as any} size={12} color={badgeColor} />
      <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

// Teacher Session Status Badge
function TeacherSessionBadge({ isActive }: { isActive: boolean }) {
  const badgeColor = isActive ? '#3B82F6' : '#6B7280';
  const badgeBg = isActive ? '#EFF6FF' : '#F3F4F6';
  const label = isActive ? 'Sesi Aktif' : 'Belum Dibuka';
  const icon = isActive ? 'radio-button-on' : 'ellipse-outline';

  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
      <Ionicons name={icon as any} size={12} color={badgeColor} style={isActive ? styles.pulseIcon : null} />
      <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerText: { flex: 1, paddingRight: 16 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#2563EB' },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  roleBannerText: { flex: 1 },
  roleBannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 1 },
  roleBannerSubtitle: { fontSize: 11, color: '#4B5563', fontWeight: '500' },
  scheduleSection: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  currentDate: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  scheduleList: { gap: 14 },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  activeScheduleCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pulseIcon: {
    opacity: 0.8,
  },
  cardBody: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  bulletSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2,
  },
  teacherNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    maxWidth: '55%',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manageButton: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  studentAbsenButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  closeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  shimmerBtnStyle: {
    height: 42,
    paddingVertical: 0,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    borderRadius: 10,
  },
  shimmerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 1,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  dailyCheckInContainer: {
    marginBottom: 24,
  },
  dailyCheckInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  dailyCheckInSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dailyCheckInPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  dailyCheckInIconSuccess: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dailyCheckInIconPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dailyCheckInTitleSuccess: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  dailyCheckInTitlePending: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  dailyCheckInTimeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
  },
  dailyCheckInDesc: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
    fontWeight: '600',
  },
  dailyCheckInButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dailyCheckInButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});