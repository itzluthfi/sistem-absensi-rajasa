import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ImageBackground,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import ShimmerButton from '../../components/ui/ShimmerButton';
import { authApi } from '../../services/api';

const wallpaperWeb = require('../../assets/images/wallpaper-web.png');
const wallpaperMobile = require('../../assets/images/wallpaper-mobile.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Forgot Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  const bgSource = isWebDesktop ? wallpaperWeb : wallpaperMobile;

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'Email wajib diisi';
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Format email tidak valid';
    if (!password) nextErrors.password = 'Kata sandi wajib diisi';
    else if (password.length < 6) nextErrors.password = 'Kata sandi minimal 6 karakter';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    const result = await login(email.trim(), password);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Gagal', result.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Silakan masukkan alamat email Anda.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      Alert.alert('Error', 'Format email tidak valid.');
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const response = await authApi.forgotPassword(forgotEmail.trim());
      setIsSubmittingForgot(false);
      setShowForgotModal(false);
      setForgotEmail('');
      Alert.alert(
        'Berhasil',
        'Kata sandi Anda berhasil disetel ulang menjadi default: "rajasa123".\n\nSilakan login menggunakan kata sandi ini dan segera ubah kata sandi di halaman Profil.'
      );
    } catch (error: any) {
      setIsSubmittingForgot(false);
      Alert.alert(
        'Gagal Reset',
        error.response?.data?.message || 'Alamat email tidak cocok atau belum terdaftar.'
      );
    }
  };

  return (
    <ImageBackground source={bgSource} style={styles.backgroundImage} resizeMode="cover">
      <View style={styles.darkOverlay} />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>SISTEM ABSENSI</Text>
            <Text style={styles.subtitle}>SMKS RAJASA • PORTAL DIGITAL</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.formTitle}>Otentikasi Pengguna</Text>
            
            <FuturisticInput
              label="Alamat Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
              }}
              error={errors.email}
              placeholder="Masukkan email Anda"
              keyboardType="email-address"
            />

            <FuturisticInput
              label="Kata Sandi"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
              }}
              error={errors.password}
              placeholder="Masukkan kata sandi"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((current) => !current)}
            />

            {/* Forgot Password Trigger Link */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer} 
              onPress={() => setShowForgotModal(true)}
            >
              <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
            </TouchableOpacity>

            <ShimmerButton
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginBtn}
              textStyle={styles.loginBtnText}
            >
              MASUK KE SISTEM
            </ShimmerButton>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Daftar Sekarang</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lupa Kata Sandi</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInstructions}>
                Masukkan alamat email terdaftar Anda. Sistem akan menyetel ulang kata sandi Anda ke kata sandi default aman SMKS Rajasa.
              </Text>

              <FuturisticInput
                label="Alamat Email"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                placeholder="Masukkan email Anda"
                keyboardType="email-address"
              />

              <ShimmerButton
                onPress={handleForgotPassword}
                isLoading={isSubmittingForgot}
                style={styles.resetBtn}
                textStyle={styles.resetBtnText}
              >
                RESET KATA SANDI
              </ShimmerButton>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

function FuturisticInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  rightIcon,
  onRightIconPress,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.futuristicInputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 18, 0.45)',
  },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06B6D4',
    letterSpacing: 3,
    textShadowColor: 'rgba(6, 182, 212, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } as any),
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  futuristicInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
  },
  inputFocused: {
    borderColor: '#06B6D4',
  },
  inputError: { borderColor: '#EF4444' },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: '600' },
  loginBtn: {
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    marginTop: 10,
  },
  loginBtnText: {
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText: { fontSize: 14, color: '#06B6D4', fontWeight: '800' },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#06B6D4',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  modalInstructions: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  resetBtn: {
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    marginTop: 12,
  },
  resetBtnText: {
    fontWeight: '900',
    letterSpacing: 1,
  },
});
