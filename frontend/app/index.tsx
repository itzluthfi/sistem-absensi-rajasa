import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isInitialized, isAuthenticated]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
