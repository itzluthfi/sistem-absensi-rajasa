import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Platform-conditional toast providers
let Toaster: any = null;
let NativeToast: any = null;
if (Platform.OS === 'web') {
  Toaster = require('react-hot-toast').Toaster;
} else {
  NativeToast = require('react-native-toast-message').default;
}

const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={toastStyles.customToast}>
      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      <View style={toastStyles.toastTextWrapper}>
        {text1 && <Text style={toastStyles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={toastStyles.toastDescription}>{text2}</Text>}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={toastStyles.customToast}>
      <Ionicons name="close-circle" size={20} color="#EF4444" />
      <View style={toastStyles.toastTextWrapper}>
        {text1 && <Text style={toastStyles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={toastStyles.toastDescription}>{text2}</Text>}
      </View>
    </View>
  ),
  info: ({ text1, text2 }: any) => (
    <View style={toastStyles.customToast}>
      <Ionicons name="information-circle" size={20} color="#3B82F6" />
      <View style={toastStyles.toastTextWrapper}>
        {text1 && <Text style={toastStyles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={toastStyles.toastDescription}>{text2}</Text>}
      </View>
    </View>
  ),
};

const toastStyles = StyleSheet.create({
  customToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: '90%',
    alignSelf: 'center',
    gap: 12,
  },
  toastTextWrapper: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  toastDescription: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 16,
  },
});

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
            position="top-center"
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
        {Platform.OS !== 'web' && NativeToast && <NativeToast config={toastConfig} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
