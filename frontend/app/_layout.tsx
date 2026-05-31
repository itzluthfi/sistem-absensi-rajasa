import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';

// Platform-conditional toast providers
let Toaster: any = null;
let NativeToast: any = null;
if (Platform.OS === 'web') {
  Toaster = require('react-hot-toast').Toaster;
} else {
  NativeToast = require('react-native-toast-message').default;
}

export default function RootLayout() {
  const { checkAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>

        {/* Toast providers — mounted once at root, available everywhere */}
        {Platform.OS === 'web' && Toaster && (
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
              },
            }}
          />
        )}
        {Platform.OS !== 'web' && NativeToast && <NativeToast />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
