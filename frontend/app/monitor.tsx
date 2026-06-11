import { useEffect, useState, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { attendanceApi, classesApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../hooks/useToast";
import Skeleton from "../components/ui/Skeleton";
import AnimatedCounter from "../components/ui/AnimatedCounter";

type MonitorRecord = {
  id: number;
  date: string;
  time: string;
  status: "hadir" | "telat" | "izin" | "sakit" | "alpha" | "ditolak";
  checkout_time?: string;
  late_minutes?: number;
  class_id?: number | null;
  device_info?: string;
  notes?: string;
  student?: {
    id: number;
    full_name: string;
    nis?: string;
  };
  class?: {
    id: number;
    class_name: string;
  };
};

export default function LiveMonitorScreen() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  const getInitialClassId = () => {
    const isWali = user?.roles?.includes("wali_kelas");
    const classIds = user?.teacher_info?.class_ids || [];
    if (isWali && classIds.length > 0) {
      return String(classIds[0]);
    }
    return "all";
  };

  const [records, setRecords] = useState<MonitorRecord[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(getInitialClassId());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);

  // Get today's local YYYY-MM-DD date string safely
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      const payload = response.data?.data ?? response.data ?? [];
      setClasses(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error("Failed to load classes for filter:", e);
    }
  };

  const playWebSuccessSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.05, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0.07, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log("AudioContext not supported or gesture needed:", e);
    }
  };

  const fetchLiveFeed = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      // Query today's attendance logs
      const response = await attendanceApi.getAll({
        start_date: todayStr,
        end_date: todayStr,
        per_page: 200, // Fetch up to 200 check-ins for today
      });
      const payload = response.data?.data ?? response.data ?? [];
      const newRecords = Array.isArray(payload) ? payload : [];
      
      setRecords((prevRecords) => {
        if (prevRecords.length > 0 && newRecords.length > 0) {
          const latestPrev = prevRecords[0];
          const latestNew = newRecords[0];
          // If the most recent scan record ID is different, play the chime!
          if (latestNew.id !== latestPrev.id) {
            playWebSuccessSound();
          }
        }
        return newRecords;
      });
    } catch (error) {
      console.error("Failed to fetch live gate feeds:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleRejectAttendance = (id: number) => {
    Alert.alert(
      "Tolak Absensi",
      "Apakah Anda yakin ingin menolak absensi siswa ini? Status absensi akan diubah menjadi 'Ditolak'.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak",
          style: "destructive",
          onPress: async () => {
            try {
              await attendanceApi.delete(id);
              fetchLiveFeed(false);
              toast.success("Absensi berhasil ditolak.");
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Gagal menolak absensi");
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadClasses();
    fetchLiveFeed(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Poll live feed every 5 seconds if live mode is enabled
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLiveFeed(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Aggregate stats from today's logs
  const stats = useMemo(() => {
    let hadir = 0;
    let telat = 0;
    let izinSakit = 0;
    let alpha = 0;

    records.forEach((r) => {
      const s = r.status.toLowerCase();
      if (s === "hadir") hadir++;
      else if (s === "telat") telat++;
      else if (s === "izin" || s === "sakit") izinSakit++;
      else if (s === "alpha") alpha++;
    });

    return {
      total: records.length,
      hadir,
      telat,
      izinSakit,
      alpha,
    };
  }, [records]);

  // Filter logs based on search & class filters
  const filteredRecords = useMemo(() => {
    let list = records;
    if (selectedClassId !== "all") {
      list = list.filter((r) => r.class_id === Number(selectedClassId) || r.class?.id === Number(selectedClassId));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.student?.full_name.toLowerCase().includes(q) ||
          r.student?.nis?.toLowerCase().includes(q) ||
          r.class?.class_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, searchQuery, selectedClassId]);

  // Helper for status colors
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "hadir":
        return { label: "Hadir Tepat", color: "#10B981", bg: "#D1FAE5" };
      case "telat":
        return { label: "Terlambat", color: "#F59E0B", bg: "#FEF3C7" };
      case "izin":
        return { label: "Izin", color: "#3B82F6", bg: "#E0F2FE" };
      case "sakit":
        return { label: "Sakit", color: "#6366F1", bg: "#EEF2FF" };
      case "ditolak":
        return { label: "Ditolak", color: "#EF4444", bg: "#FEE2E2" };
      default:
        return { label: "Alpha", color: "#EF4444", bg: "#FEE2E2" };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>

      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Live Monitor Gerbang</Text>
            <Text style={styles.headerSubtitle}>Pantau Kedatangan Siswa & Staf Real-time</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.liveIndicator, isLive ? styles.liveActive : styles.livePaused]}
          onPress={() => setIsLive(!isLive)}
        >
          <View style={[styles.liveDot, isLive && styles.liveDotPulse]} />
          <Text style={[styles.liveText, { color: isLive ? "#10B981" : "#6B7280" }]}>
            {isLive ? "LIVE AUTO-POLLING" : "MUTAKHIRKAN MANUAL"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchLiveFeed(true)} />}
      >
        {/* Real-time stats count block */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {isLoading ? (
            <>
              <View style={[styles.statsCard, { borderLeftColor: "#10B981" }]}>
                <Skeleton width={30} height={20} borderRadius={4} />
                <Text style={styles.statsLabel}>Hadir</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#F59E0B" }]}>
                <Skeleton width={30} height={20} borderRadius={4} />
                <Text style={styles.statsLabel}>Terlambat</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#3B82F6" }]}>
                <Skeleton width={30} height={20} borderRadius={4} />
                <Text style={styles.statsLabel}>Izin/Sakit</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#EF4444" }]}>
                <Skeleton width={30} height={20} borderRadius={4} />
                <Text style={styles.statsLabel}>Alpha</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.statsCard, { borderLeftColor: "#10B981" }]}>
                <AnimatedCounter value={stats.hadir} style={styles.statsValue} />
                <Text style={styles.statsLabel}>Hadir</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#F59E0B" }]}>
                <AnimatedCounter value={stats.telat} style={styles.statsValue} />
                <Text style={styles.statsLabel}>Terlambat</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#3B82F6" }]}>
                <AnimatedCounter value={stats.izinSakit} style={styles.statsValue} />
                <Text style={styles.statsLabel}>Izin/Sakit</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: "#EF4444" }]}>
                <AnimatedCounter value={stats.alpha} style={styles.statsValue} />
                <Text style={styles.statsLabel}>Alpha</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Latest Scan Showroom (Physical Scanner Gate HUD) */}
        <View style={styles.showroomCard}>
          <View style={styles.showroomHeader}>
            <View style={styles.showroomIndicator}>
              <View style={[styles.showroomPulse, { backgroundColor: records.length > 0 ? "#10B981" : "#3B82F6" }]} />
              <Text style={styles.showroomIndicatorText}>
                {isLoading ? "MEMUAT DATA..." : records.length > 0 ? "PANDUAN PEMINDAIAN TERAKHIR" : "STANDBY PEMINDAIAN GERBANG"}
              </Text>
            </View>
            {!isLoading && records.length > 0 && (
              <View style={styles.showroomTimeBadge}>
                <Text style={styles.showroomTimeText}>Baru Saja</Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.showroomBody}>
              <View style={styles.showroomAvatarContainer}>
                <Skeleton width={60} height={60} borderRadius={30} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width={150} height={18} borderRadius={4} />
                <Skeleton width={120} height={12} borderRadius={4} />
                <Skeleton width={200} height={14} borderRadius={4} />
              </View>
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <Skeleton width={50} height={24} borderRadius={4} />
                <Skeleton width={60} height={14} borderRadius={4} />
              </View>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.showroomEmpty}>
              <Ionicons name="scan-outline" size={44} color="#9CA3AF" />
              <Text style={styles.showroomEmptyTitle}>Siap Melakukan Scan QR</Text>
              <Text style={styles.showroomEmptyText}>
                Arahkan kartu QR siswa pada pemindai gerbang untuk mencatat kehadiran real-time.
              </Text>
            </View>
          ) : (
            (() => {
              const latest = records[0];
              const initials = latest.student?.full_name?.charAt(0).toUpperCase() || "S";
              const conf = getStatusConfig(latest.status);
              const isLate = latest.status.toLowerCase() === "telat";
              
              return (
                <View style={styles.showroomBody}>
                  <View style={styles.showroomAvatarContainer}>
                    <View style={[styles.showroomAvatar, { borderColor: conf.color }]}>
                      <Text style={[styles.showroomAvatarText, { color: conf.color }]}>{initials}</Text>
                    </View>
                    <View style={[styles.showroomStatusDot, { backgroundColor: conf.color }]} />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.showroomName} numberOfLines={1}>
                      {latest.student?.full_name || "Siswa Rajasa"}
                    </Text>
                    <Text style={styles.showroomMeta}>
                      NIS: {latest.student?.nis || "-"} | Kelas: {latest.class?.class_name || "-"}
                    </Text>
                    
                    <View style={styles.showroomWelcomeBox}>
                      <Ionicons 
                        name={isLate ? "warning-outline" : "happy-outline"} 
                        size={14} 
                        color={isLate ? "#F59E0B" : "#10B981"} 
                      />
                      <Text style={[styles.showroomWelcomeText, { color: isLate ? "#B45309" : "#047857" }]}>
                        {isLate 
                          ? `Terlambat ${latest.late_minutes || 0} menit. Silakan melapor ke guru piket.`
                          : "Pindai sukses! Selamat belajar di SMKS Rajasa!"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.showroomClockContainer}>
                    <Text style={styles.showroomClockTime}>
                      {latest.time.substring(0, 5)}
                    </Text>
                    <View style={[styles.showroomClockBadge, { backgroundColor: conf.bg }]}>
                      <Text style={[styles.showroomClockBadgeText, { color: conf.color }]}>
                        {conf.label.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()
          )}
        </View>

        {/* Toolbar filter */}
        <View style={styles.filterCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari siswa, NIS, atau kelas..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>

          {classes.length > 0 && (
            <View style={styles.classesFilterWrapper}>
              <Text style={styles.filterLabel}>Kelas:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
                <TouchableOpacity
                  style={[styles.pill, selectedClassId === "all" && styles.pillActive]}
                  onPress={() => setSelectedClassId("all")}
                >
                  <Text style={[styles.pillText, selectedClassId === "all" && styles.pillTextActive]}>Semua</Text>
                </TouchableOpacity>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.pill, selectedClassId === String(cls.id) && styles.pillActive]}
                    onPress={() => setSelectedClassId(String(cls.id))}
                  >
                    <Text style={[styles.pillText, selectedClassId === String(cls.id) && styles.pillTextActive]}>
                      {cls.class_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Real-time check-ins list */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Ionicons name="pulse" size={18} color="#EF4444" />
            <Text style={styles.logTitle}>Log Kehadiran Masuk Sekolah Hari Ini</Text>
            <Text style={styles.logCount}>({filteredRecords.length} Log)</Text>
          </View>

          {isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={styles.logCard}>
                  <Skeleton width={38} height={38} borderRadius={19} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={140} height={14} borderRadius={4} />
                    <Skeleton width={100} height={10} borderRadius={4} />
                    <Skeleton width={80} height={10} borderRadius={4} />
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Skeleton width={80} height={12} borderRadius={4} />
                    <Skeleton width={60} height={16} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wifi-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Belum Ada Log Terkini</Text>
              <Text style={styles.emptyText}>
                Siswa belum memulai pemindaian di pintu gerbang. Sesi live monitor aktif.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredRecords.map((item) => {
                const conf = getStatusConfig(item.status);
                const initials = item.student?.full_name?.charAt(0).toUpperCase() || "S";
                return (
                  <View key={item.id} style={styles.logCard}>
                    {/* Avatar sphere */}
                    <View style={styles.avatarSphere}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    {/* Check-in details */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {item.student?.full_name || "Siswa Rajasa"}
                      </Text>
                      <Text style={styles.studentMeta}>
                        NIS: {item.student?.nis || "-"} | Kelas: {item.class?.class_name || "-"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Ionicons name="phone-portrait-outline" size={11} color="#6B7280" />
                        <Text style={styles.deviceMeta} numberOfLines={1}>
                          {item.device_info || "Scan Pintu Gerbang"}
                        </Text>
                      </View>
                    </View>

                    {/* Time & status badge */}
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={styles.timeLabel}>Masuk: {item.time.substring(0, 5)}</Text>
                      {item.checkout_time && (
                        <Text style={[styles.timeLabel, { color: "#EF4444" }]}>Pulang: {item.checkout_time.substring(0, 5)}</Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {item.status !== 'ditolak' && (user?.roles?.includes('guru') || user?.roles?.includes('wali_kelas') || user?.roles?.includes('super_admin') || user?.roles?.includes('admin')) && (
                          <TouchableOpacity
                            style={styles.tolakButton}
                            onPress={() => handleRejectAttendance(item.id)}
                          >
                            <Text style={styles.tolakButtonText}>Tolak</Text>
                          </TouchableOpacity>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
                          <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  liveActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  livePaused: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6B7280",
  },
  liveDotPulse: {
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  statsLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 2,
  },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    gap: 12,
  },
  searchBox: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  classesFilterWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  pillsContainer: {
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  pillText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#fff",
  },
  logSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937",
  },
  logCount: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 24,
  },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 10,
  },
  avatarSphere: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  studentName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937",
  },
  studentMeta: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
    fontWeight: "600",
  },
  deviceMeta: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  showroomCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  showroomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
    marginBottom: 14,
  },
  showroomIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  showroomPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  showroomIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  showroomTimeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  showroomTimeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
  },
  showroomEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  showroomEmptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 4,
  },
  showroomEmptyText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 16,
  },
  showroomBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  showroomAvatarContainer: {
    position: "relative",
  },
  showroomAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  showroomAvatarText: {
    fontSize: 22,
    fontWeight: "800",
  },
  showroomStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  showroomName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  showroomMeta: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  showroomWelcomeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  showroomWelcomeText: {
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },
  showroomClockContainer: {
    alignItems: "flex-end",
    gap: 6,
  },
  showroomClockTime: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  showroomClockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  showroomClockBadgeText: {
    fontSize: 8,
    fontWeight: "800",
  },
  tolakButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  tolakButtonText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
});
