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
import { studentsApi, academicPeriodsApi, importExportApi } from "../../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../hooks/useToast";
import { showConfirm } from "../../../utils/alert";
import { useAuthStore } from "../../../store/authStore";
import Skeleton from "../../../components/ui/Skeleton";

type StudentRecord = {
  id: number;
  user_id?: number;
  class_id?: number | null;
  nis?: string;
  nisn?: string;
  full_name?: string;
  class?: { class_name?: string };
};

const emptyForm = {
  id: "",
  user_id: "",
  class_id: "",
  nis: "",
  nisn: "",
  full_name: "",
};

export default function StudentsAdminScreen() {
  const toast = useToast();
  const { user } = useAuthStore();
  const isWali = user?.roles?.includes("wali_kelas");
  const classNames = user?.teacher_info?.class_names || [];
  const initialQuery = isWali && classNames.length > 0 ? classNames[0] : "";

  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | number>("all");
  const [query, setQuery] = useState(initialQuery);
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
    loadPeriods();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const response = await academicPeriodsApi.getAll();
      const data = response.data ?? response ?? [];
      setPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal memuat periode akademik:", error);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedPeriodId !== "all") {
        params.academic_period_id = selectedPeriodId;
      }
      const response = await studentsApi.getAll(params);
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
        (item.full_name || "").toLowerCase().includes(term) ||
        (item.nis || "").toLowerCase().includes(term) ||
        (item.nisn || "").toLowerCase().includes(term) ||
        (item.class?.class_name || "").toLowerCase().includes(term)
    );
  }, [records, query]);

  const handleExportClick = async () => {
    try {
      const data = await importExportApi.export("students");
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ekspor_siswa_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Ekspor data siswa berhasil diunduh.");
    } catch (error) {
      toast.error("Gagal mengekspor data ke Excel.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const data = await importExportApi.template("students");
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `templat_impor_siswa.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Gagal mengunduh templat Excel.");
    }
  };

  const uploadExcel = async (file: File) => {
    setImporting(true);
    try {
      await importExportApi.import("students", file);
      setImportModalVisible(false);
      await fetchRecords();
      toast.success("Impor data Excel berhasil.");
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

  const openEdit = (item: StudentRecord) => {
    setForm({
      id: String(item.id),
      user_id: item.user_id ? String(item.user_id) : "",
      class_id: item.class_id ? String(item.class_id) : "",
      nis: item.nis || "",
      nisn: item.nisn || "",
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
      return "ID Pengguna wajib diisi karena sistem membutuhkannya";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error("Data Belum Lengkap: " + validationError);
      return;
    }

    setSubmitting(true);
    const payload = {
      ...(modalMode === "create" ? { user_id: Number(form.user_id) } : {}),
      class_id: form.class_id ? Number(form.class_id) : null,
      full_name: form.full_name.trim(),
      nis: form.nis.trim() || null,
      nisn: form.nisn.trim() || null,
    };

    try {
      if (modalMode === "create") {
        await studentsApi.create(payload);
        toast.success("Siswa berhasil ditambahkan.");
      } else {
        await studentsApi.update(Number(form.id), payload);
        toast.success("Siswa berhasil diperbarui.");
      }
      setModalMode(null);
      await fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan data siswa.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: StudentRecord) => {
    showConfirm("Hapus Siswa", `Hapus data siswa ${item.full_name}?`, async () => {
      try {
        await studentsApi.delete(item.id);
        await fetchRecords();
        toast.success("Siswa berhasil dihapus.");
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Data siswa tidak dapat dihapus.");
      }
    });
  };

  const handleResetDevice = (item: StudentRecord) => {
    showConfirm("Reset Perangkat", `Reset kunci perangkat untuk siswa ${item.full_name}? Siswa akan dapat mendaftarkan perangkat HP baru saat melakukan absensi berikutnya.`, async () => {
      try {
        await studentsApi.resetDevice(item.id);
        toast.success("Kunci perangkat berhasil di-reset.");
        await fetchRecords();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Gagal mereset perangkat.");
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Master Data Siswa</Text>
        <Text style={styles.headerSubtitle}>Kelola informasi biodata siswa, NIS/NISN, dan kelas belajar</Text>
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
            placeholder="Cari siswa"
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

      {/* Period Filter Selector */}
      {periods.length > 0 && (
        <View style={styles.filterBar}>
          <Ionicons name="filter-outline" size={16} color="#374151" style={{ marginRight: 2 }} />
          <Text style={styles.filterLabel}>Periode:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}
            style={{ flexGrow: 0 }}
          >
            <TouchableOpacity
              style={[styles.filterPill, selectedPeriodId === "all" && styles.filterPillActive]}
              onPress={() => setSelectedPeriodId("all")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedPeriodId === "all" && styles.filterPillTextActive,
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterPill, selectedPeriodId === p.id && styles.filterPillActive]}
                onPress={() => setSelectedPeriodId(p.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedPeriodId === p.id && styles.filterPillTextActive,
                  ]}
                >
                  {p.name} {p.is_active ? "(Aktif)" : ""}
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
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Kelas</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>NIS</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>NISN</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Aksi</Text>
              </View>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={{ flex: 0.8 }}><Skeleton width={30} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 2.5 }}><Skeleton width={180} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 1.5 }}><Skeleton width={80} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 1.5 }}><Skeleton width={90} height={14} borderRadius={4} /></View>
                  <View style={{ flex: 1.5 }}><Skeleton width={90} height={14} borderRadius={4} /></View>
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
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Kelas</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>NIS</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>NISN</Text>
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
                  <Ionicons name="school-outline" size={48} color="#1E3A8A" />
                  <Text style={styles.emptyTitle}>Data siswa belum tersedia</Text>
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
                  <Text style={[styles.tableCell, { flex: 2.5, fontWeight: "700", color: "#1E293B" }]}>
                    {item.full_name || "-"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.class?.class_name || "-"}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.nis || "-"}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.nisn || "-"}</Text>
                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => handleResetDevice(item)}>
                      <Ionicons name="phone-portrait-outline" size={16} color="#F59E0B" />
                    </TouchableOpacity>
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
                  <Ionicons name="school-outline" size={22} color="#3B82F6" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.full_name || "-"}</Text>
                  <Text style={styles.cardSubtitle}>
                    {[item.nis ? `NIS ${item.nis}` : null, item.class?.class_name]
                      .filter(Boolean)
                      .join(" | ") || "Siswa"}
                  </Text>
                  <Text style={styles.cardMeta}>ID: {item.id}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => handleResetDevice(item)}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#F59E0B" />
                  </TouchableOpacity>
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

      {/* Input Modal */}
      <Modal visible={!!modalMode} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalMode === "create" ? "Tambah" : "Edit"} Siswa</Text>
              <TouchableOpacity onPress={() => setModalMode(null)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {modalMode === "create" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ID Pengguna</Text>
                  <TextInput
                    style={styles.input}
                    value={form.user_id}
                    onChangeText={(text) => setField("user_id", text)}
                    keyboardType="numeric"
                    placeholder="Masukkan ID Pengguna login"
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
                <Text style={styles.inputLabel}>ID Kelas</Text>
                <TextInput
                  style={styles.input}
                  value={form.class_id}
                  onChangeText={(text) => setField("class_id", text)}
                  keyboardType="numeric"
                  placeholder="Masukkan ID Kelas"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIS</Text>
                <TextInput
                  style={styles.input}
                  value={form.nis}
                  onChangeText={(text) => setField("nis", text)}
                  placeholder="Masukkan NIS siswa"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NISN</Text>
                <TextInput
                  style={styles.input}
                  value={form.nisn}
                  onChangeText={(text) => setField("nisn", text)}
                  placeholder="Masukkan NISN siswa"
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Impor Data Excel - Siswa</Text>
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
                    toast.info("Unggahan berkas Excel hanya didukung pada mode desktop/web.");
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
