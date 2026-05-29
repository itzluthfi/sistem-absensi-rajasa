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

const wallpaperWeb = require('../../assets/images/wallpaper-web.png');
const wallpaperMobile = require('../../assets/images/wallpaper-mobile.png');

export default function RegisterScreen() {
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
      Alert.alert('Berhasil', 'Pendaftaran berhasil.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } else {
      Alert.alert('Pendaftaran Gagal', result.message);
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
            <Text style={styles.title}>DAFTAR AKUN</Text>
            <Text style={styles.subtitle}>PORTAL BARU • SMKS RAJASA</Text>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.formTitle}>Registrasi Akun</Text>

            <FuturisticInput
              label="Nama Lengkap"
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
        </ScrollView>
      </View>
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
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoContainer: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputContainer: { marginBottom: 16 },
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
  registerBtn: {
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    marginTop: 10,
  },
  registerBtnText: {
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText: { fontSize: 14, color: '#06B6D4', fontWeight: '800' },
});
