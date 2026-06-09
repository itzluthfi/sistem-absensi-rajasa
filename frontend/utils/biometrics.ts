import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

/**
 * Melakukan verifikasi sidik jari / Face ID (biometrik) lokal perangkat.
 * Jika platform adalah Web, verifikasi akan dilewati (selalu sukses).
 * Jika perangkat tidak mendukung biometrik, akan otomatis jatuh (fallback)
 * ke metode PIN/Passcode/Pola kunci layar HP.
 * 
 * @param promptMessage Pesan instruksi yang ditampilkan ke pengguna
 * @returns Promise<boolean> true jika berhasil terautentikasi, false jika gagal/batal
 */
export const authenticateWithBiometrics = async (
  promptMessage: string = "Verifikasi identitas Anda untuk melanjutkan absensi"
): Promise<boolean> => {
  if (Platform.OS === "web") {
    return true; // Dilewati pada platform web browser
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    // Jika tidak ada pengunci layar sama sekali, biarkan absen berlanjut
    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE) {
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Gunakan PIN/Sandi",
      disableDeviceFallback: false, // Membolehkan fallback ke PIN/pola perangkat
      cancelLabel: "Batal",
    });

    return result.success;
  } catch (error) {
    console.error("Kesalahan verifikasi biometrik:", error);
    return false;
  }
};
