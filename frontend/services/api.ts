import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Configure API base URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Helper functions for token storage
export const setAuthToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeAuthToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const setUserData = async (user: any) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUserData = async (): Promise<any | null> => {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const removeUserData = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

// Pure JavaScript SHA-256 implementation
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;

  let result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const asciiBitLength = asciiLength * 8;
  let paddedAscii = ascii + '\x80';
  while ((paddedAscii[lengthProperty] * 8) % 512 !== 448) {
    paddedAscii += '\x00';
  }

  for (i = 0; i < paddedAscii[lengthProperty]; i++) {
    const charCode = paddedAscii.charCodeAt(i);
    if (charCode > 0xff) return '';
    j = i >> 2;
    words[j] = (words[j] || 0) | (charCode << (24 - (i % 4) * 8));
  }
  
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w: number[] = [];
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16);
    result += ('00000000' + hex).slice(-8);
  }
  return result;
}

// Add auth token and security signature to requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Attach authorization Bearer token if present
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Generate secure signature from environment variables
    const clientId = process.env.EXPO_PUBLIC_API_CLIENT_ID || 'smks-rajasa-app';
    const secretKey = process.env.EXPO_PUBLIC_API_CLIENT_SECRET || 'rajasa_secure_secret_key_2026';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signatureSource = `${clientId}.${timestamp}.${secretKey}`;
    const signature = sha256(signatureSource);

    if (config.headers) {
      config.headers['X-Client-ID'] = clientId;
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Signature'] = signature;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        await removeAuthToken();
        await removeUserData();
        // You can dispatch an event here to redirect to login
      }

      if (status === 403) {
        // Forbidden - user doesn't have permission
        console.log('Access denied');
      }

      if (status === 422) {
        // Validation error
        console.log('Validation error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string; password_confirmation: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    await removeAuthToken();
    await removeUserData();
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh-token');
    return response.data;
  },

  changePassword: async (data: { current_password?: string; new_password?: string; new_password_confirmation?: string }) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  registerDeviceToken: async (token: string, deviceType: string) => {
    const response = await api.post('/auth/device-token', { token, device_type: deviceType });
    return response.data;
  },
};

// Students API
export const studentsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/students', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  getQRCode: async (id: number) => {
    const response = await api.get(`/qr/student/${id}`, { responseType: 'arraybuffer' });
    return response.data;
  },
};

// Teachers API
export const teachersApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/teachers', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/teachers', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/teachers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  },
};

// Classes API
export const classesApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/classes', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/classes', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },
};

// Attendance API
export const attendanceApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/attendance/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },

  scanQR: async (data: { session_id: string; student_id: number; timestamp: string; location?: any }) => {
    const response = await api.post('/attendance/qr-scan', data);
    return response.data;
  },

  scanTeacherQR: async (data: { session_id: number; student_id: number; qr_token: string; timestamp: string; location?: any; device_info?: string; notes?: string }) => {
    const response = await api.post('/attendance/qr-scan', data);
    return response.data;
  },

  scanStudentQR: async (data: { session_id: number; student_id: number; timestamp: string; notes?: string }) => {
    const response = await api.post('/attendance/qr-student-scan', data);
    return response.data;
  },

  dailyCheckIn: async (data: { location?: any; device_info?: string }) => {
    const response = await api.post('/attendance/daily-checkin', data);
    return response.data;
  },

  dailyCheckOut: async (data: { location?: any }) => {
    const response = await api.post('/attendance/daily-checkout', data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  },
};

// Schedules API
export const schedulesApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/schedules', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/schedules/${id}`);
    return response.data;
  },

  getToday: async (params?: any) => {
    const response = await api.get('/schedules/today', { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/schedules', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/schedules/${id}`);
    return response.data;
  },
};

// Attendance Sessions API
export const attendanceSessionsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/attendance-sessions', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/attendance-sessions/${id}`);
    return response.data;
  },

  create: async (data: { schedule_id: number; require_qr?: boolean }) => {
    const response = await api.post('/attendance-sessions', data);
    return response.data;
  },

  close: async (id: number) => {
    const response = await api.post(`/attendance-sessions/${id}/close`);
    return response.data;
  },
};

// Leave Requests API
export const leaveRequestsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/leave-requests', { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/leave-requests', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  approve: async (id: number) => {
    const response = await api.post(`/leave-requests/${id}/approve`);
    return response.data;
  },

  reject: async (id: number) => {
    const response = await api.post(`/leave-requests/${id}/reject`);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getAttendanceCSV: async (params?: any) => {
    const response = await api.get('/reports/attendance/csv', { params, responseType: 'blob' });
    return response.data;
  },

  getAttendancePDF: async (params?: any) => {
    const response = await api.get('/reports/attendance/pdf', { params, responseType: 'blob' });
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
  send: async (data: { user_id?: number; message: string }) => {
    const response = await api.post('/notifications/send', data);
    return response.data;
  },
};

// Academic Periods API
export const academicPeriodsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/academic-periods', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/academic-periods/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/academic-periods', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/academic-periods/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/academic-periods/${id}`);
    return response.data;
  },
};

// Roles API
export const rolesApi = {
  getAll: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  create: async (data: { name: string; guard_name?: string }) => {
    const response = await api.post('/roles', data);
    return response.data;
  },

  assign: async (data: { user_id: number; role: string }) => {
    const response = await api.post('/roles/assign', data);
    return response.data;
  },

  givePermission: async (data: { role: string; permission: string }) => {
    const response = await api.post('/roles/give-permission', data);
    return response.data;
  },
};

// Subjects API
export const subjectsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/subjects', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/subjects', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  },
};

// Import Export API
export const importExportApi = {
  export: async (type: string) => {
    const response = await api.get(`/import-export/export/${type}`, { responseType: 'blob' });
    return response.data;
  },

  template: async (type: string) => {
    const response = await api.get(`/import-export/template/${type}`, { responseType: 'blob' });
    return response.data;
  },

  import: async (type: string, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/import-export/import/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
 
// Settings API
export const settingsApi = {
  getGps: async () => {
    const response = await api.get('/settings/gps');
    return response.data;
  },
 
  updateGps: async (data: { school_latitude: number; school_longitude: number; school_radius_meters: number }) => {
    const response = await api.put('/settings/gps', data);
    return response.data;
  },
};

export const gpsLocationsApi = {
  list: async () => {
    const response = await api.get('/gps-locations');
    return response.data;
  },
  create: async (data: { name: string; latitude: number; longitude: number; radius_meters: number; is_active?: boolean }) => {
    const response = await api.post('/gps-locations', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; latitude?: number; longitude?: number; radius_meters?: number; is_active?: boolean }) => {
    const response = await api.put(`/gps-locations/${id}`, data);
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete(`/gps-locations/${id}`);
    return response.data;
  },
  toggle: async (id: number) => {
    const response = await api.post(`/gps-locations/${id}/toggle`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default api;