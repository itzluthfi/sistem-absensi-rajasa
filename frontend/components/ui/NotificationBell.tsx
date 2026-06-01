import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationsApi } from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";

interface Notification {
  id: string;
  message: string;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  iconColor?: string;
  iconSize?: number;
}

export default function NotificationBell({
  iconColor = "#fff",
  iconSize = 22,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {
      // Fail silently — tidak ganggu UI
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleOpen = async () => {
    setIsOpen(true);
    if (!isLoading) {
      setIsLoading(true);
      await fetchNotifications();
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins} menit lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch {
      return "";
    }
  };

  return (
    <View>
      {/* Bell Icon Button */}
      <TouchableOpacity style={styles.bellButton} onPress={handleOpen}>
        <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notification Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.panel,
              Platform.OS === "web"
                ? styles.panelWeb
                : styles.panelNative,
            ]}
          >
            {/* Panel Header */}
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                Notifikasi
                {unreadCount > 0 && (
                  <Text style={styles.unreadBadgeText}> ({unreadCount} baru)</Text>
                )}
              </Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>Tandai Semua Dibaca</Text>
              </TouchableOpacity>
            </View>

            {/* Notification List */}
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Belum ada notifikasi</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notifItem,
                      !notif.is_read && styles.notifItemUnread,
                    ]}
                    onPress={() => !notif.is_read && handleMarkRead(notif.id)}
                    activeOpacity={notif.is_read ? 1 : 0.7}
                  >
                    <View style={styles.notifIconWrap}>
                      <View style={[
                        styles.notifDot,
                        notif.is_read ? styles.notifDotRead : styles.notifDotUnread,
                      ]} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[
                        styles.notifMessage,
                        !notif.is_read && styles.notifMessageUnread,
                      ]}>
                        {notif.message}
                      </Text>
                      <Text style={styles.notifTime}>
                        {formatTime(notif.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: "relative",
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  panelWeb: {
    width: 360,
    maxHeight: 500,
    marginTop: 60,
    marginRight: 16,
  },
  panelNative: {
    width: 320,
    maxHeight: 420,
    marginTop: 80,
    marginRight: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  unreadBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  list: {
    maxHeight: 380,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 8,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 10,
  },
  notifItemUnread: {
    backgroundColor: "#EFF6FF",
  },
  notifIconWrap: {
    marginTop: 5,
    width: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifDotUnread: {
    backgroundColor: "#2563EB",
  },
  notifDotRead: {
    backgroundColor: "#CBD5E1",
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    fontWeight: "400",
  },
  notifMessageUnread: {
    color: "#0F172A",
    fontWeight: "600",
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "400",
  },
});
