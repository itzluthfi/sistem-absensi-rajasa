import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usersApi, rolesApi } from "../../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../hooks/useToast";
import Skeleton from "../../../components/ui/Skeleton";

type UserRecord = {
  id: number;
  name: string;
  email: string;
  is_active: boolean | number;
  roles?: Array<{ id: number; name: string }>;
};

const emptyForm = {
  id: "",
  name: "",
  email: "",
  password: "",
  role: "siswa",
  is_active: "true",
};

export default function UsersAdminScreen() {
  const toast = useToast();
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  useEffect(() => {
    fetchRecords();
    fetchRoles();
  }, [selectedRoleFilter]);

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      const payload = response.data ?? response ?? [];
      setRoles(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error("Gagal memuat roles", error);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedRoleFilter !== "all") {
        params.role = selectedRoleFilter;
      }
      const response = await usersApi.getAll(params);
      const payload = response.data?.data ?? response.data ?? [];
      setRecords(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Periksa koneksi API backend."
      );
    }
    setIsLoading(false);
  };

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
    );
  }, [records, query]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode("create");
  };

  const openEdit = (item: UserRecord) => {
    const primaryRole = item.roles && item.roles.length > 0 ? item.roles[0].name : "siswa";
    setForm({
      id: String(item.id),
      name: item.name || "",
      email: item.email || "",
      password: "",
      role: primaryRole,
      is_active: item.is_active ? "true" : "false",
    });
    setModalMode("edit");
  };

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Nama lengkap wajib diisi";
    if (!form.email.trim()) return "Email wajib diisi";
    if (modalMode === "create" && !form.password.trim()) return "Kata sandi wajib diisi";
    if (modalMode === "create" && form.password.length < 6) return "Kata sandi minimal 6 karakter";
    if (modalMode === "edit" && form.password.trim() && form.password.length < 6)
      return "Kata sandi baru minimal 6 karakter";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error("Data Belum Lengkap: " + validationError);
      return;
    }

    setSubmitting(true);
    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active === "true",
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    try {
      if (modalMode === "create") {
        await usersApi.create(payload);
        toast.success("User berhasil ditambahkan.");
      } else {
        await usersApi.update(Number(form.id), payload);
        toast.success("User berhasil diperbarui.");
      }
      setModalMode(null);
      await fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: UserRecord) => {
    Alert.alert("Hapus User", `Apakah Anda yakin ingin menghapus user ${item.name}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await usersApi.delete(item.id);
            await fetchRecords();
            toast.success("User berhasil dihapus.");
          } catch (error: any) {
            toast.error(error.response?.data?.message || "User tidak dapat dihapus.");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Master Data User</Text>
        <Text style={styles.headerSubtitle}>Kelola akun pengguna, hak akses, dan status keaktifan login</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari user (nama/email)"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
          {!isMobile && <Text style={styles.addButtonText}>Tambah User</Text>}
        </TouchableOpacity>
      </View>

      {/* Roles Filter Selector */}
      {roles.length > 0 && (
        <View style={styles.filterBar}>
          <Ionicons name="filter-outline" size={16} color="#374151" style={{ marginRight: 2 }} />
          <Text style={styles.filterLabel}>Peran:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}
            style={{ flexGrow: 0 }}
          >
            <TouchableOpacity
              style={[styles.filterPill, selectedRoleFilter === "all" && styles.filterPillActive]}
              onPress={() => setSelectedRoleFilter("all")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedRoleFilter === "all" && styles.filterPillTextActive,
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.filterPill, selectedRoleFilter === r.name && styles.filterPillActive]}
                onPress={() => setSelectedRoleFilter(r.name)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedRoleFilter === r.name && styles.filterPillTextActive,
                  ]}
                >
                  {r.name.replace("_", " ").toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading && records.length === 0 ? (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom }]}>
          {isMobile ? (
            [1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton width={42} height={42} borderRadius={10} style={{ marginRight: 12 }} />
                <View style={styles.cardBody}>
                  <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                  <Skeleton width={50} height={10} borderRadius={4} />
                </View>
                <View style={styles.cardActions}>
                  <Skeleton width={34} height={34} borderRadius={8} />
                  <Skeleton width={34} height={34} borderRadius={8} />
                </View>
              </View>
            ))
          ) : (
            <View style={{ borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0" }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Nama Lengkap</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Email</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Peran (Role)</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Aksi</Text>
              </View>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={{ flex: 0.8 }}><Skeleton width={30} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 2.5 }}><Skeleton width={180} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 2.5 }}><Skeleton width={180} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 1.5 }}><Skeleton width={100} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 1.2, alignItems: "center" }}><Skeleton width={60} height={18} borderRadius={6} /></View>
                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <Skeleton width={34} height={34} borderRadius={8} />
                    <Skeleton width={34} height={34} borderRadius={8} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />}
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          ListHeaderComponent={
            !isMobile && filteredRecords.length > 0 ? (
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Nama Lengkap</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Email</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Peran (Role)</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Aksi</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {isLoading ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <Ionicons name="people-outline" size={48} color="#1E3A8A" />
                  <Text style={styles.emptyTitle}>User belum tersedia</Text>
                  <Text style={styles.emptyText}>Tarik untuk memuat ulang atau tambah user baru.</Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const roleName = item.roles && item.roles.length > 0 ? item.roles[0].name : "-";
            if (!isMobile) {
              return (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 0.8, fontWeight: "700" }]}>{item.id}</Text>
                  <Text style={[styles.tableCell, { flex: 2.5, fontWeight: "700", color: "#1E293B" }]}>
                    {item.name || "-"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2.5 }]}>{item.email || "-"}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textTransform: "uppercase", fontSize: 11, fontWeight: "700", color: "#4F46E5" }]}>
                    {roleName.replace("_", " ")}
                  </Text>
                  <View style={{ flex: 1.2, alignItems: "center" }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: item.is_active ? "#D1FAE5" : "#F3F4F6",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: item.is_active ? "#065F46" : "#6B7280",
                        }}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallButton} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="person-outline" size={22} color="#3B82F6" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.email}</Text>
                  <Text style={[styles.cardMeta, { color: "#4F46E5", fontWeight: "700" }]}>
                    Peran: {roleName.replace("_", " ").toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Status: </Text>
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 4,
                        backgroundColor: item.is_active ? "#D1FAE5" : "#F3F4F6",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: item.is_active ? "#065F46" : "#6B7280",
                        }}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallButton} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Form modal */}
      <Modal visible={!!modalMode} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "create" ? "Tambah" : "Edit"} User
              </Text>
              <TouchableOpacity onPress={() => setModalMode(null)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(text) => setField("name", text)}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(text) => setField("email", text)}
                  placeholder="name@siswa.smksrajasa.sch.id"
                  keyboardType="email-address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Kata Sandi {modalMode === "edit" && "(Kosongkan jika tidak diganti)"}
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={(text) => setField("password", text)}
                  placeholder={modalMode === "create" ? "Masukkan kata sandi" : "Masukkan kata sandi baru"}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peran Hak Akses (Role)</Text>
                <View style={styles.roleContainer}>
                  {roles.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.roleButton,
                        form.role === r.name && styles.roleButtonActive,
                      ]}
                      onPress={() => setField("role", r.name)}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          form.role === r.name && styles.roleButtonTextActive,
                        ]}
                      >
                        {r.name.replace("_", " ").toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status Keaktifan Akun</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.selectorPill, form.is_active === "true" && styles.selectorPillActive]}
                    onPress={() => setField("is_active", "true")}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        form.is_active === "true" && styles.selectorPillTextActive,
                      ]}
                    >
                      Aktif
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectorPill, form.is_active === "false" && styles.selectorPillActive]}
                    onPress={() => setField("is_active", "false")}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        form.is_active === "false" && styles.selectorPillTextActive,
                      ]}
                    >
                      Nonaktif
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalMode(null)}>
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Simpan</Text>
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
    backgroundColor: "#F3F4F6",
  },
  headerTitleContainer: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    backgroundColor: "transparent",
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
  },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
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
    fontSize: 14,
    color: "#111827",
  },
  addButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginRight: 8,
  },
  filterPills: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterPillActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterPillText: {
    fontSize: 11,
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
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
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
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  roleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  roleButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  selectorPill: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectorPillActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  selectorPillText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "700",
  },
  selectorPillTextActive: {
    color: "#fff",
  },
  modalFooter: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
});
