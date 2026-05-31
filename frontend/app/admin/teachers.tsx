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
import { teachersApi, importExportApi } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../hooks/useToast";

type TeacherRecord = {
  id: number;
  user_id?: number;
  nip?: string;
  full_name?: string;
};

const emptyForm = {
  id: "",
  user_id: "",
  nip: "",
  full_name: "",
};

export default function TeachersAdminScreen() {
  const toast = useToast();
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await teachersApi.getAll();
      const payload = response.data?.data ?? response.data ?? [];
      setRecords(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      Alert.alert(
        "Gagal Memuat Data",
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
        (item.full_name || "").toLowerCase().includes(term) ||
        (item.nip || "").toLowerCase().includes(term)
    );
  }, [records, query]);

  const handleExportClick = async () => {
    try {
      const data = await importExportApi.export("teachers");
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ekspor_guru_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      Alert.alert("Sukses", "Ekspor data guru berhasil diunduh.");
    } catch (error) {
      Alert.alert("Gagal", "Gagal mengekspor data ke Excel.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const data = await importExportApi.template("teachers");
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `templat_impor_guru.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Alert.alert("Gagal", "Gagal mengunduh templat Excel.");
    }
  };

  const uploadExcel = async (file: File) => {
    setImporting(true);
    try {
      await importExportApi.import("teachers", file);
      setImportModalVisible(false);
      await fetchRecords();
      toast.success("Import data Excel berhasil.");
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Gagal mengimpor berkas Excel.";
      const details = error.response?.data?.errors;
      if (details && Array.isArray(details)) {
        toast.error(errorMsg + "\n\nDetail:\n" + details.join("\n"));
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setImporting(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode("create");
  };

  const openEdit = (item: TeacherRecord) => {
    setForm({
      id: String(item.id),
      user_id: item.user_id ? String(item.user_id) : "",
      nip: item.nip || "",
      full_name: item.full_name || "",
    });
    setModalMode("edit");
  };

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return "Nama lengkap wajib diisi";
    if (modalMode === "create" && !Number(form.user_id))
      return "User ID wajib diisi karena backend membutuhkannya";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Data Belum Lengkap", validationError);
      return;
    }

    setSubmitting(true);
    const payload = {
      ...(modalMode === "create" ? { user_id: Number(form.user_id) } : {}),
      full_name: form.full_name.trim(),
      nip: form.nip.trim() || null,
    };

    try {
      if (modalMode === "create") {
        await teachersApi.create(payload);
        toast.success("Guru berhasil ditambahkan.");
      } else {
        await teachersApi.update(Number(form.id), payload);
        toast.success("Guru berhasil diperbarui.");
      }
      setModalMode(null);
      await fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan data guru.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: TeacherRecord) => {
    Alert.alert("Hapus Guru", `Hapus data guru ${item.full_name}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await teachersApi.delete(item.id);
            await fetchRecords();
            toast.success("Guru berhasil dihapus.");
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Data guru tidak dapat dihapus.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Image
        source={
          isMobile
            ? require("../../assets/images/wallpaper-app-mobile.png")
            : require("../../assets/images/wallpaper-app-desktop.png")
        }
        style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(243, 244, 246, 0.85)", width: "100%", height: "100%" },
        ]}
      />

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Master Data Guru</Text>
        <Text style={styles.headerSubtitle}>Kelola informasi biodata guru pengajar, NIP, dan penugasan</Text>
      </View>

      {Platform.OS === "web" && (
        <input
          type="file"
          id="excel-file-input"
          style={{ display: "none" }}
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadExcel(file);
            }
          }}
        />
      )}

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari guru (nama/NIP)"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: "#10B981" }]}
          onPress={handleExportClick}
        >
          <Ionicons name="cloud-download-outline" size={18} color="#fff" />
          {!isMobile && <Text style={styles.toolbarButtonText}>Ekspor</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: "#8B5CF6" }]}
          onPress={() => setImportModalVisible(true)}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          {!isMobile && <Text style={styles.toolbarButtonText}>Impor</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />}
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        ListHeaderComponent={
          !isMobile && filteredRecords.length > 0 ? (
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Nama Lengkap</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>NIP</Text>
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
                <Text style={styles.emptyTitle}>Data guru belum tersedia</Text>
                <Text style={styles.emptyText}>Tarik untuk memuat ulang atau tambah data baru.</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (!isMobile) {
            return (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.8, fontWeight: "700" }]}>{item.id}</Text>
                <Text style={[styles.tableCell, { flex: 3, fontWeight: "700", color: "#1E293B" }]}>
                  {item.full_name || "-"}
                </Text>
                <Text style={[styles.tableCell, { flex: 2.2 }]}>{item.nip || "-"}</Text>
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
                <Ionicons name="people-outline" size={22} color="#3B82F6" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.full_name || "-"}</Text>
                <Text style={styles.cardSubtitle}>{item.nip ? `NIP ${item.nip}` : "Guru"}</Text>
                <Text style={styles.cardMeta}>ID: {item.id}</Text>
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

      {/* Input Modal */}
      <Modal visible={!!modalMode} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalMode === "create" ? "Tambah" : "Edit"} Guru</Text>
              <TouchableOpacity onPress={() => setModalMode(null)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {modalMode === "create" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>User ID</Text>
                  <TextInput
                    style={styles.input}
                    value={form.user_id}
                    onChangeText={(text) => setField("user_id", text)}
                    keyboardType="numeric"
                    placeholder="Masukkan ID User login"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <TextInput
                  style={styles.input}
                  value={form.full_name}
                  onChangeText={(text) => setField("full_name", text)}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIP</Text>
                <TextInput
                  style={styles.input}
                  value={form.nip}
                  onChangeText={(text) => setField("nip", text)}
                  placeholder="Masukkan NIP guru"
                  placeholderTextColor="#9CA3AF"
                />
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

      {/* Import Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Impor Data Excel - Guru</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, { paddingVertical: 24, gap: 20 }]}>
              <Text style={{ fontSize: 13, color: "#4B5563", lineHeight: 20, fontWeight: "600" }}>
                Silakan unduh templat Excel terlebih dahulu agar struktur kolom data Anda sesuai dengan yang dibutuhkan sistem. Setelah itu, isi data Anda dan unggah berkasnya di bawah ini.
              </Text>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    flexDirection: "row",
                    gap: 8,
                    minHeight: 48,
                    backgroundColor: "#EFF6FF",
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  },
                ]}
                onPress={handleDownloadTemplate}
              >
                <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                <Text style={{ color: "#2563EB", fontWeight: "800" }}>Unduh Templat Excel</Text>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 4 }} />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flexDirection: "row", gap: 8, minHeight: 52, backgroundColor: "#8B5CF6" },
                ]}
                onPress={() => {
                  if (Platform.OS === "web") {
                    document.getElementById("excel-file-input")?.click();
                  } else {
                    Alert.alert("Info", "Unggahan berkas Excel hanya didukung pada mode desktop/web.");
                  }
                }}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "800" }}>Pilih & Unggah Berkas Excel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setImportModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Tutup</Text>
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
  toolbarButton: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toolbarButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#9CA3AF",
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
