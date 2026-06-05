import { useEffect, useState, useMemo } from "react";
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
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationLogsApi } from "../../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../hooks/useToast";
import Skeleton from "../../../components/ui/Skeleton";

type LogRecord = {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  channel: "database" | "fcm";
  status: "success" | "failed" | "skipped";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles?: string[];
  } | null;
};

export default function NotificationLogsScreen() {
  const toast = useToast();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "database" | "fcm">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Clear modal states
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearFilter, setClearFilter] = useState<"all" | "1_week" | "1_month" | "custom">("all");
  const [clearStartDate, setClearStartDate] = useState("");
  const [clearEndDate, setClearEndDate] = useState("");

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  // Set default custom dates to today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setClearStartDate(today);
    setClearEndDate(today);
  }, []);

  useEffect(() => {
    // Reset page and reload on filters change
    fetchLogs(1, true);
  }, [statusFilter, channelFilter, search]);

  const fetchLogs = async (pageNum: number, isReset = false) => {
    if (pageNum === 1) {
      if (isReset) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params: any = {
        page: pageNum,
        per_page: 20,
        status: statusFilter,
        channel: channelFilter,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await notificationLogsApi.getAll(params);
      const fetchedLogs = res.data?.data || res.data || [];
      const lastPage = res.data?.last_page || 1;

      if (pageNum === 1) {
        setLogs(fetchedLogs);
      } else {
        setLogs((prev) => [...prev, ...fetchedLogs]);
      }

      setPage(pageNum);
      setHasMore(pageNum < lastPage);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal memuat log notifikasi."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs(1, false);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      fetchLogs(page + 1, false);
    }
  };

  const handleClearLogs = () => {
    setShowClearModal(true);
  };

  const executeClearLogs = async () => {
    if (clearFilter === "custom") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(clearStartDate) || !dateRegex.test(clearEndDate)) {
        toast.error("Format tanggal harus YYYY-MM-DD (contoh: 2026-06-05)");
        return;
      }
    }

    setIsClearing(true);
    try {
      const params: any = { filter: clearFilter };
      if (clearFilter === "custom") {
        params.start_date = clearStartDate;
        params.end_date = clearEndDate;
      }

      const res = await notificationLogsApi.clearAll(params);
      setShowClearModal(false);
      toast.success(res.message || "Pembersihan log berhasil.");
      
      // Reload logs feed
      fetchLogs(1, true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal membersihkan log."
      );
    } finally {
      setIsClearing(false);
    }
  };

  const getRoleColor = (roles: string[] | undefined) => {
    if (!roles || roles.length === 0) return "#6B7280";
    const primary = roles[0];
    if (primary === "super_admin") return "#DC2626";
    if (primary === "admin") return "#F59E0B";
    if (primary === "guru") return "#3B82F6";
    if (primary === "siswa") return "#10B981";
    return "#6B7280";
  };

  const getRoleLabel = (roles: string[] | undefined) => {
    if (!roles || roles.length === 0) return "Tamu";
    const primary = roles[0];
    const roleMap: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin TU",
      guru: "Guru",
      siswa: "Siswa",
      kepala_sekolah: "Kepsek",
      petugas: "Petugas",
    };
    return roleMap[primary] || primary;
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      {/* Header Title Section */}
      <View style={styles.headerTitleContainer}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Log Notifikasi Sistem</Text>
            <Text style={styles.headerSubtitle}>
              Pantau status pengiriman notifikasi internal & Firebase push notification
            </Text>
          </View>
          {logs.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearLogs}
              disabled={isClearing}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  {!isMobile && <Text style={styles.clearButtonText}>Bersihkan Log</Text>}
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Toolbar / Search Box */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari berdasarkan nama penerima atau pesan..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Filters: Status & Channel */}
      <View style={styles.filterContainer}>
        {/* Channel filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Saluran:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={styles.filterPills}>
              {(["all", "database", "fcm"] as const).map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[
                    styles.filterPill,
                    channelFilter === channel && styles.filterPillActive,
                  ]}
                  onPress={() => setChannelFilter(channel)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      channelFilter === channel && styles.filterPillTextActive,
                    ]}
                  >
                    {channel === "all" ? "Semua" : channel.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Status filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={styles.filterPills}>
              {(["all", "success", "failed"] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterPill,
                    statusFilter === status && styles.filterPillActive,
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      statusFilter === status && styles.filterPillTextActive,
                    ]}
                  >
                    {status === "all" ? "Semua" : status === "success" ? "Berhasil" : "Gagal"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Logs Feed */}
      {isLoading && logs.length === 0 ? (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom }]}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.logCard}>
              <View style={styles.logCardHeader}>
                <Skeleton width={120} height={14} borderRadius={4} />
                <Skeleton width={60} height={18} borderRadius={6} />
              </View>
              <Skeleton width="100%" height={16} borderRadius={4} style={{ marginVertical: 8 }} />
              <Skeleton width="90%" height={14} borderRadius={4} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Skeleton width={80} height={12} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#3B82F6" />
                <Text style={styles.footerLoaderText}>Memuat log berikutnya...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Log notifikasi tidak ditemukan</Text>
              <Text style={styles.emptyText}>
                Belum ada notifikasi yang terkirim atau coba ubah filter pencarian Anda.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isFcm = item.channel === "fcm";
            const isSuccess = item.status === "success";
            const userRole = item.user?.roles;

            return (
              <View style={[styles.logCard, !isSuccess && styles.logCardFailed]}>
                {/* Header: Recipient info */}
                <View style={styles.logCardHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <Text style={styles.recipientName} numberOfLines={1}>
                        {item.user ? item.user.name : "System (Sistem)"}
                      </Text>
                      {item.user && (
                        <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(userRole)}15` }]}>
                          <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>
                            {getRoleLabel(userRole)}
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.user && (
                      <Text style={styles.recipientEmailSubtitle}>
                        {item.user.email}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {/* Channel badge */}
                    <View style={[styles.badge, isFcm ? styles.badgeFcm : styles.badgeDb]}>
                      <Text style={[styles.badgeText, isFcm ? styles.badgeTextFcm : styles.badgeTextDb]}>
                        {item.channel.toUpperCase()}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View style={[styles.badge, isSuccess ? styles.badgeSuccess : styles.badgeFailed]}>
                      <Text style={[styles.badgeText, isSuccess ? styles.badgeTextSuccess : styles.badgeTextFailed]}>
                        {isSuccess ? "BERHASIL" : "GAGAL"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Body: Title and Message */}
                <View style={styles.logCardBody}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  <Text style={styles.logMessage}>{item.message}</Text>
                </View>

                {/* Error Banner (if failed) */}
                {!isSuccess && item.error_message && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning" size={14} color="#DC2626" style={{ marginTop: 2, marginRight: 6 }} />
                    <Text style={styles.errorText}>
                      Detail Error: {item.error_message}
                    </Text>
                  </View>
                )}

                {/* Footer: Date & Time */}
                <View style={styles.logCardFooter}>
                  <Text style={styles.logTime}>
                    {formatTime(item.created_at)}
                  </Text>
                  {item.user && (
                    <Text style={styles.recipientEmail} numberOfLines={1}>
                      {item.user.email}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Clear Logs Modal */}
      <Modal visible={showClearModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bersihkan Log Notifikasi</Text>
              <TouchableOpacity onPress={() => setShowClearModal(false)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalInstructions}>
                Pilih opsi pembersihan data log. Data yang dihapus tidak dapat dipulihkan.
              </Text>

              {/* Filter Template Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Template Rentang Waktu</Text>
                <View style={styles.templateOptions}>
                  {[
                    { label: "Semua", value: "all" },
                    { label: "1 Minggu", value: "1_week" },
                    { label: "1 Bulan", value: "1_month" },
                    { label: "Kustom", value: "custom" },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.templateButton,
                        clearFilter === opt.value && styles.templateButtonActive,
                      ]}
                      onPress={() => setClearFilter(opt.value as any)}
                    >
                      <Text
                        style={[
                          styles.templateButtonText,
                          clearFilter === opt.value && styles.templateButtonTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Date Inputs */}
              {clearFilter === "custom" && (
                <View style={styles.dateInputsRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Mulai Tanggal</Text>
                    <TextInput
                      style={styles.input}
                      value={clearStartDate}
                      onChangeText={setClearStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Sampai Tanggal</Text>
                    <TextInput
                      style={styles.input}
                      value={clearEndDate}
                      onChangeText={setClearEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowClearModal(false)}>
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#EF4444" }]}
                onPress={executeClearLogs}
                disabled={isClearing}
              >
                {isClearing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Bersihkan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleContainer: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
    fontWeight: "500",
    lineHeight: 16,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
    gap: 6,
  },
  clearButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  toolbar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#fff",
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    width: 60,
  },
  filterPills: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterPillActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterPillText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logCardFailed: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFDFD",
  },
  logCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    maxWidth: 160,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDb: {
    backgroundColor: "#EFF6FF",
  },
  badgeFcm: {
    backgroundColor: "#FFF7ED",
  },
  badgeSuccess: {
    backgroundColor: "#D1FAE5",
  },
  badgeFailed: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "900",
  },
  badgeTextDb: {
    color: "#2563EB",
  },
  badgeTextFcm: {
    color: "#EA580C",
  },
  badgeTextSuccess: {
    color: "#059669",
  },
  badgeTextFailed: {
    color: "#DC2626",
  },
  logCardBody: {
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 3,
  },
  logMessage: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
    lineHeight: 15,
  },
  logCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  logTime: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  recipientEmail: {
    fontSize: 11,
    color: "#6B7280",
    maxWidth: 180,
  },
  recipientEmailSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "88%",
  },
  modalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  modalInstructions: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 18,
    fontWeight: "500",
  },
  iconButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  templateOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  templateButtonActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  templateButtonText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "700",
  },
  templateButtonTextActive: {
    color: "#fff",
  },
  dateInputsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  modalFooter: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
});
