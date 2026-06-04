import { useEffect, useMemo, useState } from "react";
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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reportsApi, classesApi, subjectsApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../hooks/useToast";

type ReportType = "daily" | "weekly" | "monthly" | "semester";
type ExportFormat = "pdf" | "csv";
type IconName = keyof typeof Ionicons.glyphMap;

export default function ReportsScreen() {
  const toast = useToast();
  const { hasRole, user } = useAuthStore();
  const [selectedType, setSelectedType] = useState<ReportType>("daily");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);

  // New states for Class Percentage Reports
  const [reportCategory, setReportCategory] = useState<"detail" | "percentage">("detail");
  const [entryModeType, setEntryModeType] = useState<"daily" | "subject">("daily");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showClassList, setShowClassList] = useState(false);
  const [showSubjectList, setShowSubjectList] = useState(false);

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const canExport = hasRole([
    "super_admin",
    "admin",
    "kepala_sekolah",
    "guru",
    "wali_kelas",
  ]);

  const isAdmin = hasRole(["super_admin", "admin", "kepala_sekolah"]);
  const isGuruOrWali = hasRole(["guru", "wali_kelas"]);

  // Fetch classes and subjects on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isAdmin) {
          const res = await classesApi.getAll();
          const list = res.data?.data ?? res.data ?? res ?? [];
          setClassesList(Array.isArray(list) ? list : []);
        } else if (isGuruOrWali && user?.teacher_info?.class_ids) {
          const teacherInfo = user.teacher_info;
          if (teacherInfo) {
            const list = teacherInfo.class_ids.map((id: number, idx: number) => ({
              id,
              class_name: teacherInfo.class_names?.[idx] || `Kelas ${id}`,
            }));
            setClassesList(list);
            if (list.length > 0) {
              setSelectedClassId(list[0].id);
            }
          }
        }
        
        // Load subjects
        const subRes = await subjectsApi.getAll();
        const subList = subRes.data?.data ?? subRes.data ?? subRes ?? [];
        setSubjectsList(Array.isArray(subList) ? subList : []);
      } catch (err) {
        console.error("Failed to load classes or subjects", err);
      }
    };
    loadData();
  }, [user]);

  const reportTypes: Array<{ key: ReportType; label: string; icon: IconName }> =
    [
      { key: "daily", label: "Harian", icon: "today-outline" },
      { key: "weekly", label: "Mingguan", icon: "calendar-outline" },
      { key: "monthly", label: "Bulanan", icon: "calendar-number-outline" },
      { key: "semester", label: "Semester", icon: "library-outline" },
    ];

  const exportFormats: Array<{
    key: ExportFormat;
    label: string;
    icon: IconName;
  }> = [
    { key: "pdf", label: "PDF", icon: "document-text-outline" },
    { key: "csv", label: "Excel", icon: "grid-outline" },
  ];

  const preview = useMemo(() => {
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(dateRange.endDate).getTime() -
          new Date(dateRange.startDate).getTime()) /
          86400000,
      ) + 1,
    );
    return { days };
  }, [dateRange]);

  const applyPreset = (preset: "week" | "month" | "year") => {
    const today = new Date();
    let start = new Date(today);
    if (preset === "week") start.setDate(today.getDate() - today.getDay());
    if (preset === "month")
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (preset === "year") start = new Date(today.getFullYear(), 0, 1);
    setDateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    });
  };

  const handleExport = async () => {
    if (!canExport) {
      toast.error("Akun ini tidak memiliki izin mengunduh laporan.");
      return;
    }
    
    if (reportCategory === "percentage" && !selectedClassId) {
      toast.error("Silakan pilih kelas terlebih dahulu.");
      return;
    }

    setIsExporting(true);
    try {
      let data;
      let filename = "";

      if (reportCategory === "detail") {
        const params: any = {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        };
        if (selectedClassId) {
          params.class_id = selectedClassId;
        }

        if (selectedFormat === "pdf") {
          data = await reportsApi.getAttendancePDF(params);
          filename = `laporan_absensi_detail_${Date.now()}.pdf`;
        } else {
          data = await reportsApi.getAttendanceCSV(params);
          filename = `laporan_absensi_detail_${Date.now()}.csv`;
        }
      } else {
        const params: any = {
          class_id: selectedClassId,
          type: entryModeType,
        };
        if (entryModeType === "subject" && selectedSubjectId) {
          params.subject_id = selectedSubjectId;
        }

        if (selectedFormat === "pdf") {
          data = await reportsApi.getPercentPDF(params);
          filename = `rekap_kehadiran_persentase_${Date.now()}.pdf`;
        } else {
          data = await reportsApi.getPercentExcel(params);
          filename = `rekap_kehadiran_persentase_${Date.now()}.xlsx`;
        }
      }

      if (Platform.OS === "web") {
        const type = selectedFormat === "pdf" ? "application/pdf" : (reportCategory === "percentage" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv");
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`Laporan ${selectedFormat.toUpperCase()} berhasil diunduh.`);
      } else {
        toast.success(`Laporan ${selectedFormat.toUpperCase()} berhasil dibuat.`);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal mengunduh laporan dari server. Silakan coba lagi."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={[styles.content, { paddingBottom }]}
      >
        <Section title="Kategori Laporan">
          <View style={styles.formatGrid}>
            <OptionCard
              active={reportCategory === "detail"}
              icon="document-text-outline"
              label="Detail Kehadiran"
              activeColor="#3B82F6"
              onPress={() => {
                setReportCategory("detail");
                setSelectedFormat("pdf");
              }}
            />
            <OptionCard
              active={reportCategory === "percentage"}
              icon="pie-chart-outline"
              label="Persentase Kelas"
              activeColor="#3B82F6"
              onPress={() => {
                setReportCategory("percentage");
                setSelectedFormat("pdf");
              }}
            />
          </View>
        </Section>

        {reportCategory === "detail" ? (
          <Section title="Jenis Laporan (Detail)">
            <View style={styles.optionsGrid}>
              {reportTypes.map((type) => (
                <OptionCard
                  key={type.key}
                  active={selectedType === type.key}
                  icon={type.icon}
                  label={type.label}
                  activeColor="#3B82F6"
                  onPress={() => setSelectedType(type.key)}
                />
              ))}
            </View>

            <View style={styles.descriptionBox}>
              <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={styles.descriptionBoxTitle}>
                  {selectedType === "daily" && "Laporan Harian (Daily)"}
                  {selectedType === "weekly" && "Laporan Mingguan (Weekly)"}
                  {selectedType === "monthly" && "Laporan Bulanan (Monthly)"}
                  {selectedType === "semester" && "Laporan Semester (Semester)"}
                </Text>
                <Text style={styles.descriptionBoxText}>
                  {selectedType === "daily" &&
                    "Menampilkan rekap absensi seluruh siswa dan guru untuk tanggal yang dipilih secara real-time. Membantu memantau tingkat kedisiplinan dan jumlah kehadiran/ketidakhadiran per hari secara detail."}
                  {selectedType === "weekly" &&
                    "Menyediakan rangkuman kehadiran mingguan komprehensif. Bermanfaat untuk melihat pola absensi mingguan siswa guna mengidentifikasi tren partisipasi belajar."}
                  {selectedType === "monthly" &&
                    "Menyusun laporan bulanan lengkap dengan akumulasi persentase kehadiran masing-masing siswa dan guru. Sangat cocok sebagai laporan resmi bulanan untuk diserahkan kepada Kepala Sekolah."}
                  {selectedType === "semester" &&
                    "Rekapitulasi total kehadiran satu semester penuh guna kebutuhan pengisian berkas raport, pengarsipan nilai kedisiplinan siswa, dan evaluasi hasil belajar akhir periode."}
                </Text>
              </View>
            </View>
          </Section>
        ) : (
          <Section title="Konfigurasi Laporan Persentase">
            <View style={styles.formatGrid}>
              <OptionCard
                active={entryModeType === "daily"}
                icon="today-outline"
                label="Absen Masuk Gerbang"
                activeColor="#3B82F6"
                onPress={() => setEntryModeType("daily")}
              />
              <OptionCard
                active={entryModeType === "subject"}
                icon="library-outline"
                label="Sesi Pelajaran"
                activeColor="#3B82F6"
                onPress={() => setEntryModeType("subject")}
              />
            </View>

            {entryModeType === "subject" && subjectsList.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.dateLabel}>Mata Pelajaran (Opsional - Kosongkan untuk Semua)</Text>
                <TouchableOpacity 
                  style={styles.dropdownHeader} 
                  onPress={() => setShowSubjectList(!showSubjectList)}
                >
                  <Text style={styles.dropdownHeaderText}>
                    {selectedSubjectId 
                      ? subjectsList.find(s => s.id === selectedSubjectId)?.subject_name || "Semua Mata Pelajaran"
                      : "Semua Mata Pelajaran"}
                  </Text>
                  <Ionicons 
                    name={showSubjectList ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#4B5563" 
                  />
                </TouchableOpacity>
                {showSubjectList && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          selectedSubjectId === null && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setSelectedSubjectId(null);
                          setShowSubjectList(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedSubjectId === null && styles.dropdownItemTextActive
                        ]}>
                          Semua Mata Pelajaran
                        </Text>
                      </TouchableOpacity>
                      {subjectsList.map((s) => (
                        <TouchableOpacity 
                          key={s.id} 
                          style={[
                            styles.dropdownItem,
                            selectedSubjectId === s.id && styles.dropdownItemActive
                          ]}
                          onPress={() => {
                            setSelectedSubjectId(s.id);
                            setShowSubjectList(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedSubjectId === s.id && styles.dropdownItemTextActive
                          ]}>
                            {s.subject_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </Section>
        )}

        {/* Class Filter Selector */}
        {classesList.length > 0 && (
          <Section title="Pilih Kelas">
            <TouchableOpacity 
              style={styles.dropdownHeader} 
              onPress={() => setShowClassList(!showClassList)}
            >
              <Text style={styles.dropdownHeaderText}>
                {selectedClassId 
                  ? classesList.find(c => c.id === selectedClassId)?.class_name || "Pilih Kelas"
                  : "Semua Kelas (Hanya untuk Detail)"}
              </Text>
              <Ionicons 
                name={showClassList ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#4B5563" 
              />
            </TouchableOpacity>
            {showClassList && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                  {reportCategory === "detail" && (
                    <TouchableOpacity 
                      style={[
                        styles.dropdownItem,
                        selectedClassId === null && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        setSelectedClassId(null);
                        setShowClassList(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedClassId === null && styles.dropdownItemTextActive
                      ]}>
                        Semua Kelas
                      </Text>
                    </TouchableOpacity>
                  )}
                  {classesList.map((c) => (
                    <TouchableOpacity 
                      key={c.id} 
                      style={[
                        styles.dropdownItem,
                        selectedClassId === c.id && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        setSelectedClassId(c.id);
                        setShowClassList(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedClassId === c.id && styles.dropdownItemTextActive
                      ]}>
                        {c.class_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Section>
        )}

        {reportCategory === "detail" && (
          <Section title="Rentang Tanggal">
            <View style={styles.dateContainer}>
              <DateBox label="Dari Tanggal" value={dateRange.startDate} />
              <DateBox label="Sampai Tanggal" value={dateRange.endDate} />
            </View>
            <View style={styles.presetsRow}>
              <PresetButton
                label="Minggu Ini"
                onPress={() => applyPreset("week")}
              />
              <PresetButton
                label="Bulan Ini"
                onPress={() => applyPreset("month")}
              />
              <PresetButton
                label="Tahun Ini"
                onPress={() => applyPreset("year")}
              />
            </View>
          </Section>
        )}

        <Section title="Format Export">
          <View style={styles.formatGrid}>
            {exportFormats.map((format) => (
              <OptionCard
                key={format.key}
                active={selectedFormat === format.key}
                icon={format.icon}
                label={format.label}
                activeColor="#10B981"
                onPress={() => setSelectedFormat(format.key)}
              />
            ))}
          </View>
        </Section>

        <TouchableOpacity
          style={[
            styles.exportButton,
            (!canExport || isExporting || (reportCategory === "percentage" && !selectedClassId)) && styles.exportButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={isExporting || (reportCategory === "percentage" && !selectedClassId)}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={
                  selectedFormat === "pdf"
                    ? "document-text-outline"
                    : "grid-outline"
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.exportText}>
                {canExport ? "Unduh Laporan" : "Tidak Ada Akses Export"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Preview Laporan Absensi</Text>
          <Text style={styles.previewPeriod}>
            Kategori: {reportCategory === "detail" ? "Detail Kehadiran" : "Persentase Kelas"}
          </Text>
          <View style={styles.previewStats}>
            <PreviewStat 
              value={selectedClassId ? (classesList.find(c => c.id === selectedClassId)?.class_name || "N/A") : "Semua"} 
              label="Kelas" 
            />
            <PreviewStat 
              value={reportCategory === "detail" ? selectedType.toUpperCase() : entryModeType.toUpperCase()} 
              label="Jenis" 
            />
            <PreviewStat value={selectedFormat.toUpperCase()} label="Format" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function OptionCard({
  active,
  icon,
  label,
  activeColor,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        active && {
          borderColor: activeColor,
          backgroundColor: `${activeColor}12`,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={28}
        color={active ? activeColor : "#6B7280"}
      />
      <Text style={[styles.optionLabel, active && { color: activeColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DateBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateInput}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateValue}>
        <Text style={styles.dateText}>
          {new Date(value).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>
    </View>
  );
}

function PresetButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.presetButton} onPress={onPress}>
      <Text style={styles.presetText}>{label}</Text>
    </TouchableOpacity>
  );
}

function PreviewStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewStatNumber}>{value}</Text>
      <Text style={styles.previewStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 16,
  },
  descriptionBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  descriptionBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  descriptionBoxText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
    fontWeight: "600",
  },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  optionLabel: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  dateContainer: { flexDirection: "row", gap: 12 },
  dateInput: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  dateValue: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
  },
  dateText: { fontSize: 14, color: "#1F2937" },
  presetsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  presetButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  presetText: { fontSize: 12, color: "#3B82F6", fontWeight: "700" },
  formatGrid: { flexDirection: "row", gap: 12 },
  exportButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  exportButtonDisabled: { backgroundColor: "#9CA3AF" },
  exportText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  previewPeriod: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  previewStats: { flexDirection: "row", justifyContent: "space-around" },
  previewStat: { alignItems: "center" },
  previewStatNumber: { fontSize: 22, fontWeight: "800", color: "#3B82F6" },
  previewStatLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  dropdownHeaderText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#4B5563",
  },
  dropdownItemTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
