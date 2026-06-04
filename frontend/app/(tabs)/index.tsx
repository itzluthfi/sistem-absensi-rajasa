import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../../hooks/useToast";
import {
  useAttendanceStore,
  type ScheduleRecord,
} from "../../store/attendanceStore";
import { attendanceApi, schedulesApi, leaveRequestsApi, studentsApi } from "../../services/api";
import { formatRoleLabel } from "../../src/hooks/use-role-access";
import { getDashboardConfig } from "../../src/constants/dashboard-config";
import { useWindowDimensions } from "react-native";
import FuturisticLoader from "../../components/ui/FuturisticLoader";
import ShimmerButton from "../../components/ui/ShimmerButton";
import NotificationBell from "../../components/ui/NotificationBell";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUBJECT_IMAGES = [
  require("../../assets/images/gambar-kelas/A1.jpg"),
  require("../../assets/images/gambar-kelas/B1.jpg"),
  require("../../assets/images/gambar-kelas/C1.jpg"),
  require("../../assets/images/gambar-kelas/H1.jpg"),
  require("../../assets/images/gambar-kelas/K1.jpg"),
  require("../../assets/images/gambar-kelas/O1.jpg"),
  require("../../assets/images/gambar-kelas/P1.jpg"),
  require("../../assets/images/gambar-kelas/T1.jpg"),
  require("../../assets/images/gambar-kelas/U1.jpg"),
  require("../../assets/images/gambar-kelas/Y1.jpg"),
];

function getSubjectImage(subjectName: string, allSchedules: ScheduleRecord[]) {
  const uniqueSubjects = Array.from(
    new Set(
      allSchedules
        .map((s) => s.subject?.subject_name)
        .filter(Boolean)
    )
  );

  const index = uniqueSubjects.indexOf(subjectName);
  if (index === -1) {
    return SUBJECT_IMAGES[0];
  }
  return SUBJECT_IMAGES[index % SUBJECT_IMAGES.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthStore();
  const {
    todaySchedules,
    fetchTodaySchedules,
    openAttendanceSession,
    closeAttendanceSession,
    isLoading,
    fetchAttendances,
    attendances,
    dailyCheckIn,
  } = useAttendanceStore();

  const isSiswa = user?.roles?.includes("siswa");
  const isGuru =
    user?.roles?.includes("guru") || user?.roles?.includes("wali_kelas");
  const isAdminOrSuper =
    user?.roles?.includes("super_admin") || user?.roles?.includes("admin");
  const isKepalaSekolah = user?.roles?.includes("kepala_sekolah");

  const [allSchedules, setAllSchedules] = useState<ScheduleRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [dailyCheckOutLoading, setDailyCheckOutLoading] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<"calendar" | "list">("calendar");
  const [openPresensiModalVisible, setOpenPresensiModalVisible] = useState(false);
  const [selectedScheduleForSession, setSelectedScheduleForSession] = useState<number | null>(null);

  const todayEng = useMemo(() => {
    const daysEng = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return daysEng[new Date().getDay()];
  }, []);

  const DAY_MAP_ENG_TO_IND: Record<string, string> = {
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
    Sunday: "Minggu"
  };

  const DAY_MAP_IND_TO_ENG: Record<string, string> = {
    Senin: "Monday",
    Selasa: "Tuesday",
    Rabu: "Wednesday",
    Kamis: "Thursday",
    Jumat: "Friday"
  };

  const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  const getTodayDayNameInd = () => {
    const dayNameEng = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return DAY_MAP_ENG_TO_IND[dayNameEng] || "Senin";
  };

  const fetchTodaySchedulesWithParams = useCallback(() => {
    const daysEng = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = new Date();
    const todayEng = daysEng[now.getDay()];
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayDate = `${year}-${month}-${day}`;

    return fetchTodaySchedules({
      day: todayEng,
      date: todayDate,
    });
  }, [fetchTodaySchedules]);



  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const scheduleListStyle = useMemo(() => {
    if (Platform.OS === 'web' && !isMobile) {
      return {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: 16,
      };
    }
    return styles.scheduleList;
  }, [isMobile]);

  const userRoles = user?.roles || [];
  const getRoleBadgeColor = () => {
    if (userRoles.includes('super_admin')) return '#DC2626';
    if (userRoles.includes('admin')) return '#F59E0B';
    if (userRoles.includes('guru') || userRoles.includes('wali_kelas')) return '#3B82F6';
    if (userRoles.includes('siswa')) return '#10B981';
    return '#6B7280';
  };

  const getRoleBadgeLabel = () => {
    if (userRoles.includes('super_admin')) return 'Super Admin';
    if (userRoles.includes('admin')) return 'Admin TU';
    if (userRoles.includes('wali_kelas')) return 'Wali Kelas';
    if (userRoles.includes('guru')) return 'Guru';
    if (userRoles.includes('kepala_sekolah')) return 'Kepsek';
    if (userRoles.includes('siswa')) return 'Siswa';
    return 'Pengguna';
  };

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const [dailyCheckInLoading, setDailyCheckInLoading] = useState(false);

  // Subject card attendance detail states
  const [selectedSubjectSchedule, setSelectedSubjectSchedule] = useState<ScheduleRecord | null>(null);
  const [subjectAttendanceHistory, setSubjectAttendanceHistory] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [modalTab, setModalTab] = useState<"sessions" | "students">("sessions");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [statsHistory, setStatsHistory] = useState({
    total: 0,
    hadir: 0,
    telat: 0,
    izin: 0,
    sakit: 0,
    alpha: 0,
    percentage: 100
  });

  const handleSubjectCardClick = async (schedule: ScheduleRecord) => {
    setSelectedSubjectSchedule(schedule);
    setLoadingHistory(true);
    setClassStudents([]);
    try {
      const response = await attendanceApi.getAll({ schedule_id: schedule.id, all: true });
      const records = response.data?.data ?? response.data ?? [];
      const historyList = Array.isArray(records) ? records : [];
      setSubjectAttendanceHistory(historyList);

      try {
        const studentsResp = await studentsApi.getAll({ class_id: schedule.class_id, all: true });
        const studentsData = studentsResp.data ?? studentsResp ?? [];
        setClassStudents(Array.isArray(studentsData) ? studentsData : []);
      } catch (studentsErr) {
        console.error("Failed to load class students:", studentsErr);
      }

      // Calculate stats
      let hadir = 0, telat = 0, izin = 0, sakit = 0, alpha = 0;
      historyList.forEach((att: any) => {
        const s = String(att.status).toLowerCase();
        if (s === "hadir") hadir++;
        else if (s === "telat") telat++;
        else if (s === "izin") izin++;
        else if (s === "sakit") sakit++;
        else if (s === "alpha") alpha++;
      });
      const total = historyList.length;
      const presence = hadir + telat;
      const percentage = total > 0 ? Math.round((presence / total) * 100) : 100;

      setStatsHistory({
        total,
        hadir,
        telat,
        izin,
        sakit,
        alpha,
        percentage
      });
    } catch (error) {
      console.error("Failed to load subject attendance history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };


  const todayDateStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const dailyCheckInRecord = useMemo(() => {
    return attendances.find((att) => {
      let attDate: string;
      if (typeof att.date === "string") {
        attDate = att.date.split(" ")[0].split("T")[0];
      } else {
        const d = new Date(att.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayVal = String(d.getDate()).padStart(2, "0");
        attDate = `${y}-${m}-${dayVal}`;
      }
      return (
        attDate === todayDateStr &&
        (att.schedule_id === null || att.schedule_id === undefined)
      );
    });
  }, [attendances, todayDateStr]);

  const loadData = async () => {
    if (isSiswa || isGuru) {
      fetchTodaySchedulesWithParams();
      
      try {
        let params: any = { all: true };
        if (isSiswa && user?.student_info?.class_id) {
          params.class_id = user.student_info.class_id;
        }
        const res = await schedulesApi.getAll(params);
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setAllSchedules(list);
      } catch (err) {
        console.error("Failed to load all schedules:", err);
      }
    }

    if (isSiswa) {
      fetchAttendances();

      try {
        const res = await leaveRequestsApi.getAll();
        const list = res.data?.data ?? res.data ?? res ?? [];
        setLeaveRequests(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load leave requests:", err);
      }
    }
  };

  const handleDailyCheckIn = async () => {
    setDailyCheckInLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Akses lokasi ditolak. Kami memerlukan izin lokasi untuk memverifikasi Anda berada di area sekolah.");
        setDailyCheckInLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const result = await dailyCheckIn({ location: coords });
      if (result.success) {
        toast.success(result.message || "Absen masuk sekolah berhasil dicatat.");
        loadData();
      } else {
        if (
          result.message &&
          (result.message.includes("sudah melakukan absen") ||
            result.message.includes("sudah absen"))
        ) {
          toast.info(result.message || "Anda sudah melakukan absen masuk sekolah hari ini.");
          // Force refresh
          fetchAttendances();
        } else {
          toast.error(result.message || "Gagal mencatat absen masuk.");
        }
      }
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Terjadi kesalahan sistem saat memproses absen masuk."
      );
    } finally {
      setDailyCheckInLoading(false);
    }
  };

  const handleDailyCheckOut = async () => {
    setDailyCheckOutLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Akses lokasi ditolak. Kami memerlukan izin lokasi untuk memverifikasi Anda berada di area sekolah.");
        setDailyCheckOutLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const result = await attendanceApi.dailyCheckOut({ location: coords });
      toast.success(result.message || "Absen pulang sekolah berhasil dicatat.");
      loadData();
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Gagal mencatat absen pulang."
      );
    } finally {
      setDailyCheckOutLoading(false);
    }
  };

  const activeApprovedLeave = useMemo(() => {
    if (!isSiswa) return null;
    const todayStr = new Date().toISOString().split("T")[0];
    return leaveRequests.find((lr: any) => {
      return lr.approval_status === "approved" &&
             todayStr >= lr.start_date &&
             todayStr <= lr.end_date;
    });
  }, [leaveRequests, isSiswa]);

  const { isCheckoutEligible, checkoutThresholdTime } = useMemo(() => {
    let threshold = "14:00:00";
    if (todaySchedules.length > 0) {
      const endTimes = todaySchedules.map((s) => s.end_time).filter(Boolean);
      if (endTimes.length > 0) {
        threshold = endTimes.reduce((max, current) => current > max ? current : max, "00:00:00");
      }
    }
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    return {
      isCheckoutEligible: currentTimeStr >= threshold,
      checkoutThresholdTime: threshold
    };
  }, [todaySchedules]);

  const { teachingSchedules, perwalianSchedules } = useMemo(() => {
    if (!isGuru) return { teachingSchedules: todaySchedules, perwalianSchedules: [] };
    
    const teacherId = user?.teacher_info?.id;
    const classIds = user?.teacher_info?.class_ids || [];
    
    const teaching = todaySchedules.filter((s) => s.teacher_id === teacherId);
    const perwalian = todaySchedules.filter((s) => s.teacher_id !== teacherId && classIds.includes(s.class_id));
    
    return { teachingSchedules: teaching, perwalianSchedules: perwalian };
  }, [todaySchedules, isGuru, user]);

  const mergedSchedules = useMemo(() => {
    return allSchedules.map(s => {
      const todayMatch = todaySchedules.find(ts => Number(ts.id) === Number(s.id));
      if (todayMatch) {
        return {
          ...s,
          active_session: todayMatch.active_session,
          attendance_status: todayMatch.attendance_status,
          attendance_time: todayMatch.attendance_time,
        };
      }
      return s;
    });
  }, [allSchedules, todaySchedules]);

  const listSchedulesData = useMemo(() => {
    let list: ScheduleRecord[] = [];
    if (isSiswa) {
      const classId = user?.student_info?.class_id;
      list = mergedSchedules.filter((s) => s.class_id === classId);
    } else if (isGuru) {
      const teacherId = user?.teacher_info?.id;
      const classIds = user?.teacher_info?.class_ids || [];
      list = mergedSchedules.filter((s) => s.teacher_id === teacherId || classIds.includes(s.class_id));
    }

    // Deduplicate by ID to ensure absolutely no duplicates
    const seen = new Set();
    const uniqueList = list.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Split today vs other days
    const todayList = uniqueList.filter(s => s.day_name === todayEng);
    const otherList = uniqueList.filter(s => s.day_name !== todayEng);

    // Sort function (by day index, then start time)
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const sortFn = (a: ScheduleRecord, b: ScheduleRecord) => {
      const dayDiff = daysOrder.indexOf(a.day_name) - daysOrder.indexOf(b.day_name);
      if (dayDiff !== 0) return dayDiff;
      return a.start_time.localeCompare(b.start_time);
    };

    return {
      todayList: [...todayList].sort(sortFn),
      otherList: [...otherList].sort(sortFn),
    };
  }, [mergedSchedules, isSiswa, isGuru, user, todayEng]);

  const getSchedulesForDay = (dayNameInd: string) => {
    const dayInEng = DAY_MAP_IND_TO_ENG[dayNameInd] || "Monday";
    const daySchedules = mergedSchedules.filter((s) => s.day_name === dayInEng);
    
    if (isGuru) {
      const teacherId = user?.teacher_info?.id;
      const classIds = user?.teacher_info?.class_ids || [];
      return daySchedules.filter((s) => {
        return s.teacher_id === teacherId || classIds.includes(s.class_id);
      });
    }

    if (isSiswa) {
      const classId = user?.student_info?.class_id;
      return daySchedules.filter((s) => s.class_id === classId);
    }
    
    return daySchedules;
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const dashboardConfig = getDashboardConfig(user?.roles);

  // Get role-specific greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Helper to render pulsing skeleton block
  const SkeletonItem = ({ style }: { style: any }) => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [pulseAnim]);

    return <Animated.View style={[style, { opacity: pulseAnim }]} />;
  };

  const renderTodaySchedulesSkeleton = () => {
    const cardWidthStyle = Platform.OS === 'web' && !isMobile
      ? { width: (width < 1024 ? '48%' : '31.5%') as any, minWidth: 280 }
      : { width: '100%' as any };

    return (
      <View style={scheduleListStyle}>
        {[1, 2, 3].map((i) => (
          <View 
            key={i} 
            style={[
              styles.scheduleCard, 
              { minHeight: 120, borderColor: '#E5E7EB', opacity: 0.85 },
              cardWidthStyle
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonItem style={{ width: 100, height: 18, borderRadius: 8, backgroundColor: '#E5E7EB' }} />
              <SkeletonItem style={{ width: 80, height: 18, borderRadius: 8, backgroundColor: '#E5E7EB' }} />
            </View>
            <View style={{ marginTop: 16 }}>
              <SkeletonItem style={{ width: '70%', height: 22, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <SkeletonItem style={{ width: 60, height: 14, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
                <SkeletonItem style={{ width: 80, height: 14, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
              </View>
            </View>
            {!isSiswa && (
              <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 }}>
                <SkeletonItem style={{ width: '100%', height: 38, borderRadius: 8, backgroundColor: '#E5E7EB' }} />
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyScheduleSkeleton = () => {
    return (
      <View style={styles.weeklyScheduleWrapper}>
        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
          <View 
            key={day} 
            style={[
              styles.dayColumn,
              { width: width >= 1024 ? '18.5%' : width >= 768 ? '48%' : '100%', opacity: 0.85 }
            ]}
          >
            <View style={[styles.dayHeader, { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}>
              <SkeletonItem style={{ width: 65, height: 16, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
            </View>
            <View style={{ gap: 10 }}>
              {[1, 2].map((i) => (
                <View key={i} style={[styles.calendarScheduleCard, { borderColor: '#E5E7EB' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <SkeletonItem style={{ width: 80, height: 14, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
                  </View>
                  <SkeletonItem style={{ width: '90%', height: 16, borderRadius: 4, backgroundColor: '#E5E7EB', marginTop: 8 }} />
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <SkeletonItem style={{ width: 40, height: 12, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
                    <SkeletonItem style={{ width: 50, height: 12, borderRadius: 4, backgroundColor: '#E5E7EB' }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleOpenPresensi = (scheduleId: number) => {
    setSelectedScheduleForSession(scheduleId);
    setOpenPresensiModalVisible(true);
  };

  const renderOpenPresensiModal = () => {
    if (!selectedScheduleForSession) return null;

    const handleSelectMode = async (requireQr: boolean) => {
      const scheduleId = selectedScheduleForSession;
      // Find subject name for notification
      const schedule = mergedSchedules.find((s: any) => s.id === scheduleId);
      const subjectName = schedule?.subject?.subject_name || "Kelas";
      setOpenPresensiModalVisible(false);
      setSelectedScheduleForSession(null);
      
      const result = await openAttendanceSession(scheduleId, requireQr);
      if (result.success) {
        toast.success(`Presensi ${subjectName} berhasil dibuka! Siswa sudah bisa absen.`);
        await fetchTodaySchedulesWithParams();
        // Selalu navigate ke halaman presensi (baik mode QR maupun klik mandiri)
        router.push({ pathname: "/(tabs)/attendance", params: { schedule_id: scheduleId } } as any);
      } else {
        toast.error(result.message || "Gagal membuka presensi.");
      }
    };

    return (
      <Modal
        visible={openPresensiModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setOpenPresensiModalVisible(false);
          setSelectedScheduleForSession(null);
        }}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalContent, { width: isMobile ? '90%' : 400, borderRadius: 16, padding: 24, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0, marginBottom: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="finger-print-outline" size={24} color="#2563EB" />
                <Text style={[styles.modalTitle, { fontSize: 18 }]}>Pilih Metode Presensi</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setOpenPresensiModalVisible(false);
                  setSelectedScheduleForSession(null);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, color: "#4B5563", lineHeight: 20 }}>
                Tentukan metode pencatatan kehadiran yang wajib dilakukan oleh siswa untuk kelas ini:
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {/* Option 1: Hanya Klik Tombol */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
                onPress={() => handleSelectMode(false)}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#1F2937" }}>
                    Hanya Klik Tombol (Default)
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    Siswa cukup menekan tombol "Kirim Kehadiran" tanpa scan.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Wajib Scan QR Code */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
                onPress={() => handleSelectMode(true)}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="qr-code-outline" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#1F2937" }}>
                    Wajib Scan QR Code
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    Siswa harus memindai kode QR yang Anda tunjukkan di kelas.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 20,
                height: 44,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: "#D1D5DB",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
              }}
              onPress={() => {
                setOpenPresensiModalVisible(false);
                setSelectedScheduleForSession(null);
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#4B5563" }}>
                Batal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleClosePresensi = async (sessionId: number, subjectName?: string) => {
    const result = await closeAttendanceSession(sessionId);
    if (result.success) {
      toast.success(`Sesi presensi ${subjectName || ""} berhasil ditutup.`);
      fetchTodaySchedulesWithParams();
    } else {
      toast.error(result.message || "Gagal menutup sesi.");
    }
  };

  if (!dashboardConfig) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0B0F19",
          },
        ]}
      >
        <FuturisticLoader text="Menyiapkan Portal" />
      </View>
    );
  }

  // Roles check already performed at the top

  const renderSubjectDetailModal = () => {
    if (!selectedSubjectSchedule) return null;
    const isSiswa = user?.roles?.includes("siswa");

    // Dynamic computations for the loaded dataset
    // 1. Grouped by Date (Sessions)
    const sessions = (() => {
      if (isSiswa) return [];
      const groups: Record<string, { date: string; attendances: any[]; stats: { total: number; hadir: number; telat: number; izin: number; sakit: number; alpha: number; percentage: number } }> = {};
      
      subjectAttendanceHistory.forEach((att) => {
        const dateStr = att.date;
        if (!groups[dateStr]) {
          groups[dateStr] = {
            date: dateStr,
            attendances: [],
            stats: { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpha: 0, percentage: 0 }
          };
        }
        groups[dateStr].attendances.push(att);
        const s = String(att.status).toLowerCase();
        groups[dateStr].stats.total++;
        if (s === "hadir") groups[dateStr].stats.hadir++;
        else if (s === "telat") groups[dateStr].stats.telat++;
        else if (s === "izin") groups[dateStr].stats.izin++;
        else if (s === "sakit") groups[dateStr].stats.sakit++;
        else if (s === "alpha") groups[dateStr].stats.alpha++;
      });

      return Object.values(groups)
        .map((g) => {
          const presentCount = g.stats.hadir + g.stats.telat;
          g.stats.percentage = g.stats.total > 0 ? Math.round((presentCount / g.stats.total) * 100) : 0;
          return g;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    })();

    // 2. Grouped by Student (Based on class roster)
    const studentSummaries = (() => {
      if (isSiswa) return [];
      
      const studentMap: Record<number, { studentId: number; name: string; nis: string; attendances: any[]; stats: { total: number; hadir: number; telat: number; izin: number; sakit: number; alpha: number; percentage: number } }> = {};
      
      classStudents.forEach((student) => {
        studentMap[student.id] = {
          studentId: student.id,
          name: student.full_name,
          nis: student.nis || "-",
          attendances: [],
          stats: { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpha: 0, percentage: 0 }
        };
      });

      subjectAttendanceHistory.forEach((att) => {
        if (!att.student) return;
        const sId = att.student.id;
        
        if (!studentMap[sId]) {
          studentMap[sId] = {
            studentId: sId,
            name: att.student.full_name,
            nis: att.student.nis || "-",
            attendances: [],
            stats: { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpha: 0, percentage: 0 }
          };
        }
        
        studentMap[sId].attendances.push(att);
        const s = String(att.status).toLowerCase();
        studentMap[sId].stats.total++;
        if (s === "hadir") studentMap[sId].stats.hadir++;
        else if (s === "telat") studentMap[sId].stats.telat++;
        else if (s === "izin") studentMap[sId].stats.izin++;
        else if (s === "sakit") studentMap[sId].stats.sakit++;
        else if (s === "alpha") studentMap[sId].stats.alpha++;
      });

      return Object.values(studentMap)
        .map((g) => {
          const presentCount = g.stats.hadir + g.stats.telat;
          g.stats.percentage = g.stats.total > 0 ? Math.round((presentCount / g.stats.total) * 100) : 0;
          return g;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    })();

    // Helpers
    const getStatusColor = (status: string) => {
      const s = String(status).toLowerCase();
      if (s === "hadir") return "#10B981";
      if (s === "telat") return "#3B82F6";
      if (s === "izin" || s === "sakit") return "#F59E0B";
      return "#EF4444";
    };

    const getStatusLabel = (status: string) => {
      const s = String(status).toLowerCase();
      if (s === "hadir") return "Hadir";
      if (s === "telat") return "Telat";
      if (s === "izin") return "Izin";
      if (s === "sakit") return "Sakit";
      return "Alpha";
    };

    const getSiswaTipConfig = () => {
      const p = statsHistory.percentage;
      if (p >= 90) {
        return {
          bg: "#ECFDF5",
          border: "#10B981",
          text: "#065F46",
          icon: "checkmark-circle-outline",
          message: "Luar biasa! Kehadiranmu sangat prima (≥ 90%). Pertahankan semangat belajarmu di kelas!"
        };
      } else if (p >= 80) {
        return {
          bg: "#FEF3C7",
          border: "#F59E0B",
          text: "#92400E",
          icon: "information-circle-outline",
          message: "Kehadiranmu cukup baik. Usahakan untuk tetap hadir di setiap pertemuan agar pemahamanmu maksimal."
        };
      } else {
        return {
          bg: "#FEE2E2",
          border: "#EF4444",
          text: "#991B1B",
          icon: "warning-outline",
          message: "Perhatian! Kehadiranmu di bawah batas aman 80%. Hubungi guru mapel atau wali kelas segera agar tidak terkendala ujian akhir!"
        };
      }
    };

    const tip = getSiswaTipConfig();

    return (
      <Modal visible={!!selectedSubjectSchedule} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="stats-chart-outline" size={20} color="#2563EB" />
                <Text style={styles.modalTitle}>Detail Analitik Mapel</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSubjectSchedule(null)}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Header info */}
              <View style={styles.subjectModalHeaderInfo}>
                <Text style={styles.subjectModalTitle}>
                  {selectedSubjectSchedule.subject?.subject_name || "Mata Pelajaran"}
                </Text>
                <Text style={styles.subjectModalSubtitle}>
                  Kelas: {selectedSubjectSchedule.class?.class_name || "-"} | Guru: {selectedSubjectSchedule.teacher?.full_name || "-"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Ionicons name="time-outline" size={13} color="#6B7280" />
                  <Text style={styles.subjectModalMeta}>
                    Jadwal: {selectedSubjectSchedule.start_time.substring(0, 5)} - {selectedSubjectSchedule.end_time.substring(0, 5)}
                  </Text>
                </View>
              </View>

              {/* Attendance percentage indicator */}
              <View style={styles.statsRingContainer}>
                <View style={[styles.statsRing, { borderColor: statsHistory.percentage >= 85 ? "#10B981" : "#F59E0B" }]}>
                  <Text style={styles.statsRingNumber}>{statsHistory.percentage}%</Text>
                  <Text style={styles.statsRingLabel}>
                    {isSiswa ? "Kehadiran Saya" : "Rata-rata Kelas"}
                  </Text>
                </View>
              </View>

              {/* Attendance stats count breakdown */}
              <View style={styles.statsSummaryGrid}>
                <View style={styles.statsSummaryCard}>
                  <Text style={[styles.statsSummaryValue, { color: "#10B981" }]}>{statsHistory.hadir}</Text>
                  <Text style={styles.statsSummaryLabel}>Hadir</Text>
                </View>
                <View style={styles.statsSummaryCard}>
                  <Text style={[styles.statsSummaryValue, { color: "#3B82F6" }]}>{statsHistory.telat}</Text>
                  <Text style={styles.statsSummaryLabel}>Telat</Text>
                </View>
                <View style={styles.statsSummaryCard}>
                  <Text style={[styles.statsSummaryValue, { color: "#F59E0B" }]}>{statsHistory.izin + statsHistory.sakit}</Text>
                  <Text style={styles.statsSummaryLabel}>Izin/Sakit</Text>
                </View>
                <View style={styles.statsSummaryCard}>
                  <Text style={[styles.statsSummaryValue, { color: "#EF4444" }]}>{statsHistory.alpha}</Text>
                  <Text style={styles.statsSummaryLabel}>Alpha</Text>
                </View>
              </View>

              {isSiswa && (
                <View
                  style={{
                    backgroundColor: tip.bg,
                    borderWidth: 1,
                    borderColor: tip.border,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name={tip.icon as any} size={20} color={tip.border} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: tip.text, fontWeight: "600", lineHeight: 16 }}>
                    {tip.message}
                  </Text>
                </View>
              )}

              {/* Segmented control for Teachers / Admins */}
              {!isSiswa && (
                <View style={styles.tabBar}>
                  <TouchableOpacity
                    style={[styles.tabButton, modalTab === "sessions" && styles.tabButtonActive]}
                    onPress={() => setModalTab("sessions")}
                  >
                    <Ionicons
                      name="calendar"
                      size={15}
                      color={modalTab === "sessions" ? "#2563EB" : "#6B7280"}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabButtonText, modalTab === "sessions" && styles.tabButtonTextActive]}>
                      Pertemuan Kelas
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabButton, modalTab === "students" && styles.tabButtonActive]}
                    onPress={() => setModalTab("students")}
                  >
                    <Ionicons
                      name="people"
                      size={15}
                      color={modalTab === "students" ? "#2563EB" : "#6B7280"}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabButtonText, modalTab === "students" && styles.tabButtonTextActive]}>
                      Kehadiran Siswa
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.historyListTitle}>
                {isSiswa
                  ? "Riwayat Pertemuan & Status Kehadiran"
                  : modalTab === "sessions"
                  ? "Daftar Pertemuan Sesi Kelas"
                  : "Persentase Kehadiran Tiap Siswa"}
              </Text>

              {loadingHistory ? (
                <ActivityIndicator color="#3B82F6" style={{ marginVertical: 32 }} />
              ) : isSiswa && subjectAttendanceHistory.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                  <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.emptyHistoryText}>Belum ada riwayat absensi kelas untuk mapel ini.</Text>
                </View>
              ) : !isSiswa && modalTab === "sessions" && sessions.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                  <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.emptyHistoryText}>Belum ada riwayat pertemuan sesi untuk kelas ini.</Text>
                </View>
              ) : !isSiswa && modalTab === "students" && studentSummaries.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                  <Ionicons name="people-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.emptyHistoryText}>Tidak ada data siswa terdaftar di kelas ini.</Text>
                </View>
              ) : isSiswa ? (
                /* Siswa Individual List */
                <View style={{ gap: 10, paddingBottom: 24 }}>
                  {subjectAttendanceHistory.map((att: any) => {
                    const d = new Date(att.date);
                    const formattedDate = d.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    });
                    const statusColor = getStatusColor(att.status);

                    return (
                      <View key={att.id} style={styles.historyItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyItemDate}>{formattedDate}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                            <Text style={styles.historyItemMeta}>
                              Jam Absen: {att.time ? String(att.time).substring(11, 16) : "-"}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.historyItemBadge, { backgroundColor: `${statusColor}14` }]}>
                          <Text style={[styles.historyItemBadgeText, { color: statusColor }]}>
                            {getStatusLabel(att.status).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : modalTab === "sessions" ? (
                /* Teacher Tab 1: Grouped Sessions Accordion */
                <View style={{ gap: 10, paddingBottom: 24 }}>
                  {sessions.map((sess) => {
                    const d = new Date(sess.date);
                    const formattedDate = d.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    });
                    const isExpanded = expandedDate === sess.date;
                    const presentCount = sess.stats.hadir + sess.stats.telat;
                    const ringColor = sess.stats.percentage >= 85 ? "#10B981" : sess.stats.percentage >= 60 ? "#F59E0B" : "#EF4444";

                    return (
                      <View key={sess.date} style={styles.sessionCard}>
                        <TouchableOpacity
                          style={styles.sessionCardHeader}
                          onPress={() => setExpandedDate(isExpanded ? null : sess.date)}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.sessionCardTitle}>{formattedDate}</Text>
                            <Text style={styles.sessionCardSubtitle}>
                              Kehadiran: {presentCount} dari {sess.stats.total} Siswa
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[styles.sessionProgressPill, { backgroundColor: `${ringColor}14` }]}>
                              <Text style={[styles.sessionProgressPillText, { color: ringColor }]}>
                                {sess.stats.percentage}%
                              </Text>
                            </View>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#6B7280"
                            />
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.sessionDetailsContainer}>
                            {sess.attendances.map((att) => {
                              const initials = att.student?.full_name?.charAt(0).toUpperCase() || "S";
                              const statusColor = getStatusColor(att.status);
                              return (
                                <View key={att.id} style={styles.sessionStudentRow}>
                                  <View style={styles.sessionStudentAvatar}>
                                    <Text style={styles.sessionStudentAvatarText}>{initials}</Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.sessionStudentName} numberOfLines={1}>
                                      {att.student?.full_name || "Siswa"}
                                    </Text>
                                    <Text style={styles.sessionStudentMeta}>
                                      NIS: {att.student?.nis || "-"} | Waktu: {att.time ? String(att.time).substring(11, 16) : "-"}
                                    </Text>
                                  </View>
                                  <View style={[styles.historyItemBadge, { backgroundColor: `${statusColor}14` }]}>
                                    <Text style={[styles.historyItemBadgeText, { color: statusColor, fontSize: 8 }]}>
                                      {getStatusLabel(att.status).toUpperCase()}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* Teacher Tab 2: Grouped Students Summary Rates */
                <View style={{ gap: 10, paddingBottom: 24 }}>
                  {studentSummaries.map((stud) => {
                    const initials = stud.name.charAt(0).toUpperCase();
                    const presentCount = stud.stats.hadir + stud.stats.telat;
                    const ringColor = stud.stats.percentage >= 85 ? "#10B981" : stud.stats.percentage >= 60 ? "#F59E0B" : "#EF4444";

                    // Determine latest or active session status
                    const latestAtt = stud.attendances && stud.attendances.length > 0 
                      ? [...stud.attendances].sort((a: any, b: any) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))[0] 
                      : null;

                    let statusBadgeText = "";
                    let statusBadgeColor = "#9CA3AF";
                    
                    if (latestAtt) {
                      let dateStr = "";
                      if (typeof latestAtt.date === "string") {
                        dateStr = latestAtt.date.split(" ")[0].split("T")[0];
                      } else {
                        const d = new Date(latestAtt.date);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, "0");
                        const dayVal = String(d.getDate()).padStart(2, "0");
                        dateStr = `${y}-${m}-${dayVal}`;
                      }
                      const isTodayRecord = dateStr === todayDateStr;
                      
                      statusBadgeText = isTodayRecord 
                        ? getStatusLabel(latestAtt.status) 
                        : `${getStatusLabel(latestAtt.status)} (${new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })})`;
                      statusBadgeColor = getStatusColor(latestAtt.status);
                    } else if (selectedSubjectSchedule?.active_session) {
                      statusBadgeText = "Belum Absen";
                      statusBadgeColor = "#EF4444";
                    } else {
                      statusBadgeText = "Belum Absen";
                      statusBadgeColor = "#9CA3AF";
                    }

                    return (
                      <View key={stud.studentId} style={styles.studentSummaryRow}>
                        <View style={styles.sessionStudentAvatar}>
                          <Text style={styles.sessionStudentAvatarText}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
                              <Text style={[styles.sessionStudentName, { flexShrink: 1 }]} numberOfLines={1}>
                                {stud.name}
                              </Text>
                              <View style={{ backgroundColor: `${statusBadgeColor}14`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: statusBadgeColor, fontSize: 9, fontWeight: "800" }}>
                                  {statusBadgeText.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: ringColor }}>
                              {stud.stats.percentage}%
                            </Text>
                          </View>

                          {/* Linear progress bar */}
                          <View style={styles.studentProgressBg}>
                            <View
                              style={[
                                styles.studentProgressFill,
                                { width: `${stud.stats.percentage}%`, backgroundColor: ringColor }
                              ]}
                            />
                          </View>

                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={styles.sessionStudentMeta}>
                              NIS: {stud.nis}
                            </Text>
                            <Text style={[styles.sessionStudentMeta, { fontWeight: "700" }]}>
                              {presentCount}/{stud.stats.total} Sesi | {stud.stats.alpha} Alpha
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setSelectedSubjectSchedule(null)}
              >
                <Text style={styles.secondaryButtonText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderScheduleCard = (schedule: ScheduleRecord, isSiswaMode: boolean, isPerwalianMode: boolean = false) => {
    const isToday = schedule.day_name === todayEng;
    const isActive = isToday && !!schedule.active_session;
    const isFinished =
      isToday &&
      (schedule.attendance_status === "hadir" ||
        schedule.attendance_status === "telat");

    const cardWidthStyle = Platform.OS === 'web' && !isMobile && scheduleViewMode === 'list'
      ? { width: (width < 1024 ? '48%' : '31.5%') as any, minWidth: 280 }
      : { width: '100%' as any };

    return (
      <View
        key={schedule.id}
        style={[
          styles.scheduleCard,
          isActive && styles.activeScheduleCard,
          { position: 'relative', overflow: 'hidden' },
          cardWidthStyle
        ]}
      >
        <TouchableOpacity
          onPress={() => handleSubjectCardClick(schedule)}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          {/* Card Header info */}
          <View style={[styles.cardHeader, (scheduleViewMode === 'calendar' && !isMobile) && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
            <View style={styles.timeContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color="#6B7280"
              />
              <Text style={styles.timeText}>
                {schedule.start_time.substring(0, 5)} -{" "}
                {schedule.end_time.substring(0, 5)}
              </Text>
            </View>
            {isToday ? (
              isSiswaMode ? (
                <StudentStatusBadge
                  status={schedule.attendance_status}
                  time={schedule.attendance_time}
                />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RoleScheduleBadge isPerwalianMode={isPerwalianMode} />
                  <TeacherSessionBadge isActive={isActive} />
                </View>
              )
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {!isSiswaMode && <RoleScheduleBadge isPerwalianMode={isPerwalianMode} />}
                <View style={styles.cardDayBadge}>
                  <Text style={styles.cardDayBadgeText}>
                    {DAY_MAP_ENG_TO_IND[schedule.day_name] || schedule.day_name}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Main content: Subject and Class */}
          <View style={styles.cardBody}>
            <Text style={styles.subjectName}>
              {schedule.subject?.subject_name || "Mata Pelajaran"}
            </Text>
            <View style={classInfoStyle(isActive)}>
              <Ionicons
                name="business-outline"
                size={14}
                color="#4B5563"
              />
              <Text style={styles.classNameText}>
                {schedule.class?.class_name || "Rombel"}
              </Text>
              <View style={styles.bulletSeparator} />
              <Ionicons
                name="person-outline"
                size={14}
                color="#4B5563"
              />
              <Text style={styles.teacherNameText}>
                {isSiswaMode || isPerwalianMode
                  ? schedule.teacher?.full_name || "Guru"
                  : "Mengajar"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action triggers */}
        {isToday && !isSiswaMode && !isPerwalianMode && (
          <View style={styles.cardActions}>
            {isActive ? (
              <View style={[styles.activeActionsRow, (scheduleViewMode === 'calendar' && !isMobile) && { flexDirection: 'column', gap: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.manageButton,
                    (scheduleViewMode === 'calendar' && !isMobile)
                      ? { width: '100%' }
                      : { flex: 2 }
                  ]}
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/attendance", params: { schedule_id: schedule.id } } as any)
                  }
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    Kelola Presensi
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    (scheduleViewMode === 'calendar' && !isMobile)
                      ? { width: '100%', marginTop: 8 }
                      : { flex: 1 }
                  ]}
                  onPress={() =>
                    handleClosePresensi(
                      schedule.active_session!.id,
                      schedule.subject?.subject_name,
                    )
                  }
                >
                  <Text style={styles.closeButtonText}>
                    Tutup Sesi
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ShimmerButton
                onPress={() => handleOpenPresensi(schedule.id)}
                style={styles.shimmerBtnStyle}
              >
                <View style={styles.shimmerBtnContent}>
                  <Ionicons
                    name="finger-print-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    Buka Presensi Kelas
                  </Text>
                </View>
              </ShimmerButton>
            )}
          </View>
        )}

        {isToday && isSiswaMode && isActive && !isFinished && !activeApprovedLeave && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.studentAbsenButton}
              onPress={() =>
                router.push({ pathname: "/(tabs)/attendance", params: { schedule_id: schedule.id } } as any)
              }
            >
              <Ionicons
                name="scan-outline"
                size={16}
                color="#fff"
              />
              <Text style={styles.actionButtonText}>
                Absen Sekarang
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        {/* Header with User Info and Role Badge */}
        <View style={[styles.header, styles.headerGradient]}>
          <View style={[styles.headerText, { paddingRight: isMobile ? 110 : 260 }]}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Pengguna"}
            </Text>
            
            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadgePill, { backgroundColor: getRoleBadgeColor() }]}>
                <Text style={styles.roleBadgeText}>
                  {getRoleBadgeLabel()}
                </Text>
              </View>
            </View>

            <View style={styles.quoteContainer}>
              <Text style={styles.quoteText}>
                " Terus belajar, berusaha, dan berdoa untuk masa depan yang lebih baik.
              </Text>
            </View>
          </View>
          
          {/* Notification Bell — top right of header */}
          <View style={{ position: 'absolute', top: 12, right: isMobile ? 8 : 16, zIndex: 10 }}>
            <NotificationBell iconColor="#fff" iconSize={22} />
          </View>
          
          <Image
            source={require("../../assets/images/school-building.png")}
            style={[
              styles.schoolIllustration,
              {
                width: isMobile ? 130 : 250,
                height: isMobile ? 85 : 120,
                bottom: isMobile ? -5 : -8,
              }
            ]}
            resizeMode="contain"
          />
        </View>

        {/* 1. Admin & Super Admin & Kepala Sekolah Views */}
        {(isAdminOrSuper || isKepalaSekolah) && (
          <>
            {/* Quick Stats Grid */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>
                Statistik Sekolah Hari Ini
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconContainer,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                  >
                    <Ionicons name="school-outline" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>20</Text>
                    <Text style={styles.statLabel}>Siswa</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconContainer,
                      { backgroundColor: "#F0FDF4" },
                    ]}
                  >
                    <Ionicons name="people-outline" size={20} color="#10B981" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>8</Text>
                    <Text style={styles.statLabel}>Guru</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconContainer,
                      { backgroundColor: "#FEF3C7" },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color="#F59E0B"
                    />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>17</Text>
                    <Text style={styles.statLabel}>Rombel</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconContainer,
                      { backgroundColor: "#FEE2E2" },
                    ]}
                  >
                    <Ionicons
                      name="stats-chart-outline"
                      size={20}
                      color="#EF4444"
                    />
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
              <Text style={styles.sectionTitle}>
                Akses Pintar & Fitur Utama
              </Text>
              <View style={styles.featuresGrid}>
                {dashboardConfig.features.map((feature, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.featureCard}
                    onPress={() => router.push(feature.route as any)}
                  >
                    <View
                      style={[
                        styles.featureIconContainer,
                        {
                          backgroundColor: `${dashboardConfig.primaryColor}10`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={feature.icon as any}
                        size={22}
                        color={dashboardConfig.primaryColor}
                      />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureDescription} numberOfLines={2}>
                        {feature.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
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
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                  Kehadiran Sekolah Hari Ini
                </Text>

                {activeApprovedLeave ? (
                  <View style={[styles.dailyCheckInCard, styles.dailyCheckInPending, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', padding: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                      <Ionicons name="document-text" size={24} color="#3B82F6" />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E40AF' }}>
                        Izin / Sakit Disetujui
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 18, fontWeight: '600' }}>
                      Status Anda hari ini adalah {activeApprovedLeave.permission_type === 'sakit' ? 'Sakit' : 'Izin'} ({activeApprovedLeave.reason}) yang berlaku dari tanggal {new Date(activeApprovedLeave.start_date).toLocaleDateString('id-ID')} hingga {new Date(activeApprovedLeave.end_date).toLocaleDateString('id-ID')}. Anda dibebaskan dari absensi harian dan mapel hari ini.
                    </Text>
                  </View>
                ) : dailyCheckInRecord ? (
                  <View
                    style={[
                      styles.dailyCheckInCard,
                      dailyCheckInRecord.status === "telat" ? styles.dailyCheckInWarning : styles.dailyCheckInSuccess,
                      { flexDirection: 'column', alignItems: 'stretch' }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={dailyCheckInRecord.status === "telat" ? styles.dailyCheckInIconWarning : styles.dailyCheckInIconSuccess}>
                        <Ionicons
                          name={dailyCheckInRecord.status === "telat" ? "warning" : "checkmark-circle"}
                          size={22}
                          color={dailyCheckInRecord.status === "telat" ? "#D97706" : "#10B981"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={dailyCheckInRecord.status === "telat" ? styles.dailyCheckInTitleWarning : styles.dailyCheckInTitleSuccess}>
                          {dailyCheckInRecord.status === "telat" ? "Absen Masuk Terlambat" : "Absen Masuk Berhasil"}
                        </Text>
                        <Text style={dailyCheckInRecord.status === "telat" ? styles.dailyCheckInTimeTextWarning : styles.dailyCheckInTimeText}>
                          Jam Masuk: {dailyCheckInRecord.time ? dailyCheckInRecord.time.substring(0, 5) : "-"} WIB • Status: {dailyCheckInRecord.status === "hadir" ? "Hadir" : `Terlambat (${dailyCheckInRecord.late_minutes}m)`}
                        </Text>
                        {dailyCheckInRecord.checkout_time && (
                          <Text style={dailyCheckInRecord.status === "telat" ? styles.dailyCheckInTimeTextWarning : styles.dailyCheckInTimeText}>
                            Jam Pulang: {dailyCheckInRecord.checkout_time.substring(0, 5)} WIB
                          </Text>
                        )}
                      </View>
                    </View>

                    {!dailyCheckInRecord.checkout_time && (
                      <View style={{ borderTopWidth: 1, borderTopColor: dailyCheckInRecord.status === "telat" ? "rgba(217, 119, 6, 0.15)" : "rgba(16, 185, 129, 0.15)", marginTop: 12, paddingTop: 12 }}>
                        <TouchableOpacity
                          style={[
                            styles.dailyCheckInButton,
                            { backgroundColor: isCheckoutEligible ? "#EF4444" : "#9CA3AF" }
                          ]}
                          onPress={handleDailyCheckOut}
                          disabled={dailyCheckOutLoading}
                        >
                          {dailyCheckOutLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons
                                name="log-out-outline"
                                size={14}
                                color="#fff"
                              />
                              <Text style={styles.dailyCheckInButtonText}>
                                {isCheckoutEligible ? "Absen Pulang Sekarang" : `Absen Pulang (Menunggu jam ${checkoutThresholdTime.substring(0, 5)})`}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.dailyCheckInCard,
                      styles.dailyCheckInPending,
                    ]}
                  >
                    <View style={styles.dailyCheckInIconPending}>
                      <Ionicons
                        name="location-outline"
                        size={22}
                        color="#3B82F6"
                      />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.dailyCheckInTitlePending}>
                        Belum Absen Masuk Sekolah Hari Ini
                      </Text>
                      <Text style={styles.dailyCheckInDesc}>
                        Batas toleransi masuk 07:00 pagi. Wajib klik tombol
                        untuk melapor kehadiran harian Anda.
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
                          <Ionicons
                            name="finger-print-outline"
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.dailyCheckInButtonText}>
                            Absen Masuk
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Weekly Calendar & List Section */}
            <View style={[styles.calendarContainer, { marginTop: 24 }]}>
              {/* Header with Title and Toggle */}
              <View style={styles.calendarHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Jadwal Mingguan
                </Text>
                <View style={styles.viewModeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      scheduleViewMode === "calendar" && styles.toggleButtonActive
                    ]}
                    onPress={() => setScheduleViewMode("calendar")}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      scheduleViewMode === "calendar" && styles.toggleButtonTextActive
                    ]}>
                      Kalender
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      scheduleViewMode === "list" && styles.toggleButtonActive
                    ]}
                    onPress={() => setScheduleViewMode("list")}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      scheduleViewMode === "list" && styles.toggleButtonTextActive
                    ]}>
                      Daftar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isLoading && allSchedules.length === 0 ? (
                renderWeeklyScheduleSkeleton()
              ) : scheduleViewMode === "calendar" ? (
                // CALENDAR VIEW MODE
                <View style={styles.weeklyScheduleWrapper}>
                  {DAYS_OF_WEEK.map((day) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isDayToday = getTodayDayNameInd() === day;
                    
                    return (
                      <View 
                        key={day} 
                        style={[
                          styles.dayColumn,
                          isDayToday && styles.dayColumnToday,
                          { width: width >= 1024 ? '18.5%' : width >= 768 ? '48%' : '100%' }
                        ]}
                      >
                        {/* Day Header Badge */}
                        <View style={[
                          styles.dayHeader,
                          isDayToday && styles.dayHeaderToday
                        ]}>
                          <Text style={[
                            styles.dayHeaderText,
                            isDayToday && styles.dayHeaderTextToday
                          ]}>
                            {day}
                          </Text>
                          {isDayToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>Hari Ini</Text>
                            </View>
                          )}
                        </View>

                        {/* Day Schedules List */}
                        {daySchedules.length > 0 ? (
                          <View style={{ gap: 10 }}>
                            {(() => {
                              if (isDayToday && isGuru) {
                                const teacherId = user?.teacher_info?.id;
                                const classIds = user?.teacher_info?.class_ids || [];
                                const teachingToday = daySchedules.filter(s => s.teacher_id === teacherId);
                                const perwalianToday = daySchedules.filter(s => s.teacher_id !== teacherId && classIds.includes(s.class_id));

                                return (
                                  <View style={{ gap: 14 }}>
                                    {teachingToday.length > 0 && (
                                      <View style={{ gap: 8 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Mengajar</Text>
                                        {teachingToday.map((schedule) => renderScheduleCard(schedule, false, false))}
                                      </View>
                                    )}
                                    {perwalianToday.length > 0 && (
                                      <View style={{ gap: 8 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, marginTop: teachingToday.length > 0 ? 6 : 0 }}>Perwalian</Text>
                                        {perwalianToday.map((schedule) => renderScheduleCard(schedule, false, true))}
                                      </View>
                                    )}
                                  </View>
                                );
                              }

                              return daySchedules.map((schedule) => {
                                // If it is today, render the full-featured interactive schedule card
                                if (isDayToday) {
                                  return renderScheduleCard(schedule, !!isSiswa, false);
                                }

                                // Otherwise render the compact view
                                const isActive = false;
                                const isPerwalian = isGuru && schedule.teacher_id !== user?.teacher_info?.id && (user?.teacher_info?.class_ids || []).includes(schedule.class_id);
                                return (
                                  <TouchableOpacity
                                    key={schedule.id}
                                    style={[
                                      styles.calendarScheduleCard,
                                      isActive && styles.activeScheduleCard,
                                      isDayToday && styles.calendarScheduleCardToday,
                                    ]}
                                    onPress={() => handleSubjectCardClick(schedule)}
                                    activeOpacity={0.85}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <View style={styles.timeContainer}>
                                        <Ionicons
                                          name="time-outline"
                                          size={12}
                                          color="#6B7280"
                                        />
                                        <Text style={styles.timeText}>
                                          {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                        </Text>
                                      </View>
                                      {!isSiswa && (
                                        <View style={{
                                          backgroundColor: isPerwalian ? "#F5F3FF" : "#ECFDF5",
                                          paddingHorizontal: 6,
                                          paddingVertical: 1,
                                          borderRadius: 4,
                                        }}>
                                          <Text style={{
                                            color: isPerwalian ? "#8B5CF6" : "#10B981",
                                            fontSize: 9,
                                            fontWeight: "800"
                                          }}>
                                            {isPerwalian ? "Perwalian" : "Ajar"}
                                          </Text>
                                        </View>
                                      )}
                                    </View>

                                    <Text style={[styles.subjectName, { fontSize: 14, marginTop: 6, fontWeight: '700' }]}>
                                      {schedule.subject?.subject_name || "Mata Pelajaran"}
                                    </Text>

                                    <View style={[styles.classInfo, { borderBottomWidth: 0, marginTop: 4 }]}>
                                      <Ionicons
                                        name="business-outline"
                                        size={12}
                                        color="#6B7280"
                                      />
                                      <Text style={[styles.classNameText, { fontSize: 11 }]}>
                                        {schedule.class?.class_name || "Rombel"}
                                      </Text>
                                      <View style={styles.bulletSeparator} />
                                      <Ionicons
                                        name="person-outline"
                                        size={12}
                                        color="#6B7280"
                                      />
                                      <Text style={[styles.teacherNameText, { fontSize: 11 }]} numberOfLines={1}>
                                        {isSiswa || isPerwalian
                                          ? schedule.teacher?.full_name || "Guru"
                                          : "Mengajar"}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                               );
                              });
                            })()}
                          </View>
                        ) : (
                          <View style={styles.emptyDayContainer}>
                            <Text style={styles.emptyDayText}>Tidak ada jadwal</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                // LIST VIEW MODE (Deduplicated, today highlighted on top)
                <View style={{ gap: 20 }}>
                  {/* Sub-seksi Hari Ini */}
                  <View style={styles.listSectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
                      <Text style={styles.listSectionTitle}>Hari Ini</Text>
                    </View>
                    <Text style={styles.currentDate}>
                      {new Date().toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </Text>
                  </View>

                  {(() => {
                    if (isGuru) {
                      const teacherId = user?.teacher_info?.id;
                      const classIds = user?.teacher_info?.class_ids || [];
                      const homeroomLabel = user?.teacher_info?.class_names?.join(', ') || 'Kelas Binaan';
                      
                      const teachingToday = listSchedulesData.todayList.filter(s => s.teacher_id === teacherId);
                      const perwalianToday = listSchedulesData.todayList.filter(s => s.teacher_id !== teacherId && classIds.includes(s.class_id));

                      if (listSchedulesData.todayList.length === 0) {
                        return (
                          <View style={[styles.emptyState, { paddingVertical: 24, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }]}>
                            <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                            <Text style={[styles.emptyTitle, { fontSize: 14, color: '#6B7280' }]}>Tidak Ada Jadwal Hari Ini</Text>
                            <Text style={[styles.emptyText, { fontSize: 12, color: '#9CA3AF', marginTop: -4 }]}>
                              Nikmati hari libur Anda! Tidak ada jadwal pelajaran terdaftar hari ini.
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <View style={{ gap: 24 }}>
                          {/* Section Jadwal Mengajar */}
                          {teachingToday.length > 0 && (
                            <View style={{ gap: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="school-outline" size={16} color="#10B981" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5 }}>Jadwal Mengajar Anda</Text>
                              </View>
                              <View style={scheduleListStyle}>
                                {teachingToday.map((schedule) => (
                                  renderScheduleCard(schedule, false, false)
                                ))}
                              </View>
                            </View>
                          )}

                          {/* Section Jadwal Perwalian */}
                          {perwalianToday.length > 0 && (
                            <View style={{ gap: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="people-outline" size={16} color="#8B5CF6" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5 }}>Jadwal Kelas Perwalian ({homeroomLabel})</Text>
                              </View>
                              <View style={scheduleListStyle}>
                                {perwalianToday.map((schedule) => (
                                  renderScheduleCard(schedule, false, true)
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    } else {
                      // Siswa flow
                      return listSchedulesData.todayList.length > 0 ? (
                        <View style={scheduleListStyle}>
                          {listSchedulesData.todayList.map((schedule) => (
                            renderScheduleCard(schedule, true, false)
                          ))}
                        </View>
                      ) : (
                        <View style={[styles.emptyState, { paddingVertical: 24, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }]}>
                          <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                          <Text style={[styles.emptyTitle, { fontSize: 14, color: '#6B7280' }]}>Tidak Ada Jadwal Hari Ini</Text>
                          <Text style={[styles.emptyText, { fontSize: 12, color: '#9CA3AF', marginTop: -4 }]}>
                            Nikmati hari libur Anda! Tidak ada jadwal pelajaran terdaftar hari ini.
                          </Text>
                        </View>
                      );
                    }
                  })()}

                  {/* Sub-seksi Hari Lainnya */}
                  <View style={[styles.listSectionHeader, { marginTop: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' }} />
                      <Text style={styles.listSectionTitle}>Hari Lainnya</Text>
                    </View>
                  </View>

                  {listSchedulesData.otherList.length > 0 ? (
                    <View style={scheduleListStyle}>
                      {listSchedulesData.otherList.map((schedule) => {
                        const isPerwalian = isGuru && schedule.teacher_id !== user?.teacher_info?.id && (user?.teacher_info?.class_ids || []).includes(schedule.class_id);
                        return renderScheduleCard(schedule, !!isSiswa, isPerwalian);
                      })}
                    </View>
                  ) : (
                    <View style={[styles.emptyState, { paddingVertical: 24, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }]}>
                      <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                      <Text style={[styles.emptyTitle, { fontSize: 14, color: '#6B7280' }]}>Tidak Ada Jadwal Lain</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      {renderSubjectDetailModal()}
      {renderOpenPresensiModal()}
    </View>
  );
}

// Helper to determine classInfo style dynamically
function classInfoStyle(isActive: boolean) {
  return [styles.classInfo, isActive && { borderBottomWidth: 0 }];
}

// Student Status Badge
function StudentStatusBadge({
  status,
  time,
}: {
  status?: string;
  time?: string | null;
}) {
  let badgeColor = "#6B7280";
  let badgeBg = "#F3F4F6";
  let label = "Belum Absen";
  let icon = "ellipse-outline";

  if (status === "hadir") {
    badgeColor = "#10B981";
    badgeBg = "#E6F4EA";
    label = `Hadir • ${time || ""}`;
    icon = "checkmark-circle";
  } else if (status === "telat") {
    badgeColor = "#F59E0B";
    badgeBg = "#FEF3C7";
    label = `Telat • ${time || ""}`;
    icon = "warning";
  } else if (status === "izin" || status === "sakit") {
    badgeColor = "#3B82F6";
    badgeBg = "#E0F2FE";
    label = status === "izin" ? "Izin" : "Sakit";
    icon = "document-text";
  } else if (status === "alpha") {
    badgeColor = "#EF4444";
    badgeBg = "#FEE2E2";
    label = "Alpha";
    icon = "close-circle";
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
  const badgeColor = isActive ? "#3B82F6" : "#6B7280";
  const badgeBg = isActive ? "#EFF6FF" : "#F3F4F6";
  const label = isActive ? "Sesi Aktif" : "Belum Dibuka";
  const icon = isActive ? "radio-button-on" : "ellipse-outline";

  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
      <Ionicons
        name={icon as any}
        size={12}
        color={badgeColor}
        style={isActive ? styles.pulseIcon : null}
      />
      <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

// Teacher Role Schedule Badge
function RoleScheduleBadge({ isPerwalianMode }: { isPerwalianMode: boolean }) {
  const badgeColor = isPerwalianMode ? "#8B5CF6" : "#10B981"; // Purple for perwalian, green for teaching
  const badgeBg = isPerwalianMode ? "#F5F3FF" : "#ECFDF5";
  const label = isPerwalianMode ? "Perwalian" : "Mengajar";
  const icon = isPerwalianMode ? "people-outline" : "school-outline";

  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
      <Ionicons name={icon as any} size={12} color={badgeColor} />
      <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    position: "relative",
    overflow: "hidden",
  },
  headerGradient: {
    backgroundColor: "#3B82F6",
    ...(Platform.OS === 'web' && {
      backgroundImage: 'linear-gradient(90deg, #2563EB, #60A5FA)',
    } as any),
  },
  headerText: { 
    flex: 1, 
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  userName: { 
    fontSize: 24, 
    fontWeight: "800", 
    color: "#FFFFFF", 
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  roleBadgeContainer: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 14,
  },
  roleBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  quoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  quoteText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  schoolIllustration: {
    position: "absolute",
    right: 0,
    bottom: -8,
    width: 250,
    height: 120,
  },
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  roleBannerText: { flex: 1 },
  roleBannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 1 },
  roleBannerSubtitle: { fontSize: 11, color: "#4B5563", fontWeight: "500" },
  scheduleSection: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  currentDate: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  scheduleList: { gap: 14 },
  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    overflow: "hidden",
  },
  activeScheduleCard: {
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  pulseIcon: {
    opacity: 0.8,
  },
  cardBody: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  classInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  classNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  bulletSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 2,
  },
  teacherNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    maxWidth: "55%",
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 4,
  },
  activeActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  manageButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    height: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  studentAbsenButton: {
    backgroundColor: "#10B981",
    borderRadius: 10,
    height: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  closeButton: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  shimmerBtnStyle: {
    height: 42,
    paddingVertical: 0,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    borderRadius: 10,
  },
  shimmerBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 1,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  dailyCheckInContainer: {
    marginBottom: 24,
  },
  dailyCheckInCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  dailyCheckInSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  dailyCheckInPending: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  dailyCheckInWarning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  dailyCheckInTitleWarning: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  dailyCheckInTimeTextWarning: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "700",
  },
  dailyCheckInIconWarning: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  calendarTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  calendarTabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarTabButtonTodayOutline: {
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  calendarTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarTabTextActive: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    position: 'absolute',
    bottom: 3,
  },
  calendarScheduleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarScheduleCardToday: {
    borderColor: '#D1D5DB',
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  toggleButtonActive: {
    backgroundColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  toggleButtonTextActive: {
    color: "#ffffff",
  },
  listSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  cardDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  cardDayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  dailyCheckInIconSuccess: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dailyCheckInIconPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dailyCheckInTitleSuccess: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 2,
  },
  dailyCheckInTitlePending: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 2,
  },
  dailyCheckInTimeText: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "700",
  },
  dailyCheckInDesc: {
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 15,
    fontWeight: "600",
  },
  dailyCheckInButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dailyCheckInButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    ...(Platform.OS === "web"
      ? {
          borderRadius: 16,
          width: "90%",
          maxWidth: 900,
          maxHeight: "85%",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 15,
          elevation: 10,
        }
      : {}),
  },
  modalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#374151",
    fontWeight: "700",
  },
  subjectModalHeaderInfo: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  subjectModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  subjectModalSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 4,
  },
  subjectModalMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statsRingContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  statsRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  statsRingNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  statsRingLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  statsSummaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statsSummaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  statsSummaryValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statsSummaryLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 2,
  },
  historyListTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  emptyHistoryState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  historyItemDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  historyItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyItemBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#1F2937",
  },
  sessionCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#fff",
  },
  sessionCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937",
  },
  sessionCardSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  sessionProgressPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionProgressPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  sessionDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  sessionStudentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  sessionStudentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionStudentAvatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },
  sessionStudentName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
  },
  sessionStudentMeta: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 1,
  },
  studentSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  studentProgressBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 2,
  },
  studentProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  weeklyScheduleWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  dayColumn: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
    marginBottom: 8,
  },
  dayColumnToday: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayHeaderToday: {
    borderBottomColor: '#BFDBFE',
  },
  dayHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  dayHeaderTextToday: {
    color: '#1D4ED8',
  },
  todayBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyDayText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
