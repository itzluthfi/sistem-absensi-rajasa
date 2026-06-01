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
    if (!email.trim()) {
      nextErrors.email = 'Email, NIS, atau NIP wajib diisi';
    }
    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi';
    } else if (password.length < 6) {
      nextErrors.password = 'Kata sandi minimal 6 karakter';
    }
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

      {isWebDesktop ? (
        <View style={styles.splitLayoutContainer}>
          {/* Left Panel: Clean School Branding */}
          <View style={styles.heroColumn}>
            <View style={styles.heroContentContainer}>
              <View style={styles.schoolHeaderContainer}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.heroSchoolLogoClean}
                  resizeMode="contain"
                />
                <View style={styles.schoolTitleWrapper}>
                  <Text style={styles.heroTitle}>SMKS RAJASA</Text>
                  <Text style={styles.heroSubtitle}>SISTEM MONITORING ABSENSI DIGITAL</Text>
                </View>
              </View>

              <View style={styles.dividerLine} />

              <Text style={styles.heroWelcomeMessage}>
                Selamat datang di Gerbang Otentikasi Terpadu SMKS Rajasa Surabaya. Silakan gunakan kredensial resmi terdaftar Anda (Email, NIS, atau NIP) pada panel di sebelah kanan untuk masuk ke dalam sistem absensi dan memantau kehadiran secara real-time.
              </Text>
            </View>
          </View>

          {/* Right Panel: Futuristic Light Glass Login Card */}
          <View style={styles.formColumn}>
            <View style={styles.glassCard}>
              <View style={styles.formCardHeader}>
                <Text style={styles.formTitle}>OTENTIKASI MASUK</Text>
                <Text style={styles.formSubtitle}>Gunakan kredensial resmi terdaftar Anda</Text>
              </View>
              
              <FuturisticInput
                label="Email / NIS / NIP"
                leftIcon="card-outline"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                error={errors.email}
                placeholder="Email, NIS, atau NIP"
                keyboardType="default"
              />

              <FuturisticInput
                label="Kata Sandi"
                leftIcon="lock-closed-outline"
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

            {/* Web System Footer */}
            <View style={styles.systemFooter}>
              <Text style={styles.systemFooterText}>
                © 2026 SMKS Rajasa Surabaya • Versi 1.0.0
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImageClean}
                resizeMode="contain"
              />
              <Text style={styles.title}>SISTEM ABSENSI</Text>
              <Text style={styles.subtitle}>SMKS RAJASA • PORTAL DIGITAL</Text>
            </View>

            <View style={styles.glassCard}>
              <View style={styles.formCardHeader}>
                <Text style={styles.formTitle}>OTENTIKASI MASUK</Text>
                <Text style={styles.formSubtitle}>Gunakan kredensial resmi terdaftar Anda</Text>
              </View>
              
              <FuturisticInput
                label="Email / NIS / NIP"
                leftIcon="card-outline"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                error={errors.email}
                placeholder="Email, NIS, atau NIP"
                keyboardType="default"
              />

              <FuturisticInput
                label="Kata Sandi"
                leftIcon="lock-closed-outline"
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

            {/* Mobile System Footer */}
            <View style={styles.systemFooter}>
              <Text style={styles.systemFooterText}>
                © 2026 SMKS Rajasa Surabaya • Versi 1.0.0
              </Text>
            </View>
          </ScrollView>
        </View>
      )}

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
                leftIcon="mail-outline"
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
  leftIcon,
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
  leftIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        collapsable={false}
        style={[
          styles.futuristicInputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={isFocused ? "#3B82F6" : "#9CA3AF"} 
            style={styles.leftIcon} 
          />
        )}
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
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 30 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImageClean: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 2,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 2,
    textShadowColor: 'rgba(37, 99, 235, 0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  
  // Split Screen layout (Desktop Web)
  splitLayoutContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
    position: 'relative',
  },
  heroColumn: {
    flex: 1.1,
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  formColumn: {
    flex: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    position: 'relative',
  },

  // Hero contents
  heroContentContainer: {
    zIndex: 2,
  },
  schoolHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  heroSchoolLogoClean: {
    width: 110,
    height: 110,
  },
  schoolTitleWrapper: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 2,
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.15)',
    width: '100%',
    marginVertical: 24,
  },
  heroWelcomeMessage: {
    fontSize: 15.5,
    color: '#4B5563',
    lineHeight: 25,
    marginBottom: 32,
    fontWeight: '500',
  },

  // Glass Card redesign (Biru Putih frosted style)
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } as any),
  },
  formCardHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A', // Deep primary blue
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Inputs
  inputContainer: { marginBottom: 20 },
  label: { 
    fontSize: 12.5, 
    fontWeight: '700', 
    color: '#1E3A8A', 
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  futuristicInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    position: 'relative',
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  inputFocused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inputError: { borderColor: '#EF4444' },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 48,
    paddingRight: 48,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    } as any),
  },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: '600' },

  // Buttons & triggers
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginTop: 10,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13.5, color: '#4B5563', fontWeight: '500' },
  linkText: { fontSize: 13.5, color: '#2563EB', fontWeight: '800' },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } as any),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  modalInstructions: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 20,
    fontWeight: '500',
  },
  resetBtn: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginTop: 12,
  },
  resetBtnText: {
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  systemFooter: {
    marginTop: 20,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  systemFooterText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
