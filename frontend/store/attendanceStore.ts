import { create } from 'zustand';
import { attendanceApi, schedulesApi, attendanceSessionsApi } from '../services/api';

export type AttendanceStatus = 'hadir' | 'telat' | 'izin' | 'sakit' | 'alpha' | 'ditolak';
export type AttendanceType = 'masuk' | 'pulang';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student?: any;
  class_id?: number;
  class?: any;
  date: string;
  time: string;
  status: AttendanceStatus;
  attendance_type?: AttendanceType;
  check_in_time?: string;
  checkout_time?: string;
  latitude?: number;
  longitude?: number;
  late_minutes?: number;
  device_info?: string;
  notes?: string;
  schedule_id?: number | null;
  attendance_session_id?: number | null;
}

export interface AttendanceSession {
  id: number;
  class_id: number;
  teacher_id: number;
  subject_id?: number;
  qr_token: string;
  attendance_date: string;
  open_time: string;
  close_time: string | null;
  is_active: boolean;
  require_qr?: boolean;
}

export interface ScheduleRecord {
  id: number;
  class_id: number;
  class?: any;
  teacher_id: number;
  teacher?: any;
  subject_id: number;
  subject?: any;
  day_name: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  active_session?: AttendanceSession | null;
  attendance_status?: AttendanceStatus | 'belum_absen';
  attendance_time?: string | null;
}

interface AttendanceState {
  attendances: AttendanceRecord[];
  todaySchedules: ScheduleRecord[];
  currentSession: AttendanceSession | null;
  todayStats: {
    hadir: number;
    telat: number;
    izin: number;
    sakit: number;
    alpha: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
}

interface AttendanceActions {
  setAttendances: (attendances: AttendanceRecord[]) => void;
  addAttendance: (attendance: AttendanceRecord) => void;
  setCurrentSession: (session: AttendanceSession | null) => void;
  setTodayStats: (stats: AttendanceState['todayStats']) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchAttendances: (params?: any) => Promise<void>;
  fetchTodaySchedules: (params?: any) => Promise<void>;
  createAttendance: (data: AttendancePayload) => Promise<{ success: boolean; message: string; data?: AttendanceRecord }>;
  openAttendanceSession: (scheduleId: number, requireQr?: boolean, closeTime?: string, attendanceDate?: string) => Promise<{ success: boolean; message: string; data?: AttendanceSession }>;
  closeAttendanceSession: (sessionId: number) => Promise<{ success: boolean; message: string }>;
  scanTeacherQR: (data: { session_id: number; student_id: number; qr_token: string; location?: Location; device_info?: string; notes?: string }) => Promise<{ success: boolean; message: string; data?: AttendanceRecord }>;
  scanStudentQR: (data: { session_id: number; student_id: number; notes?: string }) => Promise<{ success: boolean; message: string; data?: AttendanceRecord }>;
  deleteAttendance: (id: number) => Promise<{ success: boolean; message: string }>;
  dailyCheckIn: (data: { location?: Location; device_info?: string }) => Promise<{ success: boolean; message: string; data?: AttendanceRecord }>;
  calculateTodayStats: () => void;
}

type AttendanceStore = AttendanceState & AttendanceActions;
type AttendancePayload = Partial<AttendanceRecord> & { location?: Location };

export const useAttendanceStore = create<AttendanceStore>((set, get) => ({
  attendances: [],
  todaySchedules: [],
  currentSession: null,
  todayStats: { hadir: 0, telat: 0, izin: 0, sakit: 0, alpha: 0, total: 0 },
  isLoading: false,
  error: null,

  setAttendances: (attendances) => set({ attendances }),
  addAttendance: (attendance) => set((state) => ({ attendances: [attendance, ...state.attendances] })),
  setCurrentSession: (session) => set({ currentSession: session }),
  setTodayStats: (stats) => set({ todayStats: stats }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchAttendances: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceApi.getAll(params);
      const data = response.data?.data ?? response.data ?? [];
      set({ attendances: data, isLoading: false });
      get().calculateTodayStats();
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal mengambil data absensi' });
    }
  },

  fetchTodaySchedules: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await schedulesApi.getToday(params);
      const data = response.data ?? [];
      set({ todaySchedules: data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal mengambil jadwal hari ini' });
    }
  },

  createAttendance: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceApi.create(data);
      const attendance = response.data;
      get().addAttendance(attendance);
      get().calculateTodayStats();
      set({ isLoading: false });
      return { success: true, message: response.message || 'Absensi berhasil disimpan', data: attendance };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal menyimpan absensi' });
      return { success: false, message: error.response?.data?.message || 'Gagal menyimpan absensi' };
    }
  },

  openAttendanceSession: async (scheduleId, requireQr = true, closeTime, attendanceDate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceSessionsApi.create({ 
        schedule_id: scheduleId, 
        require_qr: requireQr,
        close_time: closeTime,
        attendance_date: attendanceDate
      });
      const session = response.data;
      set((state) => ({
        currentSession: session,
        todaySchedules: state.todaySchedules.map((s) =>
          Number(s.id) === Number(scheduleId)
            ? { ...s, active_session: session }
            : s
        ),
        isLoading: false,
      }));
      return { success: true, message: response.message || 'Sesi absensi berhasil dibuka', data: session };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal membuka sesi absensi' });
      return { success: false, message: error.response?.data?.message || 'Gagal membuka sesi absensi' };
    }
  },

  closeAttendanceSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceSessionsApi.close(sessionId);
      set((state) => ({
        currentSession: null,
        todaySchedules: state.todaySchedules.map((s) =>
          s.active_session && Number(s.active_session.id) === Number(sessionId)
            ? { ...s, active_session: null }
            : s
        ),
        isLoading: false,
      }));
      return { success: true, message: response.message || 'Sesi absensi berhasil ditutup' };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal menutup sesi absensi' });
      return { success: false, message: error.response?.data?.message || 'Gagal menutup sesi absensi' };
    }
  },

  scanTeacherQR: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const response = await attendanceApi.scanTeacherQR({
        ...data,
        timestamp: now.toISOString(),
      });
      const attendance = response.data;
      get().addAttendance(attendance);
      get().calculateTodayStats();
      set({ isLoading: false });
      return { success: true, message: response.message || 'Absensi berhasil', data: attendance };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal melakukan absensi' });
      return { success: false, message: error.response?.data?.message || 'Gagal melakukan absensi' };
    }
  },

  scanStudentQR: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const response = await attendanceApi.scanStudentQR({
        ...data,
        timestamp: now.toISOString(),
      });
      const attendance = response.data;
      get().addAttendance(attendance);
      get().calculateTodayStats();
      set({ isLoading: false });
      return { success: true, message: response.message || 'Absensi siswa berhasil dicatat', data: attendance };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal memproses absensi siswa' });
      return { success: false, message: error.response?.data?.message || 'Gagal memproses absensi siswa' };
    }
  },

  deleteAttendance: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceApi.delete(id);
      const updatedAttendance = response.data;
      set((state) => ({
        attendances: state.attendances.map((a) => a.id === id ? updatedAttendance : a),
        isLoading: false,
      }));
      get().calculateTodayStats();
      return { success: true, message: 'Absensi berhasil ditolak' };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal menolak absensi' });
      return { success: false, message: error.response?.data?.message || 'Gagal menolak absensi' };
    }
  },

  dailyCheckIn: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceApi.dailyCheckIn(data);
      const attendance = response.data;
      get().addAttendance(attendance);
      get().calculateTodayStats();
      set({ isLoading: false });
      return { success: true, message: response.message || 'Absen masuk sekolah berhasil', data: attendance };
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Gagal melakukan absen masuk sekolah' });
      return { success: false, message: error.response?.data?.message || 'Gagal melakukan absen masuk sekolah' };
    }
  },

  calculateTodayStats: () => {
    const { attendances } = get();
    const today = new Date().toISOString().split('T')[0];
    const todayAttendances = attendances.filter((a) => {
      const recordDate = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0];
      return recordDate === today;
    });

    const stats = {
      hadir: todayAttendances.filter((a) => a.status === 'hadir').length,
      telat: todayAttendances.filter((a) => a.status === 'telat').length,
      izin: todayAttendances.filter((a) => a.status === 'izin').length,
      sakit: todayAttendances.filter((a) => a.status === 'sakit').length,
      alpha: todayAttendances.filter((a) => a.status === 'alpha').length,
      total: todayAttendances.length,
    };

    set({ todayStats: stats });
  },
}));
