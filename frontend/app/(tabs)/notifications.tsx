import { useEffect, useState, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  ScrollView,
  DeviceEventEmitter,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { notificationsApi } from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { showConfirm } from "../../utils/alert";
import Skeleton from "../../components/ui/Skeleton";

import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const filteredNotifications = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return notifications;
    return notifications.filter(
      (item) =>
        (item.title || "").toLowerCase().includes(term) ||
        (item.message || "").toLowerCase().includes(term)
    );
  }, [notifications, searchQuery]);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('notification_received', (notification) => {
      console.log('Notification screen received real-time trigger. Reloading list...');
      loadNotifications();
    });
    return () => {
      sub.remove();
    };
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.getAll();
      if (res.data && res.data.notifications) {
        const payload = res.data.notifications;
        const mapped = payload.map((notif: any) => {
          let title = "Pemberitahuan";
          const msg = notif.message.toLowerCase();
          if (msg.includes("absensi") || msg.includes("presensi") || msg.includes("hadir") || msg.includes("kelas")) {
            title = "Absensi Kelas";
          } else if (msg.includes("izin") || msg.includes("sakit") || msg.includes("sakit")) {
            title = "Pengajuan Izin";
          } else if (msg.includes("jadwal")) {
            title = "Jadwal Pelajaran";
          } else if (msg.includes("laporan") || msg.includes("rekap")) {
            title = "Laporan Absensi";
          }
          
          return {
            id: notif.id,
            title,
            message: notif.message,
            is_read: !!notif.is_read,
            created_at: notif.created_at,
          };
        });
        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal memuat notifikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
      DeviceEventEmitter.emit('notifications_updated');
    } catch (e: any) {
      toast.error("Gagal menandai notifikasi dibaca.");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
      toast.success("Semua notifikasi telah ditandai dibaca.");
      DeviceEventEmitter.emit('notifications_updated');
    } catch (e: any) {
      toast.error("Gagal menandai semua notifikasi.");
    }
  };

  const clearAllNotifications = () => {
    showConfirm("Konfirmasi", "Hapus semua notifikasi dari tampilan?", async () => {
      setNotifications([]);
      toast.success("Tampilan notifikasi dibersihkan.");
    });
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.title)}
          size={22}
          color="#3B82F6"
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text
            style={[
              styles.notificationTitle,
              !item.is_read && styles.unreadTitle,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari notifikasi..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done-outline" size={18} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Baca Semua</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonDanger}
            onPress={clearAllNotifications}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.actionButtonDangerText}>Hapus</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && notifications.length === 0 ? (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom }]}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.notificationCard}>
              <Skeleton width={48} height={48} borderRadius={12} style={{ marginRight: 12 }} />
              <View style={styles.notificationContent}>
                <View style={[styles.notificationHeader, { gap: 8, marginBottom: 8 }]}>
                  <Skeleton width={120} height={16} borderRadius={4} />
                  <Skeleton width={8} height={8} borderRadius={4} />
                </View>
                <View style={{ gap: 4, marginBottom: 8 }}>
                  <Skeleton width="100%" height={14} borderRadius={4} />
                  <Skeleton width="80%" height={14} borderRadius={4} />
                </View>
                <Skeleton width={60} height={10} borderRadius={4} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadNotifications}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={48} color="#1E3A8A" />
              <Text style={styles.emptyTitle}>Tidak Ada Notifikasi</Text>
              <Text style={styles.emptyText}>
                Notifikasi akan muncul di sini ketika ada pembaruan terbaru.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getNotificationIcon(title: string): IconName {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("absensi")) return "checkmark-circle-outline";
  if (lowerTitle.includes("izin")) return "document-text-outline";
  if (lowerTitle.includes("laporan")) return "bar-chart-outline";
  if (lowerTitle.includes("jadwal")) return "calendar-outline";
  if (lowerTitle.includes("pengumuman")) return "megaphone-outline";
  return "notifications-outline";
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  unreadCount: { fontSize: 12, color: "#EF4444", marginTop: 2 },
  headerSpacer: { flex: 1 },
  actionBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  actionButtonText: { fontSize: 12, color: "#3B82F6", fontWeight: "700" },
  actionButtonDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  actionButtonDangerText: { fontSize: 12, color: "#EF4444", fontWeight: "700" },
  listContent: { padding: 16, flexGrow: 1 },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: "#3B82F6" },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  unreadTitle: { fontWeight: "800", color: "#1F2937" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  notificationMessage: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationTime: { fontSize: 11, color: "#9CA3AF" },
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    } as any),
  },
  clearButton: {
    padding: 4,
  },
});
