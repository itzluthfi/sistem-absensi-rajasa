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
import {
  classesApi,
  studentsApi,
  teachersApi,
  academicPeriodsApi,
  schedulesApi,
  importExportApi,
} from "../../services/api";

import { useSafeAreaInsets } from "react-native-safe-area-context";

type DataType = "students" | "teachers" | "classes" | "schedules" | "academicPeriods";

type DataRecord = {
  id: number;
  full_name?: string;
  class_name?: string;
  academic_year?: string;
  nis?: string;
  nisn?: string;
  nip?: string;
  user_id?: number;
  class_id?: number | null;
  major_id?: number;
  homeroom_teacher_id?: number | null;
  class?: { class_name?: string };
  major?: { major_name?: string };
  homeroom_teacher?: { full_name?: string };

  // Schedule-specific fields
  subject_id?: number;
  teacher_id?: number;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  room?: string | null;
  subject?: { subject_name?: string };
  teacher?: { full_name?: string };

  // Academic Period specific fields
  name?: string;
  semester?: "ganjil" | "genap";
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
};

const tabs: Array<{
  key: DataType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "students", label: "Siswa", icon: "school-outline" },
  { key: "teachers", label: "Guru", icon: "people-outline" },
  { key: "classes", label: "Kelas", icon: "business-outline" },
  { key: "schedules", label: "Jadwal", icon: "calendar-outline" },
  { key: "academicPeriods", label: "Tahun Ajaran", icon: "calendar-number-outline" },
];

const apiMap = {
  students: studentsApi,
  teachers: teachersApi,
  classes: classesApi,
  schedules: schedulesApi,
  academicPeriods: academicPeriodsApi,
};

const emptyForm = {
  id: "",
  user_id: "",
  class_id: "",
  major_id: "",
  homeroom_teacher_id: "",
  full_name: "",
  class_name: "",
  academic_year: "",
  nis: "",
  nisn: "",
  nip: "",

  // Schedules
  subject_id: "",
  teacher_id: "",
  day_of_week: "1",
  start_time: "07:00",
  end_time: "08:30",
  room: "",

  // Academic Periods
  name: "",
  semester: "ganjil" as "ganjil" | "genap",
  start_date: "",
  end_date: "",
  is_active: "false",
};


export default function MasterDataScreen() {
  const [activeType, setActiveType] = useState<DataType>("students");
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | number>(
    "all",
  );

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExportClick = async () => {
    try {
      const mappedType = activeType === "academicPeriods" ? "academic-periods" : activeType;
      const data = await importExportApi.export(mappedType);
      const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ekspor_${activeType}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      Alert.alert("Sukses", "Ekspor data berhasil diunduh.");
    } catch (error) {
      Alert.alert("Gagal", "Gagal mengekspor data ke Excel.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const mappedType = activeType === "academicPeriods" ? "academic-periods" : activeType;
      const data = await importExportApi.template(mappedType);
      const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `templat_impor_${activeType}.xlsx`);
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
      const mappedType = activeType === "academicPeriods" ? "academic-periods" : activeType;
      await importExportApi.import(mappedType, file);
      setImportModalVisible(false);
      await fetchRecords();
      Alert.alert("Sukses", "Data berhasil diimpor!");
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Gagal mengimpor berkas Excel.";
      const details = error.response?.data?.errors;
      if (details && Array.isArray(details)) {
        Alert.alert("Gagal Impor (Detail)", errorMsg + "\n\nDetail:\n" + details.join("\n"));
      } else {
        Alert.alert("Gagal", errorMsg);
      }
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const response = await academicPeriodsApi.getAll();
      const data = response.data ?? response ?? [];
      setPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load periods:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeType, selectedPeriodId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (
        (activeType === "classes" || activeType === "students") &&
        selectedPeriodId !== "all"
      ) {
        params.academic_period_id = selectedPeriodId;
      }
      const response = await apiMap[activeType].getAll(params);
      const payload = response.data?.data ?? response.data ?? [];
      setRecords(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      Alert.alert(
        "Gagal Memuat Data",
        error.response?.data?.message || "Periksa koneksi API backend.",
      );
    }
    setIsLoading(false);
  };

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter(
      (item) =>
        getTitle(item).toLowerCase().includes(term) ||
        getSubtitle(item).toLowerCase().includes(term),
    );
  }, [records, query, activeType]);

  const getTitle = (item: DataRecord) => {
    if (activeType === "classes") return item.class_name || `Kelas #${item.id}`;
    if (activeType === "schedules") return item.subject?.subject_name || `Jadwal #${item.id}`;
    if (activeType === "academicPeriods") return item.name || `Periode #${item.id}`;
    return item.full_name || `Data #${item.id}`;
  };

  const getSubtitle = (item: DataRecord) => {
    if (activeType === "students") {
      return (
        [item.nis ? `NIS ${item.nis}` : null, item.class?.class_name]
          .filter(Boolean)
          .join(" | ") || "Siswa"
      );
    }
    if (activeType === "teachers") {
      return item.nip ? `NIP ${item.nip}` : "Guru";
    }
    if (activeType === "schedules") {
      const days = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const dayName = days[Number(item.day_of_week)] || "Hari";
      return (
        [
          dayName,
          `${item.start_time?.substring(0, 5)} - ${item.end_time?.substring(0, 5)}`,
          item.class?.class_name,
          item.teacher?.full_name,
          item.room ? `Ruang ${item.room}` : null
        ]
          .filter(Boolean)
          .join(" | ") || "Jadwal"
      );
    }
    if (activeType === "academicPeriods") {
      return (
        [
          item.academic_year,
          item.semester ? `Semester ${item.semester}` : null,
          item.is_active ? "Status: Aktif" : "Status: Nonaktif"
        ]
          .filter(Boolean)
          .join(" | ") || "Tahun Ajaran"
      );
    }
    return (
      [
        item.academic_year,
        item.major?.major_name,
        item.homeroom_teacher?.full_name,
      ]
        .filter(Boolean)
        .join(" | ") || "Kelas"
    );
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode("create");
  };

  const openEdit = (item: DataRecord) => {
    setForm({
      ...emptyForm,
      id: String(item.id),
      user_id: item.user_id ? String(item.user_id) : "",
      class_id: item.class_id ? String(item.class_id) : "",
      major_id: item.major_id ? String(item.major_id) : "",
      homeroom_teacher_id: item.homeroom_teacher_id
        ? String(item.homeroom_teacher_id)
        : "",
      full_name: item.full_name || "",
      class_name: item.class_name || "",
      academic_year: item.academic_year || "",
      nis: item.nis || "",
      nisn: item.nisn || "",
      nip: item.nip || "",

      // Schedules
      subject_id: item.subject_id ? String(item.subject_id) : "",
      teacher_id: item.teacher_id ? String(item.teacher_id) : "",
      day_of_week: item.day_of_week ? String(item.day_of_week) : "1",
      start_time: item.start_time ? item.start_time.substring(0, 5) : "07:00",
      end_time: item.end_time ? item.end_time.substring(0, 5) : "08:30",
      room: item.room || "",

      // Academic Periods
      name: item.name || "",
      semester: item.semester || "ganjil",
      start_date: item.start_date ? String(item.start_date).substring(0, 10) : "",
      end_date: item.end_date ? String(item.end_date).substring(0, 10) : "",
      is_active: item.is_active ? "true" : "false",
    });
    setModalMode("edit");
  };

  const setField = (key: keyof typeof emptyForm, value: string | any) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildPayload = () => {
    if (activeType === "students") {
      return {
        ...(modalMode === "create" ? { user_id: Number(form.user_id) } : {}),
        class_id: form.class_id ? Number(form.class_id) : null,
        full_name: form.full_name.trim(),
        nis: form.nis.trim() || null,
        nisn: form.nisn.trim() || null,
      };
    }

    if (activeType === "teachers") {
      return {
        ...(modalMode === "create" ? { user_id: Number(form.user_id) } : {}),
        full_name: form.full_name.trim(),
        nip: form.nip.trim() || null,
      };
    }

    if (activeType === "schedules") {
      return {
        subject_id: Number(form.subject_id),
        class_id: Number(form.class_id),
        teacher_id: Number(form.teacher_id),
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time.trim(),
        end_time: form.end_time.trim(),
        room: form.room.trim() || null,
      };
    }

    if (activeType === "academicPeriods") {
      return {
        name: form.name.trim(),
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        start_date: form.start_date.trim(),
        end_date: form.end_date.trim(),
        is_active: form.is_active === "true",
      };
    }

    return {
      ...(modalMode === "create" ? { major_id: Number(form.major_id) } : {}),
      homeroom_teacher_id: form.homeroom_teacher_id
        ? Number(form.homeroom_teacher_id)
        : null,
      class_name: form.class_name.trim(),
      academic_year: form.academic_year.trim() || null,
    };
  };

  const validateForm = () => {
    if (activeType === "classes") {
      if (!form.class_name.trim()) return "Nama kelas wajib diisi";
      if (modalMode === "create" && !Number(form.major_id))
        return "Major ID wajib diisi karena backend membutuhkannya";
      return null;
    }

    if (activeType === "schedules") {
      if (!Number(form.subject_id)) return "Mata Pelajaran (Subject ID) wajib diisi";
      if (!Number(form.class_id)) return "Kelas (Class ID) wajib diisi";
      if (!Number(form.teacher_id)) return "Guru (Teacher ID) wajib diisi";
      if (!form.start_time.trim()) return "Jam mulai wajib diisi";
      if (!form.end_time.trim()) return "Jam selesai wajib diisi";
      return null;
    }

    if (activeType === "academicPeriods") {
      if (!form.name.trim()) return "Nama periode wajib diisi";
      if (!form.academic_year.trim()) return "Tahun ajaran wajib diisi (contoh: 2025/2026)";
      if (!form.start_date.trim()) return "Tanggal mulai wajib diisi (Format YYYY-MM-DD)";
      if (!form.end_date.trim()) return "Tanggal selesai wajib diisi (Format YYYY-MM-DD)";
      return null;
    }

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
    try {
      if (modalMode === "create") {
        await apiMap[activeType].create(buildPayload());
      } else {
        await apiMap[activeType].update(Number(form.id), buildPayload());
      }
      setModalMode(null);
      await fetchRecords();
      Alert.alert(
        "Berhasil",
        modalMode === "create"
          ? "Data berhasil ditambahkan"
          : "Data berhasil diperbarui",
      );
    } catch (error: any) {
      Alert.alert(
        "Gagal Menyimpan",
        error.response?.data?.message || "Periksa field dan hak akses akun.",
      );
    }
    setSubmitting(false);
  };

  const handleDelete = (item: DataRecord) => {
    Alert.alert("Hapus Data", `Hapus ${getTitle(item)}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await apiMap[activeType].delete(item.id);
            await fetchRecords();
          } catch (error: any) {
            Alert.alert(
              "Gagal Menghapus",
              error.response?.data?.message || "Data tidak dapat dihapus.",
            );
          }
        },
      },
    ]);
  };

  const renderForm = () => (
    <Modal visible={!!modalMode} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalMode === "create" ? "Tambah" : "Edit"}{" "}
              {tabs.find((item) => item.key === activeType)?.label}
            </Text>
            <TouchableOpacity
              onPress={() => setModalMode(null)}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {activeType === "schedules" ? (
              <>
                <Input
                  label="Subject ID (Mata Pelajaran)"
                  value={form.subject_id}
                  onChangeText={(text) => setField("subject_id", text)}
                  keyboardType="numeric"
                  placeholder="Masukkan ID Mata Pelajaran"
                />
                <Input
                  label="Class ID (Kelas)"
                  value={form.class_id}
                  onChangeText={(text) => setField("class_id", text)}
                  keyboardType="numeric"
                  placeholder="Masukkan ID Kelas"
                />
                <Input
                  label="Teacher ID (Guru)"
                  value={form.teacher_id}
                  onChangeText={(text) => setField("teacher_id", text)}
                  keyboardType="numeric"
                  placeholder="Masukkan ID Guru"
                />
                <Input
                  label="Hari Ke (1 = Senin, 2 = Selasa, dst)"
                  value={form.day_of_week}
                  onChangeText={(text) => setField("day_of_week", text)}
                  keyboardType="numeric"
                  placeholder="1 (Senin) - 7 (Minggu)"
                />
                <Input
                  label="Jam Mulai"
                  value={form.start_time}
                  onChangeText={(text) => setField("start_time", text)}
                  placeholder="Format H:i e.g., 07:00"
                />
                <Input
                  label="Jam Selesai"
                  value={form.end_time}
                  onChangeText={(text) => setField("end_time", text)}
                  placeholder="Format H:i e.g., 08:30"
                />
                <Input
                  label="Ruangan (Optional)"
                  value={form.room}
                  onChangeText={(text) => setField("room", text)}
                  placeholder="Contoh: R. Laboratorium"
                />
              </>
            ) : activeType === "academicPeriods" ? (
              <>
                <Input
                  label="Nama Periode"
                  value={form.name}
                  onChangeText={(text) => setField("name", text)}
                  placeholder="Contoh: Semester Ganjil 2025/2026"
                />
                <Input
                  label="Tahun Ajaran"
                  value={form.academic_year}
                  onChangeText={(text) => setField("academic_year", text)}
                  placeholder="Contoh: 2025/2026"
                />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Semester</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.selectorPill,
                        form.semester === "ganjil" && styles.selectorPillActive,
                      ]}
                      onPress={() => setField("semester", "ganjil")}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          form.semester === "ganjil" && styles.selectorPillTextActive,
                        ]}
                      >
                        Ganjil
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectorPill,
                        form.semester === "genap" && styles.selectorPillActive,
                      ]}
                      onPress={() => setField("semester", "genap")}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          form.semester === "genap" && styles.selectorPillTextActive,
                        ]}
                      >
                        Genap
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  label="Tanggal Mulai"
                  value={form.start_date}
                  onChangeText={(text) => setField("start_date", text)}
                  placeholder="YYYY-MM-DD"
                />
                <Input
                  label="Tanggal Selesai"
                  value={form.end_date}
                  onChangeText={(text) => setField("end_date", text)}
                  placeholder="YYYY-MM-DD"
                />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status Aktif</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.selectorPill,
                        form.is_active === "true" && styles.selectorPillActive,
                      ]}
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
                      style={[
                        styles.selectorPill,
                        form.is_active === "false" && styles.selectorPillActive,
                      ]}
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
              </>
            ) : activeType === "classes" ? (
              <>
                {modalMode === "create" && (
                  <Input
                    label="Major ID"
                    value={form.major_id}
                    onChangeText={(text) => setField("major_id", text)}
                    keyboardType="numeric"
                  />
                )}
                <Input
                  label="Nama Kelas"
                  value={form.class_name}
                  onChangeText={(text) => setField("class_name", text)}
                />
                <Input
                  label="Tahun Ajaran"
                  value={form.academic_year}
                  onChangeText={(text) => setField("academic_year", text)}
                  placeholder="2025/2026"
                />
                <Input
                  label="Homeroom Teacher ID"
                  value={form.homeroom_teacher_id}
                  onChangeText={(text) => setField("homeroom_teacher_id", text)}
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                {modalMode === "create" && (
                  <Input
                    label="User ID"
                    value={form.user_id}
                    onChangeText={(text) => setField("user_id", text)}
                    keyboardType="numeric"
                  />
                )}
                <Input
                  label="Nama Lengkap"
                  value={form.full_name}
                  onChangeText={(text) => setField("full_name", text)}
                />
                {activeType === "students" ? (
                  <>
                    <Input
                      label="Class ID"
                      value={form.class_id}
                      onChangeText={(text) => setField("class_id", text)}
                      keyboardType="numeric"
                    />
                    <Input
                      label="NIS"
                      value={form.nis}
                      onChangeText={(text) => setField("nis", text)}
                    />
                    <Input
                      label="NISN"
                      value={form.nisn}
                      onChangeText={(text) => setField("nisn", text)}
                    />
                  </>
                ) : (
                  <Input
                    label="NIP"
                    value={form.nip}
                    onChangeText={(text) => setField("nip", text)}
                  />
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setModalMode(null)}
            >
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
  );

  const renderImportModal = () => (
    <Modal visible={importModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Impor Data Excel - {tabs.find((item) => item.key === activeType)?.label}
            </Text>
            <TouchableOpacity
              onPress={() => setImportModalVisible(false)}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalBody, { paddingVertical: 24, gap: 20 }]}>
            <Text style={{ fontSize: 14, color: "#4B5563", lineHeight: 20, fontWeight: "600" }}>
              Silakan unduh templat Excel terlebih dahulu agar struktur kolom data Anda sesuai dengan yang dibutuhkan sistem. Setelah itu, isi data Anda dan unggah berkasnya di bawah ini.
            </Text>

            <TouchableOpacity
              style={[styles.secondaryButton, { flexDirection: "row", gap: 8, minHeight: 48, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" }]}
              onPress={handleDownloadTemplate}
            >
              <Ionicons name="document-text-outline" size={20} color="#2563EB" />
              <Text style={{ color: "#2563EB", fontWeight: "800" }}>Unduh Templat Excel</Text>
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: "#E5E7EB",
                marginVertical: 4,
              }}
            />

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
      <View
        style={[
          styles.segment,
          {
            backgroundColor: "transparent",
            borderBottomColor: "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.segmentItem,
              activeType === tab.key && styles.segmentItemActive,
            ]}
            onPress={() => {
              setActiveType(tab.key);
              setQuery("");
            }}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeType === tab.key ? "#fff" : "#6B7280"}
            />
            <Text
              style={[
                styles.segmentText,
                activeType === tab.key && styles.segmentTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            placeholder="Cari data"
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
      {(activeType === "classes" || activeType === "students") &&
        periods.length > 0 && (
          <View style={styles.filterBar}>
            <Ionicons
              name="filter-outline"
              size={16}
              color="#374151"
              style={{ marginRight: 2 }}
            />
            <Text style={styles.filterLabel}>Periode:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPills}
              style={{ flexGrow: 0 }}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedPeriodId === "all" && styles.filterPillActive,
                ]}
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
                  style={[
                    styles.filterPill,
                    selectedPeriodId === p.id && styles.filterPillActive,
                  ]}
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

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        ListHeaderComponent={
          !isMobile && filteredRecords.length > 0 ? (
            <View style={styles.tableHeader}>
              {activeType === "students" && (
                <>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>
                    Nama Lengkap
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Kelas
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    NIS
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    NISN
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Aksi
                  </Text>
                </>
              )}
              {activeType === "teachers" && (
                <>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 3 }]}>
                    Nama Lengkap
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                    NIP
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Aksi
                  </Text>
                </>
              )}
              {activeType === "classes" && (
                <>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                    Nama Kelas
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                    Jurusan
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                    Wali Kelas
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Tahun Ajaran
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Aksi
                  </Text>
                </>
              )}
              {activeType === "schedules" && (
                <>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                    Mata Pelajaran
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Kelas
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                    Guru Pengajar
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Waktu & Ruang
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Aksi
                  </Text>
                </>
              )}
              {activeType === "academicPeriods" && (
                <>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                    ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                    Nama Periode
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Tahun Ajaran
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                    Semester
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Mulai
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    Selesai
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "center" }]}>
                    Status
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Aksi
                  </Text>
                </>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <>
                <Ionicons name="file-tray-outline" size={48} color="#1E3A8A" />
                <Text style={styles.emptyTitle}>Data belum tersedia</Text>
                <Text style={styles.emptyText}>
                  Tarik untuk memuat ulang atau tambah data baru.
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (!isMobile) {
            return (
              <View style={styles.tableRow}>
                {activeType === "students" && (
                  <>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 0.8, fontWeight: "700" },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2.5, fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {item.full_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.class?.class_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.nis || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.nisn || "-"}
                    </Text>
                  </>
                )}
                {activeType === "teachers" && (
                  <>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 0.8, fontWeight: "700" },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 3, fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {item.full_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2.2 }]}>
                      {item.nip || "-"}
                    </Text>
                  </>
                )}
                {activeType === "classes" && (
                  <>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 0.8, fontWeight: "700" },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2, fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {item.class_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {item.major?.major_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2.2 }]}>
                      {item.homeroom_teacher?.full_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.academic_year || "-"}
                    </Text>
                  </>
                )}
                {activeType === "schedules" && (
                  <>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 0.8, fontWeight: "700" },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2, fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {item.subject?.subject_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.class?.class_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2.2 }]}>
                      {item.teacher?.full_name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {(() => {
                        const days = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
                        const dayName = days[Number(item.day_of_week)] || "Hari";
                        return `${dayName}, ${item.start_time?.substring(0, 5)}-${item.end_time?.substring(0, 5)}${item.room ? ` (${item.room})` : ""}`;
                      })()}
                    </Text>
                  </>
                )}
                {activeType === "academicPeriods" && (
                  <>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 0.8, fontWeight: "700" },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2.2, fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {item.name || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.academic_year || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textTransform: "capitalize" }]}>
                      {item.semester || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.start_date ? String(item.start_date).substring(0, 10) : "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {item.end_date ? String(item.end_date).substring(0, 10) : "-"}
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
                  </>
                )}
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name={
                    tabs.find((tab) => tab.key === activeType)?.icon ||
                    "document-outline"
                  }
                  size={22}
                  color="#3B82F6"
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{getTitle(item)}</Text>
                <Text style={styles.cardSubtitle}>{getSubtitle(item)}</Text>
                <Text style={styles.cardMeta}>ID: {item.id}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => openEdit(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {renderForm()}
      {renderImportModal()}
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder || label}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
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
  segment: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: "#3B82F6",
  },
  segmentText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#fff",
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
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 7,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#111827",
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#374151",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterPills: {
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontWeight: "700",
    color: "#4B5563",
  },
  filterPillTextActive: {
    color: "#fff",
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
    marginTop: 10,
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
});
