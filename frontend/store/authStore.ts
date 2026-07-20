import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Platform } from 'react-native';
import { authApi, setAuthToken, setUserData, removeAuthToken, removeUserData } from '../services/api';
import { initEcho, disconnectEcho } from '../services/echo';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  student_info?: {
    id: number;
    nis: string;
    class_id: number;
    class_name: string;
  };
  teacher_info?: {
    id: number;
    nip: string;
    class_ids: number[];
    class_names: string[];
    teaching_class_names?: string[];
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string | string[]) => boolean;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setToken: (token) => set({ token }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // Clear residual tokens or user data from any previous session
      await removeAuthToken();
      await removeUserData();

      const response = await authApi.login(email, password);
      const { user, token } = response.data;

      // Ensure roles is always an array
      const userData: User = {
        ...user,
        roles: user.roles || [],
        permissions: user.permissions || [],
        student_info: user.student_info,
        teacher_info: user.teacher_info,
      };

      await setAuthToken(token);
      await setUserData(userData);

      if (Platform.OS === 'web') {
        try {
          initEcho(token);
        } catch (echoError) {
          console.error('Failed to initialize Laravel Echo on login:', echoError);
        }
      }

      set({ user: userData, token, isLoading: false, isAuthenticated: true });
      return { success: true, message: response.message || 'Login berhasil' };
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Login gagal. Silakan coba lagi.';
      return { success: false, message };
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(data);
      const { user, token } = response.data;

      const userData: User = {
        ...user,
        roles: user.roles || [],
        permissions: user.permissions || [],
      };

      await setAuthToken(token);
      await setUserData(userData);

      if (Platform.OS === 'web') {
        try {
          initEcho(token);
        } catch (echoError) {
          console.error('Failed to initialize Laravel Echo on register:', echoError);
        }
      }

      set({ user: userData, token, isLoading: false, isAuthenticated: true });
      return { success: true, message: response.message || 'Pendaftaran berhasil' };
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Pendaftaran gagal. Silakan coba lagi.';
      return { success: false, message };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with local logout even if API fails
    }
    await removeAuthToken();
    await removeUserData();

    if (Platform.OS === 'web') {
      try {
        disconnectEcho();
      } catch (echoError) {
        console.error('Failed to disconnect Laravel Echo on logout:', echoError);
      }
    }

    set({ user: null, token: null, isLoading: false, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (token) {
        await setAuthToken(token);

        // Try to get fresh user data from API
        try {
          const response = await authApi.getMe();
          const user: User = {
            ...response.data,
            roles: response.data.roles || [],
            permissions: response.data.permissions || [],
            student_info: response.data.student_info,
            teacher_info: response.data.teacher_info,
          };
          await setUserData(user);
          if (Platform.OS === 'web') {
            try {
              initEcho(token);
            } catch (echoError) {
              console.error('Failed to initialize Laravel Echo on checkAuth (fresh):', echoError);
            }
          }
          set({ user, token, isLoading: false, isAuthenticated: true, isInitialized: true });
        } catch (apiError: any) {
          // If API returns 401 Unauthorized or 403 Forbidden, token is invalid/revoked.
          // Clean up stale local storage and require fresh login!
          if (apiError.response?.status === 401 || apiError.response?.status === 403) {
            await removeAuthToken();
            await removeUserData();
            set({ user: null, token: null, isLoading: false, isAuthenticated: false, isInitialized: true });
          } else if (storedUser) {
            // Only fall back to stored user data for true offline/network failure
            const user = JSON.parse(storedUser);
            if (Platform.OS === 'web') {
              try {
                initEcho(token);
              } catch (echoError) {
                console.error('Failed to initialize Laravel Echo on checkAuth (stored):', echoError);
              }
            }
            set({ user, token, isLoading: false, isAuthenticated: true, isInitialized: true });
          } else {
            await removeAuthToken();
            await removeUserData();
            set({ user: null, token: null, isLoading: false, isAuthenticated: false, isInitialized: true });
          }
        }
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch (error) {
      await removeAuthToken();
      await removeUserData();
      set({ user: null, token: null, isLoading: false, isAuthenticated: false, isInitialized: true });
    }
  },

  hasRole: (role) => {
    const user = get().user;
    if (!user || !user.roles || user.roles.length === 0) return false;
    if (Array.isArray(role)) {
      return role.some(r => user.roles!.includes(r));
    }
    return user.roles.includes(role);
  },

  hasPermission: (permission) => {
    const user = get().user;
    if (!user || !user.permissions || user.permissions.length === 0) return false;
    if (Array.isArray(permission)) {
      return permission.some(p => user.permissions!.includes(p));
    }
    return user.permissions.includes(permission);
  },
}));

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserRoles = () => useAuthStore((state) => state.user?.roles || []);