import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../../hooks/useToast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentsApi, schedulesApi, leaveRequestsApi, API_BASE_URL } from "../../services/api";

type ActiveTab = "students" | "schedules" | "leaves";

export default function HomeroomScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const classId = user?.teacher_info?.class_ids?.[0];
  const className = user?.teacher_info?.class_names?.[0] || "Kelas Perwalian";

  const [activeTab, setActiveTab] = useState<ActiveTab>("students");
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRoster = async () => {
    if (!classId) return;
    try {
      const res = await studentsApi.getAll({ class_id: classId, all: true });
      const data = res.data?.data ?? res.data ?? res ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Gagal mengambil data siswa", e);
    }
  };

  const fetchSchedules = async () => {
    if (!classId) return;
    try {
      const res = await schedulesApi.getAll({ class_id: classId, all: true });
      const data = res.data?.data ?? res.data ?? res ?? [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Gagal mengambil jadwal kelas", e);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await leaveRequestsApi.getAll();
      const data = res.data?.data ?? res.data ?? res ?? [];
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Gagal mengambil data pengajuan izin", e);
    }
  };

  const loadAllData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    await Promise.all([fetchRoster(), fetchSchedules(), fetchLeaveRequests()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (classId) {
      loadAllData();
    }
  }, [classId]);

  const handleApproveLeave = (id: number) => {
    Alert.alert(
      "Setujui Pengajuan Izin",
      "Apakah Anda yakin ingin menyetujui pengajuan izin/sakit siswa ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Setujui",
          onPress: async () => {
            setActionLoading(id);
            try {
              const res = await leaveRequestsApi.approve(id);
              if (res.success) {
                toast.success("Pengajuan izin berhasil disetujui.");
                loadAllData(false);
              }
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Gagal memproses persetujuan izin");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectLeave = (id: number) => {
    Alert.alert(
      "Tolak Pengajuan Izin",
      "Apakah Anda yakin ingin menolak pengajuan izin/sakit siswa ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak",
          style: "destructive",
          onPress: async () => {
            setActionLoading(id);
            try {
              const res = await leaveRequestsApi.reject(id);
              if (res.success) {
                toast.info("Pengajuan izin berhasil ditolak.");
                loadAllData(false);
              }
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Gagal memproses penolakan izin");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const openAttachment = (url: string) => {
    if (!url) return;
    const fileUrl = url.startsWith("http") ? url : `${API_BASE_URL}/storage/${url}`;
    Linking.openURL(fileUrl).catch(() => {
      toast.error("Gagal membuka file lampiran.");
    });
  };

  const schedulesGroupedByDay = useMemo(() => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const indDays: Record<string, string> = {
      Monday: "Senin",
      Tuesday: "Selasa",
      Wednesday: "Rabu",
      Thursday: "Kamis",
      Friday: "Jumat",
    };
    
    const groups: Record<string, any[]> = {};
    daysOrder.forEach((day) => {
      groups[indDays[day]] = [];
    });

    schedules.forEach((sch) => {
      const dayInd = indDays[sch.day_name] || sch.day_name;
      if (groups[dayInd]) {
        groups[dayInd].push(sch);
      }
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0 || true);
  }, [schedules]);

  if (!classId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Bukan Wali Kelas</Text>
        <Text style={styles.errorText}>
          Akun Anda tidak tercatat sebagai Wali Kelas untuk rombel kelas manapun saat ini.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Kelas Perwalian: {className}</Text>
          <Text style={styles.headerSubtitle}>Kelola Roster, Jadwal Pelajaran, & Izin Kelas</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "students" && styles.tabItemActive]}
          onPress={() => setActiveTab("students")}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === "students" ? "#8B5CF6" : "#6B7280"} />
          <Text style={[styles.tabLabel, activeTab === "students" && styles.tabLabelActive]}>Siswa ({students.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "schedules" && styles.tabItemActive]}
          onPress={() => setActiveTab("schedules")}
        >
          <Ionicons name="calendar-outline" size={18} color={activeTab === "schedules" ? "#8B5CF6" : "#6B7280"} />
          <Text style={[styles.tabLabel, activeTab === "schedules" && styles.tabLabelActive]}>Jadwal Mapel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "leaves" && styles.tabItemActive]}
          onPress={() => setActiveTab("leaves")}
        >
          <Ionicons name="document-text-outline" size={18} color={activeTab === "leaves" ? "#8B5CF6" : "#6B7280"} />
          <Text style={[styles.tabLabel, activeTab === "leaves" && styles.tabLabelActive]}>
            Izin & Sakit ({leaveRequests.filter(r => r.approval_status === 'pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Memuat data kelas perwalian...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          data={activeTab === "students" ? students : activeTab === "leaves" ? leaveRequests : schedulesGroupedByDay}
          keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadAllData(true)} />}
          renderItem={({ item }) => {
            if (activeTab === "students") {
              const initials = item.full_name?.charAt(0).toUpperCase() || "S";
              return (
                <View style={styles.card}>
                  <View style={styles.avatarSphere}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nameText}>{item.full_name}</Text>
                    <Text style={styles.subText}>NISN: {item.nisn ?? "-"} | NIS: {item.nis ?? "-"}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => router.push({ pathname: "/(tabs)/history", params: { student_id: item.id } })}
                  >
                    <Ionicons name="eye-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.detailBtnText}>Riwayat</Text>
                  </TouchableOpacity>
                </View>
              );
            } else if (activeTab === "leaves") {
              const dateStr = item.start_date === item.end_date 
                ? new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : `${new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
              
              const isPending = item.approval_status === "pending";
              const isApproved = item.approval_status === "approved";
              
              const statusColor = isApproved ? "#10B981" : isPending ? "#F59E0B" : "#EF4444";
              const statusBg = isApproved ? "#D1FAE5" : isPending ? "#FEF3C7" : "#FEE2E2";
              const statusText = isApproved ? "DISETUJUI" : isPending ? "PENDING" : "DITOLAK";

              return (
                <View style={[styles.card, { flexDirection: "column", alignItems: "stretch", gap: 12 }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nameText}>{item.student?.full_name}</Text>
                      <Text style={styles.subText}>NIS: {item.student?.nis ?? "-"}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>

                  <View style={styles.leaveDetails}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.leaveText}><strong>Tanggal:</strong> {dateStr}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons 
                        name={item.permission_type === "sakit" ? "medical-outline" : "document-text-outline"} 
                        size={14} 
                        color="#6B7280" 
                      />
                      <Text style={styles.leaveText}>
                        <strong>Tipe:</strong> <span style={{ textTransform: "capitalize" }}>{item.permission_type}</span>
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                      <Ionicons name="chatbox-ellipses-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
                      <Text style={[styles.leaveText, { flex: 1 }]}><strong>Alasan:</strong> {item.reason}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    {item.attachment && (
                      <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => openAttachment(item.attachment)}>
                        <Ionicons name="attach-outline" size={16} color="#4B5563" />
                        <Text style={styles.actionBtnSecondaryText}>Lihat Lampiran</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isPending && (
                      <>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                          style={styles.actionBtnReject}
                          onPress={() => handleRejectLeave(item.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.actionBtnText}>Tolak</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtnApprove}
                          onPress={() => handleApproveLeave(item.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.actionBtnText}>Setujui</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            } else {
              // Schedules view grouped by day
              const [dayName, daySchedules] = item;
              return (
                <View style={[styles.card, { flexDirection: "column", alignItems: "stretch", padding: 14, gap: 12 }]}>
                  <View style={styles.dayHeader}>
                    <Ionicons name="calendar" size={18} color="#8B5CF6" />
                    <Text style={styles.dayTitle}>{dayName}</Text>
                  </View>
                  
                  <View style={{ gap: 8 }}>
                    {daySchedules.map((sch: any, idx: number) => (
                      <View key={sch.id} style={[styles.scheduleItemRow, idx < daySchedules.length - 1 && styles.borderBottom]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectText}>{sch.subject?.subject_name}</Text>
                          <Text style={styles.teacherSubText}>Guru: {sch.teacher?.full_name || "N/A"}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.timeText}>{sch.start_time.substring(0, 5)} - {sch.end_time.substring(0, 5)}</Text>
                          <Text style={styles.roomText}>Ruang: {sch.room ?? "-"}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Data Kosong</Text>
              <Text style={styles.emptySubtitle}>Tidak ada data yang tersedia di tab ini.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#8B5CF6",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabLabelActive: {
    color: "#8B5CF6",
    fontWeight: "800",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarSphere: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#D8B4FE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  nameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  subText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  scheduleItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  teacherSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  roomText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  leaveDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  leaveText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 16,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  actionBtnApprove: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  actionBtnReject: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 32,
  },
  backBtn: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 24,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
});
