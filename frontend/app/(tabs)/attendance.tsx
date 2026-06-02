import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Linking,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import {
  useAttendanceStore,
  type ScheduleRecord,
  type AttendanceRecord,
} from "../../store/attendanceStore";
import { attendanceApi, attendanceSessionsApi, studentsApi, API_BASE_URL } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FuturisticLoader from "../../components/ui/FuturisticLoader";
import ShimmerButton from "../../components/ui/ShimmerButton";
import { useToast } from "../../hooks/useToast";
import NotificationBell from "../../components/ui/NotificationBell";
import { Platform } from "react-native";

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { schedule_id } = useLocalSearchParams();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
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
  const [classStudents, setClassStudents] = useState<any[]>([]);
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

  // Close Session Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeMode, setCloseMode] = useState<"now" | "scheduled">("now");
  // scheduled time: hours and minutes
  const [schedHour, setSchedHour] = useState<string>("08");
  const [schedMinute, setSchedMinute] = useState<string>("30");
  // countdown timer ref
  const [autoCloseTimer, setAutoCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [autoCloseAt, setAutoCloseAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [isCancellingTimer, setIsCancellingTimer] = useState(false);

  // Fetch / find active session on load
  const loadActiveSession = async () => {
    setIsLoadingSession(true);
    try {
      const daysEng = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now = new Date();
      const todayEng = daysEng[now.getDay()];
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayDate = `${year}-${month}-${day}`;

      await fetchTodaySchedules({
        day: todayEng,
        date: todayDate,
      });
    } catch (e) {
      console.error("Gagal mengambil jadwal", e);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // useFocusEffect: reload setiap kali halaman ini di-focus
  // (fix bug: stuck di mapel pertama ketika router.push dari dashboard)
  useFocusEffect(
    useCallback(() => {
      loadActiveSession();
      // Reset scan state setiap kali masuk halaman
      setScanMode("none");
      setScanned(false);
      setStudentOpsi("menu");
      setSelectedScheduleId(null);
    }, [])
  );


  // Sync the active schedule from todaySchedules
  useEffect(() => {
    let active: ScheduleRecord | undefined;

    if (selectedScheduleId !== null) {
      active = todaySchedules.find((s) => s.id === selectedScheduleId);
    } else if (schedule_id) {
      const targetId = Number(schedule_id);
      active = todaySchedules.find((s) => s.id === targetId);
    } else {
      const activeSchedules = todaySchedules.filter((s) => !!s.active_session);
      if (activeSchedules.length === 1) {
        active = activeSchedules[0];
      }
    }

    setActiveSchedule(active || null);

    if (active && active.active_session && active.class_id) {
      fetchSessionDetail(active.active_session.id);
      fetchClassStudents(active.class_id);
    } else {
      setSessionDetail(null);
      setClassStudents([]);
    }
  }, [todaySchedules, schedule_id, selectedScheduleId]);

  const fetchClassStudents = async (classId: number) => {
    try {
      const response = await studentsApi.getAll({ class_id: classId, all: true });
      // Handle both paginated and non-paginated responses
      const studentsData = response.data?.data ?? response.data ?? response ?? [];
      setClassStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (e: any) {
      console.error("Gagal mengambil daftar siswa kelas", e);
      toast.error("Gagal memuat daftar siswa. Silakan coba lagi.");
      setClassStudents([]);
    }
  };

  // Combine class roster with actual attendance records for the active session
  const mappedAttendances = useMemo(() => {
    if (!classStudents.length) return [];

    // Filter out any malformed student entries (null id)
    const validStudents = classStudents.filter((s) => s && typeof s.id !== 'undefined' && s.id !== null);

    const attendances = sessionDetail?.attendances ?? [];
    const attMap: Record<string | number, any> = {};
    attendances.forEach((att: any) => {
      if (att && att.student_id) {
        attMap[att.student_id] = att;
      }
    });

    return validStudents.map((student) => {
      const record = attMap[student.id] ?? attMap[String(student.id)];
      return {
        id: record ? String(record.id) : `temp-${student.id}`,
        student_id: student.id,
        student: {
          id: student.id,
          full_name: student.full_name || 'Unknown Student',
          nis: student.nis || "-",
        },
        time: record?.time ?? null,
        status: record?.status ?? "belum_absen",
        late_minutes: record?.late_minutes ?? 0,
      };
    }).filter((item) => item.student.full_name !== 'Unknown Student')
      .sort((a, b) => (a.student?.full_name || '').localeCompare(b.student?.full_name || ''));
  }, [classStudents, sessionDetail]);

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
        toast.error("Akses lokasi ditolak. Kami memerlukan izin lokasi untuk memvalidasi presensi di dalam radius kelas.");
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
      toast.error("Gagal mendeteksi lokasi. Pastikan GPS HP Anda aktif dan coba lagi.");
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
        toast.error("Siswa ini menampilkan QR untuk sesi pelajaran yang berbeda.");
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

  // ─── AUTO CLOSE COUNTDOWN ────────────────────────────────────────────────
  useEffect(() => {
    if (!autoCloseAt) {
      setCountdown("");
      return;
    }
    const tick = setInterval(() => {
      const now = new Date();
      const diff = autoCloseAt.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("Menutup...");
        clearInterval(tick);
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        setCountdown(`${h}j ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}d`);
      } else {
        setCountdown(`${m}m ${String(s).padStart(2,'0')}d`);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [autoCloseAt]);

  const handleCancelAutoClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    setAutoCloseAt(null);
    setCountdown("");
    toast.info("Jadwal tutup otomatis dibatalkan.");
  };

  // ─── CLOSE SESSION MODAL HANDLER ────────────────────────────────────────
  const handleCloseActiveSession = () => {
    if (!activeSchedule?.active_session) return;
    // Pre-fill hour from session end_time (e.g. "08:30:00" → hour=08, min=30)
    const endParts = activeSchedule.end_time?.split(':');
    if (endParts && endParts.length >= 2) {
      setSchedHour(endParts[0]);
      setSchedMinute(endParts[1]);
    }
    setCloseMode("now");
    setShowCloseModal(true);
  };

  const doCloseNow = async () => {
    setShowCloseModal(false);
    const subjectName = activeSchedule?.subject?.subject_name || "Kelas";
    const res = await closeAttendanceSession(activeSchedule!.active_session!.id);
    if (res.success) {
      toast.success(` Sesi presensi ${subjectName} berhasil ditutup.`);
      if (autoCloseTimer) { clearTimeout(autoCloseTimer); setAutoCloseTimer(null); }
      setAutoCloseAt(null);
      loadActiveSession();
    } else {
      toast.error(res.message || "Gagal menutup sesi presensi.");
    }
  };

  const doScheduleClose = () => {
    const subjectName = activeSchedule?.subject?.subject_name || "Kelas";
    const h = parseInt(schedHour, 10);
    const m = parseInt(schedMinute, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      toast.error("Waktu tidak valid. Masukkan jam (0–23) dan menit (0–59).");
      return;
    }
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    // If target is in the past, close next day (edge case)
    if (target <= now) {
      toast.error(`Waktu ${schedHour}:${schedMinute} sudah lewat. Pilih waktu yang akan datang.`);
      return;
    }
    const delayMs = target.getTime() - now.getTime();
    const sessionId = activeSchedule!.active_session!.id;
    // Cancel any existing timer
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    const timer = setTimeout(async () => {
      const res = await closeAttendanceSession(sessionId);
      if (res.success) {
        toast.success(`Sesi presensi ${subjectName} otomatis ditutup pada ${schedHour}:${schedMinute}.`);
        setAutoCloseAt(null);
        setAutoCloseTimer(null);
        loadActiveSession();
      }
    }, delayMs);
    setAutoCloseTimer(timer);
    setAutoCloseAt(target);
    setShowCloseModal(false);
    const mins = Math.round(delayMs / 60000);
    toast.success(`⏰ Presensi akan otomatis ditutup pukul ${schedHour}:${schedMinute} (${mins} menit lagi).`);
  };

  // Camera permissions view (fullscreen for students)
  if (isSiswa && scanMode === "siswa_scan_guru") {
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
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      {/* Dynamic Header */}
      <View style={styles.indicatorHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons name="finger-print" size={16} color="#fff" />
          <Text style={styles.indicatorText} numberOfLines={1}>
            {isSiswa
              ? "PRESENSI SISWA • RADJASA SECURE HIBRIDA"
              : "KONTROL PRESENSI GURU • REALTIME FEED"}
          </Text>
        </View>
        <NotificationBell iconColor="#fff" iconSize={20} />
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
            {todaySchedules.filter((s) => !!s.active_session).length > 1 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  marginBottom: 12,
                  alignSelf: 'flex-start',
                }}
                onPress={() => {
                  setSelectedScheduleId(null);
                  setActiveSchedule(null);
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Kembali ke Daftar Sesi
                </Text>
              </TouchableOpacity>
            )}
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
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
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
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          >
            {todaySchedules.filter((s) => !!s.active_session).length > 1 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  marginBottom: 12,
                  alignSelf: 'flex-start',
                }}
                onPress={() => {
                  setSelectedScheduleId(null);
                  setActiveSchedule(null);
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Kembali ke Daftar Sesi
                </Text>
              </TouchableOpacity>
            )}
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
                {scanMode === "guru_scan_siswa" ? (
                  <View style={[styles.sessionQrCard, { paddingVertical: 20 }]}>
                    <Text style={[styles.teacherQrTitle, { color: "#2563EB", marginBottom: 12 }]}>
                      PEMINDAI QR SISWA AKTIF
                    </Text>
                    {!permission ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : !permission.granted ? (
                      <View style={{ alignItems: 'center', padding: 20 }}>
                        <Ionicons name="camera-outline" size={48} color="#3B82F6" style={{ marginBottom: 10 }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
                          Izin Kamera Diperlukan
                        </Text>
                        <TouchableOpacity
                          style={[styles.primaryButton, { height: 36, paddingHorizontal: 16, borderRadius: 8 }]}
                          onPress={requestPermission}
                        >
                          <Text style={[styles.buttonText, { fontSize: 12, fontWeight: '700' }]}>Izinkan Kamera</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ width: 280, height: 280, borderRadius: 16, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#CBD5E1', alignSelf: 'center' }}>
                        <CameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          onBarcodeScanned={scanned ? undefined : handleGuruScanSiswa}
                          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                        />
                        <View style={styles.cameraOverlayInline}>
                          <View style={[styles.scannerTarget, { width: 160, height: 160 }]}>
                            <View style={[styles.targetCorner, styles.cTopLeft]} />
                            <View style={[styles.targetCorner, styles.cTopRight]} />
                            <View style={[styles.targetCorner, styles.cBottomLeft]} />
                            <View style={[styles.targetCorner, styles.cBottomRight]} />
                          </View>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 12, textAlign: 'center', backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            {scanned ? "Memproses..." : "Posisikan QR Siswa di kotak"}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.sessionQrCard}>
                    {activeSchedule.active_session?.require_qr === false ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Mode Klik Mandiri Aktif</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 }}>
                        <Ionicons name="qr-code" size={14} color="#2563EB" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Mode Wajib Scan QR Aktif</Text>
                      </View>
                    )}

                    <Text style={styles.teacherQrTitle}>QR CODE SESI GURU</Text>
                    <Text style={styles.teacherQrDesc}>
                      {activeSchedule.active_session?.require_qr === false
                        ? "Siswa dapat absen mandiri atau memindai QR Code di bawah."
                        : "Tunjukkan QR Code ke proyektor / HP agar siswa dapat memindai."}
                    </Text>

                    <View style={styles.teacherQrWrapper}>
                      <Image
                        source={{
                          uri: `${API_BASE_URL}/qr/session?session_id=${activeSchedule.active_session!.id}&qr_token=${activeSchedule.active_session!.qr_token}`,
                        }}
                        style={styles.qrImage}
                      />
                    </View>

                    {/* Tombol Unduh & Perbesar QR Code */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      {/* Tombol Unduh QR */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: '#0284C7',
                          backgroundColor: '#F0F9FF',
                        }}
                        onPress={async () => {
                          const url = `${API_BASE_URL}/qr/session?session_id=${activeSchedule.active_session!.id}&qr_token=${activeSchedule.active_session!.qr_token}`;
                          const fileName = `QR_${activeSchedule?.subject?.subject_name?.replace(/\s+/g, '_') ?? 'Absensi'}_${activeSchedule.active_session!.id}.png`;

                          if (Platform.OS === 'web') {
                            try {
                              const response = await fetch(url);
                              if (!response.ok) throw new Error('Gagal mengambil QR');
                              const blob = await response.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(blobUrl);
                              toast.success("QR Code berhasil diunduh!");
                            } catch (err) {
                              console.error("Download error:", err);
                              toast.error("Gagal mengunduh QR. Coba lagi.");
                            }
                          } else {
                            // Mobile: save to downloads
                            try {
                              const response = await fetch(url);
                              const blob = await response.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = fileName;
                              link.click();
                              toast.success("QR Code berhasil diunduh!");
                            } catch (err) {
                              Linking.openURL(url);
                            }
                          }
                        }}
                      >
                        <Ionicons name="download-outline" size={16} color="#0284C7" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>Unduh QR</Text>
                      </TouchableOpacity>

                      {/* Tombol Perbesar QR */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: '#6B7280',
                          backgroundColor: '#F9FAFB',
                        }}
                        onPress={() => {
                          const url = `${API_BASE_URL}/qr/session?session_id=${activeSchedule.active_session!.id}&qr_token=${activeSchedule.active_session!.qr_token}`;
                          // Open in new tab (web) or view in full screen
                          if (Platform.OS === 'web') {
                            window.open(url, '_blank');
                          } else {
                            // Mobile: open in full screen modal or share
                            Linking.openURL(url);
                          }
                        }}
                      >
                        <Ionicons name="expand-outline" size={16} color="#6B7280" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280' }}>Perbesar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Quick Control Options */}
                <View style={styles.teacherControlsRow}>
                  {scanMode === "guru_scan_siswa" ? (
                    <TouchableOpacity
                      style={[styles.teacherScanButton, { backgroundColor: "#0284C7" }]}
                      onPress={() => setScanMode("none")}
                    >
                      <Ionicons name="qr-code-outline" size={18} color="#fff" />
                      <Text style={styles.teacherScanBtnText}>Tampilkan QR Saya</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.teacherScanButton}
                      onPress={() => setScanMode("guru_scan_siswa")}
                    >
                      <Ionicons name="scan-outline" size={18} color="#fff" />
                      <Text style={styles.teacherScanBtnText}>Scan QR Siswa</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.teacherCloseBtn}
                    onPress={handleCloseActiveSession}
                  >
                    <Ionicons name="power" size={18} color="#EF4444" />
                    <Text style={styles.teacherCloseBtnText}>Tutup Kelas</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Auto-Close Countdown Banner */}
              {autoCloseAt && countdown ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: '#FEF3C7', borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 10,
                  marginBottom: 12, borderWidth: 1, borderColor: '#FCD34D',
                }}>
                  <Ionicons name="time-outline" size={18} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>
                      ⏰ Tutup Otomatis Pukul {schedHour}:{schedMinute}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                      Sisa waktu: <Text style={{ fontWeight: '800' }}>{countdown}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCancelAutoClose}
                    style={{ backgroundColor: '#FCD34D', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#78350F' }}>Batalkan</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Present Students List Header */}
              <View style={styles.studentsListHeader}>
                <Text style={styles.listTitle}>
                  Siswa ({mappedAttendances.filter((a: any) => a.status !== 'belum_absen' && a.status !== 'ditolak').length} Hadir / {classStudents.length} Total)
                </Text>
                <TouchableOpacity
                  style={styles.refreshListBtn}
                  onPress={() => fetchSessionDetail(activeSchedule.active_session!.id)}
                >
                  <Ionicons name="refresh" size={16} color="#3B82F6" />
                  <Text style={styles.refreshText}>Refresh Realtime</Text>
                </TouchableOpacity>
              </View>

              {/* Students list */}
              {mappedAttendances.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#1E3A8A" />
                  <Text style={styles.emptyTitle}>Belum ada siswa</Text>
                  <Text style={styles.emptyText}>
                    Tidak ada siswa terdaftar di kelas untuk mata pelajaran ini.
                  </Text>
                </View>
              ) : (
                mappedAttendances.map((item: any) => (
                  <View key={item.id} style={styles.attendanceListItem}>
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
                        NIS: {item.student?.nis || ""} {item.time ? `• Jam: ${item.time.substring(0, 5)}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.attendanceListBadge,
                        {
                          backgroundColor:
                            item.status === "hadir" ? "#E6F4EA"
                            : item.status === "ditolak" ? "#FEE2E2"
                            : item.status === "belum_absen" ? "#F3F4F6"
                            : "#FEF3C7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.attendanceListBadgeText,
                          {
                            color:
                              item.status === "hadir" ? "#10B981"
                              : item.status === "ditolak" ? "#EF4444"
                              : item.status === "belum_absen" ? "#6B7280"
                              : "#F59E0B",
                          },
                        ]}
                      >
                        {item.status === "hadir" ? "Hadir"
                          : item.status === "ditolak" ? "Ditolak"
                          : item.status === "belum_absen" ? "Belum Absen"
                          : `Telat (${item.late_minutes}m)`}
                      </Text>
                    </View>
                    {item.status !== "ditolak" && item.status !== "belum_absen" && (
                      <TouchableOpacity
                        style={{
                          marginLeft: 8,
                          padding: 6,
                          backgroundColor: "#FEE2E2",
                          borderRadius: 8,
                          alignSelf: "center",
                        }}
                        onPress={() => handleRejectAttendance(Number(item.id), item.student?.full_name)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )
      ) : todaySchedules.filter((s) => !!s.active_session).length > 1 ? (
        // MULTIPLE ACTIVE SESSIONS SELECTION SCREEN
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom }]}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={{ flex: 1, color: '#1E40AF', fontSize: 13, lineHeight: 18 }}>
                Ada beberapa sesi presensi kelas Anda yang sedang aktif hari ini. Silakan pilih salah satu untuk masuk:
              </Text>
            </View>

            {todaySchedules.filter((s) => !!s.active_session).map((schedule) => (
              <TouchableOpacity
                key={schedule.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                onPress={() => setSelectedScheduleId(schedule.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>
                      {schedule.class?.class_name || 'Kelas'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                    Room: {schedule.room}
                  </Text>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                  {schedule.subject?.subject_name}
                </Text>
                
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                  Guru: {schedule.teacher?.full_name}
                </Text>

                <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700' }}>Pilih Sesi</Text>
                    <Ionicons name="arrow-forward" size={14} color="#2563EB" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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

      {/* ─── CLOSE SESSION MODAL ──────────────────────────────── */}
      <Modal visible={showCloseModal} transparent animationType="slide" onRequestClose={() => setShowCloseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isMobile ? '92%' : 420, padding: 0, overflow: 'hidden' }]}>

            {/* Modal Header */}
            <View style={{ backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="power" size={20} color="#F87171" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 }}>Tutup Presensi</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 19 }}>
                Pilih cara menutup sesi presensi{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                  {activeSchedule?.subject?.subject_name || 'Kelas'}
                </Text>:
              </Text>

              {/* Toggle: Sekarang vs Jadwalkan */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setCloseMode('now')}
                  style={[
                    { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 2, gap: 4 },
                    closeMode === 'now'
                      ? { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }
                      : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                  ]}
                >
                  <Ionicons name="power" size={20} color={closeMode === 'now' ? '#EF4444' : '#94A3B8'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: closeMode === 'now' ? '#EF4444' : '#64748B' }}>
                    Tutup Sekarang
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCloseMode('scheduled')}
                  style={[
                    { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 2, gap: 4 },
                    closeMode === 'scheduled'
                      ? { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }
                      : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                  ]}
                >
                  <Ionicons name="time-outline" size={20} color={closeMode === 'scheduled' ? '#3B82F6' : '#94A3B8'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: closeMode === 'scheduled' ? '#3B82F6' : '#64748B' }}>
                    Jadwalkan Waktu
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sekarang Info */}
              {closeMode === 'now' && (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="warning-outline" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Tutup Sekarang</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 17 }}>
                    Sesi presensi akan langsung ditutup. Siswa yang belum absen tidak dapat melakukan presensi lagi.
                  </Text>
                </View>
              )}

              {/* Jadwalkan: Time Picker */}
              {closeMode === 'scheduled' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 10 }}>
                    Pilih waktu tutup otomatis:
                  </Text>

                  {/* Time Display */}
                  <View style={{ alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1E293B', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}>
                      <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: 2 }}>
                        {schedHour.padStart(2, '0')}
                      </Text>
                      <Text style={{ fontSize: 36, fontWeight: '800', color: '#3B82F6', marginBottom: 2 }}>:</Text>
                      <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: 2 }}>
                        {schedMinute.padStart(2, '0')}
                      </Text>
                    </View>
                  </View>

                  {/* Quick presets from schedule */}
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, textAlign: 'center' }}>Pilih preset atau ketik manual:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                    {[
                      activeSchedule?.end_time ? `${activeSchedule.end_time.slice(0,5)}` : null,
                      '+15',
                      '+30',
                      '+45',
                      '+60',
                    ].filter(Boolean).map((preset) => {
                      const isEndTime = preset && !preset.startsWith('+');
                      return (
                        <TouchableOpacity
                          key={preset!}
                          onPress={() => {
                            if (isEndTime) {
                              const parts = preset!.split(':');
                              setSchedHour(parts[0]);
                              setSchedMinute(parts[1]);
                            } else {
                              const addMins = parseInt(preset!.replace('+', ''), 10);
                              const now = new Date();
                              const future = new Date(now.getTime() + addMins * 60000);
                              setSchedHour(String(future.getHours()).padStart(2, '0'));
                              setSchedMinute(String(future.getMinutes()).padStart(2, '0'));
                            }
                          }}
                          style={{ backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#BFDBFE' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                            {isEndTime ? `⏰ Akhir Jam (${preset})` : `+ ${preset!.replace('+','')} mnt`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Manual Input */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4, fontWeight: '600' }}>JAM</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TouchableOpacity
                          onPress={() => setSchedHour(h => String(Math.max(0, parseInt(h,10)-1)).padStart(2,'0'))}
                          style={{ backgroundColor: '#E2E8F0', borderRadius: 6, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 16, color: '#475569', fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', minWidth: 32, textAlign: 'center' }}>
                          {schedHour.padStart(2,'0')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setSchedHour(h => String(Math.min(23, parseInt(h,10)+1)).padStart(2,'0'))}
                          style={{ backgroundColor: '#E2E8F0', borderRadius: 6, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 16, color: '#475569', fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#CBD5E1', marginTop: 18 }}>:</Text>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4, fontWeight: '600' }}>MENIT</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TouchableOpacity
                          onPress={() => setSchedMinute(m => String(Math.max(0, parseInt(m,10)-5)).padStart(2,'0'))}
                          style={{ backgroundColor: '#E2E8F0', borderRadius: 6, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 16, color: '#475569', fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', minWidth: 32, textAlign: 'center' }}>
                          {schedMinute.padStart(2,'0')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setSchedMinute(m => String(Math.min(59, parseInt(m,10)+5)).padStart(2,'0'))}
                          style={{ backgroundColor: '#E2E8F0', borderRadius: 6, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 16, color: '#475569', fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 11, color: '#1D4ED8', textAlign: 'center', fontWeight: '600' }}>
                      ⏰ Presensi akan otomatis ditutup tepat pukul {schedHour.padStart(2,'0')}:{schedMinute.padStart(2,'0')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowCloseModal(false)}
                  style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={closeMode === 'now' ? doCloseNow : doScheduleClose}
                  style={[
                    { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
                    closeMode === 'now'
                      ? { backgroundColor: '#EF4444' }
                      : { backgroundColor: '#2563EB' },
                  ]}
                >
                  <Ionicons
                    name={closeMode === 'now' ? 'power' : 'time'}
                    size={16}
                    color="#fff"
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>
                    {closeMode === 'now' ? 'Tutup Sekarang' : `Set Waktu ${schedHour}:${schedMinute}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    justifyContent: "space-between",
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
    alignItems: "center",
    alignSelf: "center",
    width: 272,
    height: 272,
  },
  qrImage: {
    width: 240,
    height: 240,
    alignSelf: "center",
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
    alignItems: "center",
    alignSelf: "center",
    width: 272,
    height: 272,
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
  cameraOverlayInline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    alignItems: "center",
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
  downloadQrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F0F9FF",
  },
  downloadQrText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "700",
  },
});
