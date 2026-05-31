import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import {
  useAttendanceStore,
  type ScheduleRecord,
  type AttendanceRecord,
} from "../../store/attendanceStore";
import { attendanceApi, attendanceSessionsApi } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FuturisticLoader from "../../components/ui/FuturisticLoader";
import ShimmerButton from "../../components/ui/ShimmerButton";
import { useToast } from "../../hooks/useToast";

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const toast = useToast();
  const {
    todaySchedules,
    fetchTodaySchedules,
    scanTeacherQR,
    scanStudentQR,
    closeAttendanceSession,
    deleteAttendance,
  } = useAttendanceStore();

  const handleRejectAttendance = (
    attendanceId: number,
    studentName: string,
  ) => {
    Alert.alert(
      "Tolak Presensi",
      `Batalkan presensi siswa ${studentName || ""}? Status kehadiran siswa akan diubah menjadi Ditolak.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak",
          style: "destructive",
          onPress: async () => {
            const res = await deleteAttendance(attendanceId);
            if (res.success) {
              toast.info("Presensi siswa berhasil ditolak.");
              if (activeSchedule?.active_session) {
                fetchSessionDetail(activeSchedule.active_session.id);
              }
            } else {
              toast.error(res.message || "Gagal menolak presensi.");
            }
          },
        },
      ],
    );
  };

  const playWebSuccessSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.05, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0.07, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log("AudioContext not supported or gesture needed:", e);
    }
  };

  const handleSiswaSelfClick = async () => {
    setIsLoadingSession(true);
    try {
      const studentId = (user?.student_info?.id || user?.id || 0) as number;

      // Request Location for GPS validation
      const coords = await getGPSLocation();
      if (!coords) {
        setIsLoadingSession(false);
        return;
      }

      const result = await scanTeacherQR({
        session_id: activeSchedule!.active_session!.id,
        student_id: studentId,
        qr_token: "", // Ignored by backend when require_qr is false
        location: coords,
        device_info: "Expo Web/Mobile Client",
        notes: "Mandiri via Klik Tombol",
      });

      if (result.success) {
        playWebSuccessSound();
        setSuccessText(result.message);
        setShowSuccessModal(true);
        loadActiveSession();
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        toast.error(result.message || "Absensi gagal.");
      }
    } catch (e: any) {
      toast.error("Terjadi kesalahan sistem saat memproses absensi.");
    } finally {
      setIsLoadingSession(false);
    }
  };

  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const paddingBottom = 64 + safeBottom + 24;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const isSiswa = user?.roles?.includes("siswa");

  // Active Session state
  const [activeSchedule, setActiveSchedule] = useState<ScheduleRecord | null>(
    null,
  );
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Scan Mode
  const [scanMode, setScanMode] = useState<
    "none" | "siswa_scan_guru" | "guru_scan_siswa"
  >("none");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // GPS Coordinates
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Student specific Opsi choice
  const [studentOpsi, setStudentOpsi] = useState<
    "menu" | "scan_guru" | "tunjuk_qr"
  >("menu");

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successText, setSuccessText] = useState("");

  // Fetch / find active session on load
  const loadActiveSession = async () => {
    setIsLoadingSession(true);
    try {
      await fetchTodaySchedules();
    } catch (e) {
      console.error("Gagal mengambil jadwal", e);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, []);

  // Sync the active schedule from todaySchedules
  useEffect(() => {
    const active = todaySchedules.find((s) => !!s.active_session);
    setActiveSchedule(active || null);
    if (active && active.active_session) {
      fetchSessionDetail(active.active_session.id);
    } else {
      setSessionDetail(null);
    }
  }, [todaySchedules]);

  const fetchSessionDetail = async (sessionId: number) => {
    try {
      const response = await attendanceSessionsApi.getById(sessionId);
      if (response.success) {
        setSessionDetail(response.data);
      }
    } catch (e) {
      console.error("Gagal mengambil detail sesi", e);
    }
  };

  const getGPSLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Kami memerlukan akses lokasi Anda untuk memvalidasi presensi di dalam radius kelas.",
        );
        setLocationLoading(false);
        return false;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      setLocationLoading(false);
      return coords;
    } catch (e) {
      Alert.alert(
        "Gagal Mendeteksi Lokasi",
        "Pastikan GPS HP Anda aktif dan coba lagi.",
      );
      setLocationLoading(false);
      return false;
    }
  };

  // Siswa Scan QR Guru
  const handleSiswaScanGuru = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      if (!qrData.session_id || !qrData.qr_token) {
        throw new Error("QR Code bukan sesi absensi resmi.");
      }

      // Trigger GPS coordinates validation
      const coords = await getGPSLocation();
      if (!coords) {
        setScanned(false);
        return;
      }

      const studentId = (user?.student_info?.id || user?.id || 0) as number;

      const result = await scanTeacherQR({
        session_id: qrData.session_id,
        student_id: studentId,
        qr_token: qrData.qr_token,
        location: coords,
        device_info: "Expo Mobile Client",
        notes: "Mandiri via Scan Guru",
      });

      if (result.success) {
        playWebSuccessSound();
        setSuccessText(result.message);
        setShowSuccessModal(true);
        loadActiveSession();
        setTimeout(() => {
          setShowSuccessModal(false);
          setScanMode("none");
          setStudentOpsi("menu");
          setScanned(false);
        }, 3000);
      } else {
        toast.error(result.message || "Absensi gagal.");
        setScanned(false);
      }
    } catch (e: any) {
      toast.error("Format QR tidak valid. Pastikan Anda men-scan QR Code Sesi dari Guru.");
      setScanned(false);
    }
  };

  // Guru Scan QR Siswa
  const handleGuruScanSiswa = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      if (!qrData.student_id || !qrData.session_id) {
        throw new Error("Format QR Siswa tidak dikenali.");
      }

      if (qrData.session_id !== activeSchedule?.active_session?.id) {
        Alert.alert(
          "Sesi Berbeda",
          "Siswa ini menampilkan QR untuk sesi pelajaran yang berbeda.",
        );
        setScanned(false);
        return;
      }

      const result = await scanStudentQR({
        session_id: qrData.session_id,
        student_id: qrData.student_id,
        notes: "Dipindai oleh Guru",
      });

      if (result.success) {
        playWebSuccessSound();
        setSuccessText(result.message);
        setShowSuccessModal(true);
        if (activeSchedule?.active_session) {
          fetchSessionDetail(activeSchedule.active_session.id);
        }
        setTimeout(() => {
          setShowSuccessModal(false);
          setScanned(false);
        }, 2000);
      } else {
        toast.error(result.message || "Gagal memindai QR siswa.");
        setScanned(false);
      }
    } catch (e: any) {
      toast.error("Format QR tidak dikenal. Pastikan yang dipindai adalah QR Absen Siswa.");
      setScanned(false);
    }
  };

  const handleCloseActiveSession = async () => {
    if (activeSchedule?.active_session) {
      Alert.alert(
        "Tutup Presensi",
        "Apakah Anda yakin ingin menutup sesi absensi kelas ini sekarang?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Tutup Sesi",
            style: "destructive",
            onPress: async () => {
              const res = await closeAttendanceSession(
                activeSchedule.active_session!.id,
              );
              if (res.success) {
                loadActiveSession();
              }
            },
          },
        ],
      );
    }
  };

  // Camera permissions view
  if (scanMode !== "none") {
    if (!permission) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Menyiapkan Kamera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centeredContainer}>
          <Ionicons name="camera-outline" size={64} color="#3B82F6" />
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionText}>
            Aplikasi absensi memerlukan akses kamera untuk memindai QR Code.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Izinkan Akses Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScanMode("none")}
          >
            <Text style={styles.secondaryButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraScreen}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={
            scanned
              ? undefined
              : scanMode === "siswa_scan_guru"
                ? handleSiswaScanGuru
                : handleGuruScanSiswa
          }
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.scannerTarget}>
            <View style={[styles.targetCorner, styles.cTopLeft]} />
            <View style={[styles.targetCorner, styles.cTopRight]} />
            <View style={[styles.targetCorner, styles.cBottomLeft]} />
            <View style={[styles.targetCorner, styles.cBottomRight]} />
          </View>
          <Text style={styles.scannerInstruction}>
            {scanned
              ? "Memproses presensi..."
              : "Posisikan QR Code di dalam kotak"}
          </Text>
          <TouchableOpacity
            style={styles.cancelScanButton}
            onPress={() => setScanMode("none")}
          >
            <Ionicons name="close" size={24} color="#fff" />
            <Text style={styles.cancelText}>Batalkan Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      {/* Dynamic Header */}
      <View style={styles.indicatorHeader}>
        <Ionicons name="finger-print" size={16} color="#fff" />
        <Text style={styles.indicatorText}>
          {isSiswa
            ? "PRESENSI SISWA • RADJASA SECURE HIBRIDA"
            : "KONTROL PRESENSI GURU • REALTIME FEED"}
        </Text>
      </View>

      {isLoadingSession ? (
        <View style={[styles.centeredContainer, { paddingBottom }]}>
          <FuturisticLoader text="Menghubungkan ke Sesi Kelas" />
        </View>
      ) : activeSchedule ? (
        // ACTIVE SESSION IS OPEN
        isSiswa ? (
          // SISWA VIEW FOR ACTIVE SESSION
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          >
            <View style={styles.sessionStatusCard}>
              <View style={styles.pulseIndicator}>
                <View style={styles.pulseCircle} />
                <Text style={styles.pulseText}>
                  SESI ABSENSI MATA PELAJARAN AKTIF
                </Text>
              </View>
              <Text style={styles.sessionSubject}>
                {activeSchedule.subject?.subject_name}
              </Text>
              <Text style={styles.sessionClass}>
                {activeSchedule.class?.class_name} • Jam:{" "}
                {activeSchedule.start_time.substring(0, 5)} -{" "}
                {activeSchedule.end_time.substring(0, 5)}
              </Text>
              <Text style={styles.sessionTeacher}>
                Guru: {activeSchedule.teacher?.full_name}
              </Text>
            </View>

            {activeSchedule.active_session?.require_qr === false ? (
              <View style={styles.selfClickCard}>
                <Ionicons
                  name="finger-print"
                  size={54}
                  color="#10B981"
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.selfClickTitle}>Presensi Klik Mandiri</Text>
                <Text style={styles.selfClickDesc}>
                  Guru mengaktifkan mode presensi langsung tanpa pemindaian.
                  Klik tombol hijau di bawah untuk mengirim data kehadiran Anda
                  sekarang.
                </Text>

                <TouchableOpacity
                  style={styles.selfClickButton}
                  onPress={handleSiswaSelfClick}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.selfClickButtonText}>
                    Kirim Kehadiran
                  </Text>
                </TouchableOpacity>
              </View>
            ) : studentOpsi === "menu" ? (
              <View style={styles.opsiContainer}>
                <Text style={styles.opsiTitle}>
                  Pilih Metode Presensi Anda:
                </Text>

                {/* Opsi 1: Scan Guru */}
                <TouchableOpacity
                  style={styles.opsiCard}
                  onPress={() => {
                    setStudentOpsi("scan_guru");
                    setScanMode("siswa_scan_guru");
                  }}
                >
                  <View
                    style={[
                      styles.opsiIconContainer,
                      { backgroundColor: "#E6F4EA" },
                    ]}
                  >
                    <Ionicons name="camera" size={28} color="#10B981" />
                  </View>
                  <View style={styles.opsiTexts}>
                    <Text style={styles.opsiCardTitle}>
                      Opsi 1: Scan QR Guru (Rekomendasi)
                    </Text>
                    <Text style={styles.opsiCardDesc}>
                      Arahkan kamera HP Anda ke layar proyektor / HP Guru di
                      depan kelas. Sistem memvalidasi radius GPS.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Opsi 2: Tampilkan QR */}
                <TouchableOpacity
                  style={styles.opsiCard}
                  onPress={() => setStudentOpsi("tunjuk_qr")}
                >
                  <View
                    style={[
                      styles.opsiIconContainer,
                      { backgroundColor: "#E0F2FE" },
                    ]}
                  >
                    <Ionicons name="qr-code" size={28} color="#0284C7" />
                  </View>
                  <View style={styles.opsiTexts}>
                    <Text style={styles.opsiCardTitle}>
                      Opsi 2: Tampilkan QR Absen Saya
                    </Text>
                    <Text style={styles.opsiCardDesc}>
                      Tunjukkan QR Code personal di HP Anda untuk di-scan oleh
                      Guru menggunakan HP Guru di kelas.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : studentOpsi === "tunjuk_qr" ? (
              <View style={styles.qrDisplayCard}>
                <Text style={styles.qrTitle}>
                  Tunjukkan QR Code Ini ke Guru
                </Text>
                <Text style={styles.qrSubtitle}>
                  QR Code berisi token aman yang terikat ke jadwal aktif Anda
                  hari ini.
                </Text>

                <View style={styles.qrWrapper}>
                  <Image
                    source={{
                      uri: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
                        JSON.stringify({
                          student_id:
                            (user?.student_info as any)?.id || user?.id,
                          session_id: activeSchedule.active_session!.id,
                          timestamp: new Date().toISOString(),
                        }),
                      )}`,
                    }}
                    style={styles.qrImage}
                  />
                </View>

                <Text style={styles.studentNameText}>{user?.name}</Text>
                <Text style={styles.studentNisText}>
                  NISN: {(user?.student_info as any)?.nisn || "00987654321"}
                </Text>

                <TouchableOpacity
                  style={styles.backToMenuButton}
                  onPress={() => setStudentOpsi("menu")}
                >
                  <Ionicons
                    name="arrow-back-outline"
                    size={16}
                    color="#4B5563"
                  />
                  <Text style={styles.backButtonText}>Pilih Metode Lain</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          // TEACHER VIEW FOR ACTIVE SESSION
          <FlatList
            data={sessionDetail?.attendances ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
            ListHeaderComponent={
              <View style={styles.teacherHeaderContainer}>
                {/* Session Summary Card */}
                <View style={styles.sessionStatusCard}>
                  <View style={styles.pulseIndicator}>
                    <View
                      style={[
                        styles.pulseCircle,
                        { backgroundColor: "#3B82F6" },
                      ]}
                    />
                    <Text style={[styles.pulseText, { color: "#3B82F6" }]}>
                      SESI ABSENSI KELAS SEDANG BERLANGSUNG
                    </Text>
                  </View>
                  <Text style={styles.sessionSubject}>
                    {activeSchedule.subject?.subject_name}
                  </Text>
                  <Text style={styles.sessionClass}>
                    {activeSchedule.class?.class_name} • Jam:{" "}
                    {activeSchedule.start_time.substring(0, 5)} -{" "}
                    {activeSchedule.end_time.substring(0, 5)}
                  </Text>

                  {/* Rotating QR Sesi / Mode Status */}
                  {activeSchedule.active_session?.require_qr === false ? (
                    <View
                      style={[
                        styles.sessionQrCard,
                        {
                          backgroundColor: "#F0FDF4",
                          borderColor: "#BBF7D0",
                          paddingVertical: 24,
                          gap: 4,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkbox-outline"
                        size={48}
                        color="#10B981"
                        style={{ marginBottom: 6, alignSelf: "center" }}
                      />
                      <Text
                        style={[
                          styles.teacherQrTitle,
                          { color: "#166534", textAlign: "center" },
                        ]}
                      >
                        MODE KLIK MANDIRI AKTIF
                      </Text>
                      <Text
                        style={[
                          styles.teacherQrDesc,
                          {
                            color: "#15803D",
                            textAlign: "center",
                            paddingHorizontal: 12,
                          },
                        ]}
                      >
                        Siswa dapat langsung menekan tombol absensi di HP
                        masing-masing tanpa memindai kode QR. Anda dapat
                        memantau daftar hadir di bawah dan membatalkan/menolak
                        siswa yang tidak ada di kelas.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sessionQrCard}>
                      <Text style={styles.teacherQrTitle}>
                        QR CODE SESI GURU
                      </Text>
                      <Text style={styles.teacherQrDesc}>
                        Pasang layar ini di proyektor atau tunjukkan ke siswa
                        untuk dipindai secara instan.
                      </Text>

                      <View style={styles.teacherQrWrapper}>
                        <Image
                          source={{
                            uri: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
                              JSON.stringify({
                                session_id: activeSchedule.active_session!.id,
                                qr_token:
                                  activeSchedule.active_session!.qr_token,
                              }),
                            )}`,
                          }}
                          style={styles.qrImage}
                        />
                      </View>
                    </View>
                  )}

                  {/* Quick Control Options */}
                  <View style={styles.teacherControlsRow}>
                    <TouchableOpacity
                      style={styles.teacherScanButton}
                      onPress={() => setScanMode("guru_scan_siswa")}
                    >
                      <Ionicons name="scan-outline" size={18} color="#fff" />
                      <Text style={styles.teacherScanBtnText}>
                        Scan QR Siswa
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.teacherCloseBtn}
                      onPress={handleCloseActiveSession}
                    >
                      <Ionicons name="power" size={18} color="#EF4444" />
                      <Text style={styles.teacherCloseBtnText}>
                        Tutup Kelas
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Present Students List Header */}
                <View style={styles.studentsListHeader}>
                  <Text style={styles.listTitle}>
                    Siswa Hadir ({sessionDetail?.attendances?.length ?? 0}{" "}
                    Orang)
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshListBtn}
                    onPress={() =>
                      fetchSessionDetail(activeSchedule.active_session!.id)
                    }
                  >
                    <Ionicons name="refresh" size={16} color="#3B82F6" />
                    <Text style={styles.refreshText}>Refresh Realtime</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#1E3A8A" />
                <Text style={styles.emptyTitle}>
                  Belum ada siswa yang hadir
                </Text>
                <Text style={styles.emptyText}>
                  Siswa dapat melakukan scan QR Sesi Anda atau menunjukkan QR
                  personal mereka untuk Anda scan.
                </Text>
              </View>
            }
            renderItem={({ item }: { item: AttendanceRecord }) => (
              <View style={styles.attendanceListItem}>
                <View style={styles.studentProfileCircle}>
                  <Text style={styles.profileInitials}>
                    {item.student?.full_name?.charAt(0).toUpperCase() || "S"}
                  </Text>
                </View>
                <View style={styles.studentListItemTexts}>
                  <Text style={styles.studentListName}>
                    {item.student?.full_name || "Siswa"}
                  </Text>
                  <Text style={styles.studentListNis}>
                    NIS: {item.student?.nis || ""} • Jam:{" "}
                    {item.time?.substring(0, 5)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.attendanceListBadge,
                    {
                      backgroundColor:
                        item.status === "hadir"
                          ? "#E6F4EA"
                          : item.status === "ditolak"
                            ? "#FEE2E2"
                            : "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.attendanceListBadgeText,
                      {
                        color:
                          item.status === "hadir"
                            ? "#10B981"
                            : item.status === "ditolak"
                              ? "#EF4444"
                              : "#F59E0B",
                      },
                    ]}
                  >
                    {item.status === "hadir"
                      ? "Hadir"
                      : item.status === "ditolak"
                        ? "Ditolak"
                        : `Telat (${item.late_minutes}m)`}
                  </Text>
                </View>
                {item.status !== "ditolak" && (
                  <TouchableOpacity
                    style={{
                      marginLeft: 8,
                      padding: 6,
                      backgroundColor: "#FEE2E2",
                      borderRadius: 8,
                      alignSelf: "center",
                    }}
                    onPress={() =>
                      handleRejectAttendance(item.id, item.student?.full_name)
                    }
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )
      ) : (
        // NO ACTIVE SESSIONS FOUND FOR TODAY
        <View style={[styles.emptyState, { paddingBottom }]}>
          <Ionicons name="qr-code-outline" size={48} color="#1E3A8A" />
          <Text style={styles.emptyTitle}>Sesi Presensi Belum Aktif</Text>
          <Text style={styles.emptyText}>
            {isSiswa
              ? "Tidak ada mata pelajaran kelas Anda yang sedang dibuka absensinya oleh Guru saat ini. Tunggu instruksi Guru Anda di dalam kelas."
              : 'Belum ada mata pelajaran Anda yang diaktifkan presensinya. Buka Beranda, lalu klik "Buka Presensi Kelas" pada pelajaran yang akan dimulai.'}
          </Text>
          {!isSiswa && (
            <TouchableOpacity
              style={styles.backToHomeBtn}
              onPress={() => router.push("/(tabs)" as never)}
            >
              <Text style={styles.backHomeBtnText}>
                Ke Beranda & Buka Kelas
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Dynamic Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Ionicons name="checkmark-circle" size={54} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>PRESENSI BERHASIL</Text>
            <Text style={styles.modalText}>{successText}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
  },
  indicatorHeader: {
    backgroundColor: "#1E293B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  indicatorText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scrollContent: { padding: 16 },
  sessionStatusCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  pulseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  pulseText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
  },
  sessionSubject: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 4,
  },
  sessionClass: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 2,
  },
  sessionTeacher: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  opsiContainer: {
    marginTop: 8,
  },
  opsiTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 14,
  },
  opsiCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  opsiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  opsiTexts: {
    flex: 1,
    paddingRight: 8,
  },
  opsiCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  opsiCardDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
    fontWeight: "500",
  },
  qrDisplayCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  qrSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  qrWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  studentNisText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 20,
  },
  backToMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
  },
  teacherHeaderContainer: {
    width: "100%",
  },
  sessionQrCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 16,
  },
  teacherQrTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  teacherQrDesc: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  teacherQrWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  teacherControlsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  teacherScanButton: {
    flex: 2,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    height: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  teacherScanBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  teacherCloseBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 10,
    height: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  teacherCloseBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
  },
  studentsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  refreshListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
  },

  attendanceListItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  studentProfileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4B5563",
  },
  studentListItemTexts: {
    flex: 1,
    paddingRight: 6,
  },
  studentListName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  studentListNis: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  attendanceListBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendanceListBadgeText: {
    fontSize: 10,
    fontWeight: "800",
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
  backToHomeBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  backHomeBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  secondaryButton: { paddingVertical: 10 },
  secondaryButtonText: { color: "#6B7280", fontSize: 12, fontWeight: "800" },
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scannerTarget: { width: 240, height: 240, position: "relative" },
  targetCorner: { position: "absolute", width: 36, height: 36 },
  cTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#3B82F6",
  },
  cTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#3B82F6",
  },
  cBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#3B82F6",
  },
  cBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#3B82F6",
  },
  scannerInstruction: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    backgroundColor: "rgba(59,130,246,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 24,
    overflow: "hidden",
  },
  cancelScanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "absolute",
    bottom: 48,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  modalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingTop: 13,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  selfClickCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  selfClickTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  selfClickDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  selfClickButton: {
    backgroundColor: "#10B981",
    borderRadius: 10,
    height: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  selfClickButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
