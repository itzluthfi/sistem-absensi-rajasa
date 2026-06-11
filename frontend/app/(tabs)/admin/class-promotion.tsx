import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { classesApi, studentsApi } from "../../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../hooks/useToast";
import Skeleton from "../../../components/ui/Skeleton";

type ClassRecord = {
  id: number;
  class_name?: string;
  academic_year?: string;
  major?: { major_name?: string };
};

type StudentRecord = {
  id: number;
  full_name: string;
  nis: string;
  nisn?: string;
};

export default function ClassPromotionScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;

  // Data States
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Selection States
  const [sourceClass, setSourceClass] = useState<ClassRecord | null>(null);
  const [targetClass, setTargetClass] = useState<ClassRecord | null>(null);

  // UI/Loading States
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Modal & Search States
  const [classModalType, setClassModalType] = useState<"source" | "target" | null>(null);
  const [searchClassQuery, setSearchClassQuery] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (sourceClass) {
      fetchStudents(sourceClass.id);
    } else {
      setStudents([]);
      setSelectedStudentIds([]);
    }
  }, [sourceClass]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await classesApi.getAll();
      const payload = res.data?.data ?? res.data ?? [];
      setClasses(Array.isArray(payload) ? payload : []);
    } catch (e) {
      toast.error("Gagal memuat daftar kelas dari server.");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudents = async (classId: number) => {
    setLoadingStudents(true);
    try {
      const res = await studentsApi.getAll({ class_id: classId, all: true });
      const payload = res.data ?? res ?? [];
      const studentList = Array.isArray(payload) ? payload : [];
      setStudents(studentList);
      // Default: Check all students
      setSelectedStudentIds(studentList.map((s) => s.id));
    } catch (e) {
      toast.error("Gagal memuat daftar siswa kelas terpilih.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const handlePromote = () => {
    if (!sourceClass) {
      toast.error("Pilih Kelas Asal terlebih dahulu.");
      return;
    }
    if (!targetClass) {
      toast.error("Pilih Kelas Tujuan terlebih dahulu.");
      return;
    }
    if (sourceClass.id === targetClass.id) {
      toast.error("Kelas Asal dan Kelas Tujuan tidak boleh sama.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error("Pilih minimal satu siswa untuk dipindahkan.");
      return;
    }

    const message = `Pindahkan ${selectedStudentIds.length} siswa dari kelas ${sourceClass.class_name} ke kelas ${targetClass.class_name}?`;

    if (Platform.OS === "web") {
      const confirmAction = window.confirm(message);
      if (confirmAction) {
        executePromotion();
      }
    } else {
      Alert.alert("Konfirmasi Kenaikan Kelas", message, [
        { text: "Batal", style: "cancel" },
        { text: "Pindahkan", style: "default", onPress: executePromotion },
      ]);
    }
  };

  const executePromotion = async () => {
    if (!targetClass) return;
    setPromoting(true);
    try {
      const payload = {
        student_ids: selectedStudentIds,
        target_class_id: targetClass.id,
      };
      const res = await studentsApi.promoteBulk(payload);
      if (res.success) {
        toast.success(res.message || "Pemindahan kelas siswa berhasil dilakukan.");
        // Reload students for the source class (should now be empty or reduced)
        if (sourceClass) {
          fetchStudents(sourceClass.id);
        }
      } else {
        toast.error(res.message || "Gagal memproses kenaikan kelas.");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Terjadi kesalahan pada server.");
    } finally {
      setPromoting(false);
    }
  };

  // Filter classes for modal search
  const filteredClasses = useMemo(() => {
    const term = searchClassQuery.trim().toLowerCase();
    return classes.filter(
      (c) =>
        (c.class_name || "").toLowerCase().includes(term) ||
        (c.major?.major_name || "").toLowerCase().includes(term) ||
        (c.academic_year || "").toLowerCase().includes(term)
    );
  }, [classes, searchClassQuery]);

  const openClassModal = (type: "source" | "target") => {
    setSearchClassQuery("");
    setClassModalType(type);
  };

  const handleSelectClass = (cls: ClassRecord) => {
    if (classModalType === "source") {
      setSourceClass(cls);
    } else {
      setTargetClass(cls);
    }
    setClassModalType(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Kenaikan / Pemindahan Kelas Massal</Text>
        <Text style={styles.headerSubtitle}>
          Pindahkan rombongan belajar siswa ke kelas tingkat berikutnya secara massal tanpa ribet.
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom }]}>
        {/* Step 1: Select Classes */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>1. Tentukan Kelas Asal & Tujuan</Text>
          
          <View style={styles.row}>
            {/* Source Class Picker */}
            <View style={styles.flexField}>
              <Text style={styles.fieldLabel}>Kelas Asal (Dari)</Text>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => openClassModal("source")}
              >
                <Ionicons name="business-outline" size={16} color="#3B82F6" />
                <Text style={[styles.pickerText, !sourceClass && styles.pickerPlaceholder]}>
                  {sourceClass
                    ? `${sourceClass.class_name} (${sourceClass.academic_year || "Tidak Ada"})`
                    : "Pilih Kelas Asal"}
                </Text>
                <Ionicons name="chevron-down-outline" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Target Class Picker */}
            <View style={styles.flexField}>
              <Text style={styles.fieldLabel}>Kelas Tujuan (Ke)</Text>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => openClassModal("target")}
              >
                <Ionicons name="trending-up-outline" size={16} color="#10B981" />
                <Text style={[styles.pickerText, !targetClass && styles.pickerPlaceholder]}>
                  {targetClass
                    ? `${targetClass.class_name} (${targetClass.academic_year || "Tidak Ada"})`
                    : "Pilih Kelas Tujuan"}
                </Text>
                <Ionicons name="chevron-down-outline" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Step 2: Student list */}
        {sourceClass && (
          <View style={styles.card}>
            <View style={styles.studentListHeader}>
              <Text style={styles.cardSectionTitle}>2. Pilih Siswa yang Dipindahkan</Text>
              {students.length > 0 && (
                <TouchableOpacity style={styles.selectAllBtn} onPress={handleToggleSelectAll}>
                  <Ionicons
                    name={selectedStudentIds.length === students.length ? "checkbox" : "square-outline"}
                    size={16}
                    color="#2563EB"
                  />
                  <Text style={styles.selectAllText}>
                    {selectedStudentIds.length === students.length ? "Hapus Semua" : "Pilih Semua"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingStudents ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Memuat data siswa...</Text>
              </View>
            ) : students.length === 0 ? (
              <View style={styles.emptyArea}>
                <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyText}>Tidak ada siswa aktif di kelas ini.</Text>
              </View>
            ) : (
              <View style={styles.studentsWrapper}>
                {students.map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[styles.studentItem, isChecked && styles.studentItemActive]}
                      onPress={() => handleToggleStudent(student.id)}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={20}
                        color={isChecked ? "#2563EB" : "#9CA3AF"}
                      />
                      <View style={styles.studentDetails}>
                        <Text style={[styles.studentName, isChecked && styles.studentTextActive]}>
                          {student.full_name}
                        </Text>
                        <Text style={styles.studentMeta}>NIS: {student.nis}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Action Trigger */}
        {sourceClass && targetClass && students.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, promoting && styles.actionButtonDisabled]}
            onPress={handlePromote}
            disabled={promoting}
          >
            {promoting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="trending-up-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  Proses Kenaikan Kelas ({selectedStudentIds.length} Siswa)
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Class Selector Modal */}
      <Modal visible={classModalType !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Pilih Kelas {classModalType === "source" ? "Asal" : "Tujuan"}
              </Text>
              <TouchableOpacity onPress={() => setClassModalType(null)} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={searchClassQuery}
                onChangeText={setSearchClassQuery}
                placeholder="Cari nama kelas atau jurusan..."
                placeholderTextColor="#9CA3AF"
                style={styles.modalSearchInput}
              />
            </View>

            {loadingClasses ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : (
              <FlatList
                data={filteredClasses}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.classSelectItem}
                    onPress={() => handleSelectClass(item)}
                  >
                    <View style={styles.classIcon}>
                      <Ionicons name="business" size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classNameText}>{item.class_name}</Text>
                      <Text style={styles.classSubText}>
                        {item.major?.major_name || "Tidak Ada"} • TA: {item.academic_year || "Tidak Ada"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyArea}>
                    <Text style={styles.emptyText}>Kelas tidak ditemukan.</Text>
                  </View>
                }
              />
            )}
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
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flexField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
  },
  pickerSelector: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  pickerPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  studentListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  selectAllText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
  },
  loadingArea: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyArea: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },
  studentsWrapper: {
    gap: 10,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 10,
  },
  studentItemActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  studentTextActive: {
    color: "#1E40AF",
    fontWeight: "700",
  },
  studentMeta: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  actionButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  iconButton: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
  },
  classSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  classIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  classNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  classSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
});
