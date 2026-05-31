import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../services/api";

import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isAdmin = user?.roles?.includes("admin") || user?.roles?.includes("super_admin");

  // Change Password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const menuItems: Array<{
    icon: IconName;
    label: string;
    subtitle: string;
    onPress: () => void;
  }> = [
    {
      icon: "notifications-outline",
      label: "Notifikasi",
      subtitle: "Buka daftar notifikasi",
      onPress: () => router.push("/(tabs)/notifications"),
    },
    ...(isAdmin ? [{
      icon: "location-outline" as IconName,
      label: "Pengaturan GPS Geofencing",
      subtitle: "Cari & atur lokasi & radius sekolah",
      onPress: () => router.push("/admin/gps-settings"),
    }] : []),
    {
      icon: "lock-closed-outline",
      label: "Ubah Kata Sandi",
      subtitle: "Fitur reset password",
      onPress: () => setShowChangePasswordModal(true),
    },
    {
      icon: "information-circle-outline",
      label: "Tentang Aplikasi",
      subtitle: "Versi 1.0.0",
      onPress: () =>
        Alert.alert(
          "Tentang",
          "Sistem Absensi Digital SMKS Rajasa\nVersi 1.0.0\n\n© 2024",
        ),
    },
  ];

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      Alert.alert("Error", "Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      Alert.alert("Error", "Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setIsSubmittingPassword(false);
      setShowChangePasswordModal(false);
      // Reset form fields
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      Alert.alert("Berhasil", "Kata sandi Anda berhasil diperbarui.");
    } catch (error: any) {
      setIsSubmittingPassword(false);
      Alert.alert(
        "Gagal Mengubah",
        error.response?.data?.message ||
          "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar.",
      );
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace("/(auth)/login");
  };

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


      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        {/* User Info Card (Compact Horizontal Layout with beautiful Gradient) */}
        <View style={[styles.userCard, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.userCardLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.userCardInfo}>
              <View style={[styles.userNameRow, isMobile && { flexWrap: 'wrap' }]}>
                <Text style={styles.userName}>{user?.name || "Pengguna"}</Text>
                <View
                  style={[
                    styles.roleBadgePill,
                    { backgroundColor: getRoleColor(user?.roles) },
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {getRoleLabel(user?.roles)}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user?.email || "-"}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.userCardLogoutButton,
              isMobile && { width: '100%', marginTop: 12 }
            ]}
            onPress={() => setShowLogoutConfirm(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.userCardLogoutText}>Keluar Akun</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Role-specific Info (Single unified vertical layout) */}
        {user?.student_info && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Informasi Siswa</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NIS</Text>
              <Text style={styles.infoValue}>{user.student_info.nis}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas</Text>
              <Text style={styles.infoValue}>
                {user.student_info.class_name}
              </Text>
            </View>
          </View>
        )}

        {user?.teacher_info && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Informasi Guru</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NIP</Text>
              <Text style={styles.infoValue}>{user.teacher_info.nip}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas</Text>
              <Text style={styles.infoValue}>
                {user.teacher_info.class_names?.join(", ")}
              </Text>
            </View>
          </View>
        )}

        {/* Menu Section (Single unified vertical layout) */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Pengaturan</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={22} color="#3B82F6" />
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistem Absensi Digital SMKS Rajasa
          </Text>
          <Text style={styles.footerVersion}>Versi 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="log-out-outline" size={48} color="#EF4444" />
            <Text style={styles.modalTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.modalText}>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ubah Kata Sandi</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setNewPasswordConfirmation("");
                }}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Kata Sandi Saat Ini</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan kata sandi saat ini"
                  placeholderTextColor="#9CA3AF"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Kata Sandi Baru</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan kata sandi baru"
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Konfirmasi Kata Sandi Baru
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ulangi kata sandi baru"
                  placeholderTextColor="#9CA3AF"
                  value={newPasswordConfirmation}
                  onChangeText={setNewPasswordConfirmation}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  isSubmittingPassword && styles.saveBtnDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={isSubmittingPassword}
              >
                {isSubmittingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>SIMPAN PERUBAHAN</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getRoleLabel(roles?: string[]) {
  if (!roles || roles.length === 0) return "Pengguna";
  const roleMap: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin TU",
    guru: "Guru",
    wali_kelas: "Wali Kelas",
    siswa: "Siswa",
    kepala_sekolah: "Kepala Sekolah",
  };
  return roleMap[roles[0]] || roles[0];
}

function getRoleColor(roles?: string[]) {
  if (!roles || roles.length === 0) return "#6B7280";
  const colors: Record<string, string> = {
    super_admin: "#DC2626",
    admin: "#F59E0B",
    guru: "#3B82F6",
    wali_kelas: "#8B5CF6",
    siswa: "#10B981",
    kepala_sekolah: "#EC4899",
  };
  return colors[roles[0]] || "#6B7280";
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
  headerSpacer: { flex: 1 },
  content: { paddingBottom: 32 },
  userCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "#3B82F6",
    ...(Platform.OS === 'web' && {
      backgroundImage: 'linear-gradient(90deg, #2563EB, #60A5FA)',
    } as any),
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userCardInfo: {
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#2563EB" },
  userName: { fontSize: 18, fontWeight: "800", color: "#fff" },
  userEmail: { fontSize: 13, color: "rgba(255, 255, 255, 0.85)" },
  roleBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  userCardLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userCardLogoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  desktopSplitGrid: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: { fontSize: 14, color: "#6B7280" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuInfo: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuSubtitle: { fontSize: 12, color: "#9CA3AF" },
  footer: { alignItems: "center", marginTop: 24 },
  footerText: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  footerVersion: { fontSize: 12, color: "#D1D5DB" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 32,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 14,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 16,
  },
  closeModalBtn: { padding: 4 },
  modalBodyScroll: {
    width: "100%",
    maxHeight: 350,
  },
  inputContainer: {
    marginBottom: 16,
    width: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  saveBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
