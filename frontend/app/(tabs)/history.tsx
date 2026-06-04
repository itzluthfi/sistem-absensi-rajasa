import { useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { attendanceApi } from "../../services/api";
import Skeleton from "../../components/ui/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [allAttendanceData, setAllAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "harian" | "mapel">("all");

  const isSiswa = user?.roles?.includes("siswa");

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
      setAllAttendanceData(data);
    } catch (error) {
      console.error("Failed to load attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      hadir: "#10B981",
      telat: "#F59E0B",
      izin: "#3B82F6",
      sakit: "#EF4444",
      alpha: "#6B7280",
      ditolak: "#DC2626",
    };
    return colors[status] || "#6B7280";
  };

  // Perform dynamic filtering in memory
  const filteredHistory = useMemo(() => {
    let list = [...allAttendanceData];

    const studentId = user?.student_info?.id;
    const isSuperAdmin = user?.roles?.includes("super_admin");
    const isAdmin = user?.roles?.includes("admin");
    const isKepalaSekolah = user?.roles?.includes("kepala_sekolah");
    const isGuru = user?.roles?.includes("guru");

    // 1. Role-based base filtering
    if (isSuperAdmin || isAdmin || isKepalaSekolah) {
      // Admins and Kepsek see all logs
    } else if (isSiswa && studentId) {
      list = list.filter((a: any) => a.student_id === studentId);
    } else {
      // Teacher base filtering
      const teacherUserId = user?.id;

      list = list.filter((a: any) => {
        let match = false;
        if (isGuru && teacherUserId && a.recorded_by === teacherUserId) {
          match = true;
        }
        return match;
      });
    }

    // 3. Status Filter
    if (statusFilter !== "all") {
      list = list.filter((a: any) => String(a.status).toLowerCase() === statusFilter);
    }

    // 4. Attendance Type Filter
    if (typeFilter !== "all") {
      if (typeFilter === "harian") {
        list = list.filter((a: any) => a.schedule_id === null || a.schedule_id === undefined);
      } else if (typeFilter === "mapel") {
        list = list.filter((a: any) => a.schedule_id !== null && a.schedule_id !== undefined);
      }
    }

    return list;
  }, [allAttendanceData, statusFilter, typeFilter, user, isSiswa]);

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      <View
        style={[
          styles.titleBar,
          {
            backgroundColor: "transparent",
            borderBottomColor: "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <Text style={styles.titleText}>Riwayat Kehadiran</Text>
        <Text style={styles.subtitleText}>
          {isSiswa
            ? "Daftar kehadiran absensi Anda"
            : "Daftar kehadiran absensi sekolah"}
        </Text>
      </View>

      {/* Sticky Interactive Horizontal Scroll Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          

          {/* Type Filter */}
          <View style={styles.filterGroup}>
            <TouchableOpacity
              style={[styles.filterButton, typeFilter === "all" && styles.filterButtonActive]}
              onPress={() => setTypeFilter("all")}
            >
              <Text style={[styles.filterButtonText, typeFilter === "all" && styles.filterButtonTextActive]}>
                Semua Tipe
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, typeFilter === "harian" && styles.filterButtonActive]}
              onPress={() => setTypeFilter("harian")}
            >
              <Text style={[styles.filterButtonText, typeFilter === "harian" && styles.filterButtonTextActive]}>
                Harian Sekolah
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, typeFilter === "mapel" && styles.filterButtonActive]}
              onPress={() => setTypeFilter("mapel")}
            >
              <Text style={[styles.filterButtonText, typeFilter === "mapel" && styles.filterButtonTextActive]}>
                Pelajaran (Mapel)
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
          </View>

          {/* Status Filter */}
          <View style={styles.filterGroup}>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === "all" && styles.filterButtonActive]}
              onPress={() => setStatusFilter("all")}
            >
              <Text style={[styles.filterButtonText, statusFilter === "all" && styles.filterButtonTextActive]}>
                Semua Status
              </Text>
            </TouchableOpacity>
            {["hadir", "telat", "izin", "sakit", "alpha", "ditolak"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonText, 
                  statusFilter === status && styles.filterButtonTextActive,
                  statusFilter === status && { color: getStatusColor(status) }
                ]}>
                  {status === "ditolak" ? "Ditolak" : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading && allAttendanceData.length === 0 ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dateSection}>
                  <Skeleton width={180} height={18} borderRadius={4} />
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                    <Skeleton width={80} height={14} borderRadius={4} />
                    <Skeleton width={80} height={14} borderRadius={4} />
                  </View>
                </View>
                <Skeleton width={70} height={24} borderRadius={10} />
              </View>
              {!isSiswa && (
                <View style={[styles.studentSection, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12, marginTop: 12 }]}>
                  <Skeleton width={120} height={14} borderRadius={4} />
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadAttendance}
              tintColor="#06B6D4"
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          ListHeaderComponent={
            !isMobile && filteredHistory.length > 0 ? (
              <View style={styles.tableHeader}>
                {isSiswa ? (
                  <>
                    <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>
                      Hari & Tanggal
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                      Tipe / Mata Pelajaran
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                      Jam Absen
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>
                      Status
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                      Hari & Tanggal
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                      Mata Pelajaran
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                      Jam Absen
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                      Nama Siswa
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>
                      Kelas
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>
                      Status
                    </Text>
                  </>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#1E3A8A" />
              <Text style={styles.emptyTitle}>Belum Ada Data</Text>
              <Text style={styles.emptyText}>
                {isSiswa
                  ? "Belum ada absensi tercatat untuk kriteria filter ini"
                  : "Belum ada absensi tercatat untuk kriteria filter ini"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isItemHarian = item.schedule_id === null || item.schedule_id === undefined;
            if (!isMobile) {
              const formattedDate = new Date(item.date).toLocaleDateString(
                "id-ID",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              );

              return (
                <View style={styles.tableRow}>
                  {isSiswa ? (
                    <>
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 2.5, fontWeight: "700", color: "#1E293B" },
                        ]}
                      >
                        {formattedDate}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 2, color: isItemHarian ? "#10B981" : "#3B82F6", fontWeight: "700" }]}>
                        {isItemHarian
                          ? "Masuk Sekolah (Harian)"
                          : `${item.subject_name || "Mata Pelajaran"}`}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>
                        {item.time ? item.time.substring(0, 5) : "-"}
                        {isItemHarian && item.checkout_time ? ` / ${item.checkout_time.substring(0, 5)}` : ""}
                      </Text>
                      <View style={{ flex: 1.3, alignItems: "flex-start" }}>
                        <StatusBadge status={item.status} />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 2.2, fontWeight: "700", color: "#1E293B" },
                        ]}
                      >
                        {formattedDate}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 2, color: isItemHarian ? "#10B981" : "#3B82F6", fontWeight: "700" }]}>
                        {isItemHarian
                          ? "Masuk Sekolah (Harian)"
                          : `${item.subject_name || "Mata Pelajaran"}`}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>
                        {item.time ? item.time.substring(0, 5) : "-"}
                        {isItemHarian && item.checkout_time ? ` / ${item.checkout_time.substring(0, 5)}` : ""}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 2, color: "#1E293B", fontWeight: "700" },
                        ]}
                      >
                        {item.student?.full_name || "-"}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.1 }]}>
                        {item.student?.class?.class_name || "-"}
                      </Text>
                      <View style={{ flex: 1.3, alignItems: "flex-start" }}>
                        <StatusBadge status={item.status} />
                      </View>
                    </>
                  )}
                </View>
              );
            }

            return (
              <View style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateSection}>
                    <Text style={styles.dateText}>
                      {new Date(item.date).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Text>
                    
                    {/* Attendance Type Distinction */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}>
                      <Ionicons
                        name={isItemHarian ? "school-outline" : "book-outline"}
                        size={14}
                        color={isItemHarian ? "#10B981" : "#3B82F6"}
                      />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isItemHarian ? "#047857" : "#1D4ED8" }}>
                        {isItemHarian
                          ? "Masuk Sekolah (Harian)"
                          : `Mapel: ${item.subject_name || "Mata Pelajaran"}`}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                      {item.time && (
                        <View style={styles.timeBadge}>
                          <Ionicons
                            name="log-in-outline"
                            size={12}
                            color="#10B981"
                          />
                          <Text style={styles.timeText}>Masuk: {item.time.substring(0, 5)}</Text>
                        </View>
                      )}
                      {isItemHarian && (
                        <View style={styles.timeBadge}>
                          <Ionicons
                            name="log-out-outline"
                            size={12}
                            color="#EF4444"
                          />
                          <Text style={styles.timeText}>
                            Pulang: {item.checkout_time ? item.checkout_time.substring(0, 5) : "-"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {!isSiswa && item.student && (
                  <View style={styles.studentSection}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.studentName}>
                      {item.student.full_name || "Siswa"}
                    </Text>
                    {item.student.class && (
                      <Text style={styles.className}>
                        {" "}
                        • {item.student.class.class_name}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    hadir: "#10B981",
    telat: "#F59E0B",
    izin: "#3B82F6",
    sakit: "#EF4444",
    alpha: "#6B7280",
    ditolak: "#DC2626",
  };
  const color = colors[status] || "#6B7280";
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.statusBadgeText, { color }]}>
        {status === "ditolak" ? "Ditolak" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  titleBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitleText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Protect from floating bottom tab bar
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
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateSection: {
    flex: 1,
    paddingRight: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  studentSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  studentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginLeft: 6,
  },
  className: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableCell: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  filterBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterButtonTextActive: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },
});
