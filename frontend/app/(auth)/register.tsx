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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import ShimmerButton from '../../components/ui/ShimmerButton';
import { useToast } from '../../hooks/useToast';

const wallpaperWeb = require('../../assets/images/wallpaper-web.png');
const wallpaperMobile = require('../../assets/images/wallpaper-mobile.png');

export default function RegisterScreen() {
  const toast = useToast();
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 768;
  const bgSource = isWebDesktop ? wallpaperWeb : wallpaperMobile;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Nama wajib diisi';
    else if (name.trim().length < 3) nextErrors.name = 'Nama minimal 3 karakter';
    if (!email.trim()) nextErrors.email = 'Email wajib diisi';
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Format email tidak valid';
    if (!password) nextErrors.password = 'Kata sandi wajib diisi';
    else if (password.length < 8) nextErrors.password = 'Kata sandi minimal 8 karakter';
    if (!confirmPassword) nextErrors.confirmPassword = 'Konfirmasi kata sandi wajib diisi';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Kata sandi tidak cocok';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: confirmPassword,
    });

    if (result.success) {
      toast.success('Pendaftaran berhasil.');
      router.replace('/(tabs)');
    } else {
      toast.error(result.message || 'Pendaftaran gagal.');
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
                Selamat datang di Portal Registrasi Akun SMKS Rajasa Surabaya. Lengkapi formulir pendaftaran di sebelah kanan menggunakan email sekolah resmi Anda untuk terhubung ke platform pemantauan absensi digital kami.
              </Text>
            </View>
          </View>

          {/* Right Panel: Futuristic Light Glass Register Card */}
          <View style={styles.formColumn}>
            <View style={styles.glassCard}>
              <View style={styles.formCardHeader}>
                <Text style={styles.formTitle}>REGISTRASI AKUN</Text>
                <Text style={styles.formSubtitle}>Daftarkan akun baru Anda di portal akademik</Text>
              </View>
              
              <FuturisticInput
                label="Nama Lengkap"
                leftIcon="person-outline"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
                error={errors.name}
                placeholder="Masukkan nama lengkap Anda"
              />

              <FuturisticInput
                label="Alamat Email"
                leftIcon="card-outline"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                error={errors.email}
                placeholder="email@sekolah.sch.id"
                keyboardType="email-address"
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
                placeholder="Minimal 8 karakter"
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((current) => !current)}
              />

              <FuturisticInput
                label="Konfirmasi Kata Sandi"
                leftIcon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                placeholder="Ulangi kata sandi Anda"
                secureTextEntry={!showPassword}
              />

              <ShimmerButton
                onPress={handleRegister}
                isLoading={isLoading}
                style={styles.registerBtn}
                textStyle={styles.registerBtnText}
              >
                DAFTARKAN AKUN
              </ShimmerButton>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Sudah punya akun? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Masuk Disini</Text>
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
            <View style={styles.mobileRegisterHeader}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.mobileRegisterLogo}
                resizeMode="contain"
              />
              <View style={styles.mobileRegisterTitleWrapper}>
                <Text style={styles.mobileRegisterTitle}>SISTEM ABSENSI</Text>
                <Text style={styles.mobileRegisterSubtitle}>SMKS RAJASA • PORTAL DIGITAL</Text>
              </View>
            </View>

            <View style={styles.mobileRegisterGlassCard}>
              <View style={styles.mobileFormCardHeader}>
                <Text style={styles.formTitle}>REGISTRASI AKUN</Text>
                <Text style={styles.formSubtitle}>Daftarkan akun baru Anda</Text>
              </View>
              
              <FuturisticInput
                label="Nama Lengkap"
                leftIcon="person-outline"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
                error={errors.name}
                placeholder="Masukkan nama lengkap Anda"
              />

              <FuturisticInput
                label="Alamat Email"
                leftIcon="card-outline"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                error={errors.email}
                placeholder="email@sekolah.sch.id"
                keyboardType="email-address"
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
                placeholder="Minimal 8 karakter"
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((current) => !current)}
              />

              <FuturisticInput
                label="Konfirmasi Kata Sandi"
                leftIcon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                placeholder="Ulangi kata sandi Anda"
                secureTextEntry={!showPassword}
              />

              <ShimmerButton
                onPress={handleRegister}
                isLoading={isLoading}
                style={styles.registerBtn}
                textStyle={styles.registerBtnText}
              >
                DAFTARKAN AKUN
              </ShimmerButton>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Sudah punya akun? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Masuk Disini</Text>
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
  registerBtn: {
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
  registerBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13.5, color: '#4B5563', fontWeight: '500' },
  linkText: { fontSize: 13.5, color: '#2563EB', fontWeight: '800' },
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
  mobileRegisterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mobileRegisterLogo: {
    width: 60,
    height: 60,
  },
  mobileRegisterTitleWrapper: {
    justifyContent: 'center',
  },
  mobileRegisterTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 1,
    marginBottom: 2,
  },
  mobileRegisterSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 1,
  },
  mobileRegisterGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
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
  },
  mobileFormCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
});
