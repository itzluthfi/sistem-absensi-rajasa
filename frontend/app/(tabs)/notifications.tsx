import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem("notifications");
      setNotifications(stored ? JSON.parse(stored) : []);
    } catch {
      Alert.alert("Error", "Gagal memuat notifikasi lokal");
    } finally {
      setIsLoading(false);
    }
  };

  const persist = async (next: Notification[]) => {
    setNotifications(next);
    await AsyncStorage.setItem("notifications", JSON.stringify(next));
  };

  const markAsRead = async (id: string) => {
    await persist(
      notifications.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    );
  };

  const markAllAsRead = async () => {
    await persist(notifications.map((item) => ({ ...item, is_read: true })));
    Alert.alert("Berhasil", "Semua notifikasi telah dibaca");
  };

  const clearAllNotifications = () => {
    Alert.alert("Konfirmasi", "Hapus semua notifikasi?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          setNotifications([]);
          await AsyncStorage.removeItem("notifications");
        },
      },
    ]);
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
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <Image
        source={
          isMobile
            ? require("../../assets/images/wallpaper-app-mobile.png")
            : require("../../assets/images/wallpaper-app-desktop.png")
        }
        style={[
          StyleSheet.absoluteFillObject,
          { width: "100%", height: "100%" },
        ]}
        resizeMode="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "rgba(243, 244, 246, 0.85)",
            width: "100%",
            height: "100%",
          },
        ]}
      />


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

      <FlatList
        data={notifications}
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
});
