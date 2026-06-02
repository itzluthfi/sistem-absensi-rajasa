# 📱 Frontend - Sistem Absensi Digital SMKS Rajasa

Mobile/Web App dengan Expo React Native untuk sistem absensi digital.

## 📋 Prerequisites

- Node.js 18+
- npm atau yarn
- Expo CLI
- Mobile device atau emulator (untuk testing)

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
# atau
yarn install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` dan set API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Install Expo CLI

```bash
npm install -g expo-cli
```

## 🚀 Running

### Start Development Server

```bash
npm start
# atau
npx expo start
```

### Run on Specific Platform

```bash
# Android
npm run android
# atau
npx expo start --android

# iOS (macOS only)
npm run ios
# atau
npx expo start --ios

# Web
npm run web
# atau
npx expo start --web
```

### Using Expo Go App

1. Download Expo Go dari App Store / Play Store
2. Jalankan `npm start`
3. Scan QR Code dengan Expo Go app

## 📁 Project Structure

```
app/
├── (auth)                    # Auth screens (login, register)
├── (dashboard)               # Dashboard screens
│   ├── admin/
│   ├── guru/
│   └── siswa/
├── attendance/               # Attendance screens
├── students/                 # Student management
├── teachers/                 # Teacher management
├── classes/                  # Class management
└── reports/                  # Reports screens

components/
├── ui/                       # Basic UI components
├── cards/                    # Card components
├── charts/                   # Chart components
└── forms/                    # Form components

services/
├── api.ts                    # API client
└── auth.ts                   # Auth service

store/
├── authStore.ts              # Auth state
└── attendanceStore.ts        # Attendance state
```

## 🎨 Styling

Project menggunakan **NativeWind** (Tailwind CSS untuk React Native).

### Example Component

```tsx
import { View, Text, Pressable } from "react-native";

export default function Button({ onPress, children }) {
  return (
    <Pressable onPress={onPress} className="bg-blue-500 px-4 py-2 rounded-lg">
      <Text className="text-white font-semibold">{children}</Text>
    </Pressable>
  );
}
```

## 🔐 Authentication

### Login Flow

```tsx
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", { email, password });

  const { user, token } = response.data.data;

  useAuthStore.setState({
    user,
    token,
    isAuthenticated: true,
  });

  return { user, token };
}
```

### Protected Routes

Gunakan middleware untuk melindungi routes yang memerlukan authentication.

## 📦 Installed Packages

- `expo-router` - Navigation
- `nativewind` - Tailwind CSS
- `zustand` - State Management
- `axios` - HTTP Client
- `react-hook-form` - Form Handling
- `zod` - Validation
- `expo-barcode-scanner` - QR Scanner
- `expo-notifications` - Push Notifications
- `expo-location` - GPS Location
- `@react-native-async-storage/async-storage` - Local Storage

## 🎯 Features

### Authentication

- [ ] Login screen
- [ ] Register screen
- [ ] Forgot password
- [ ] Session persistence

### Dashboard

- [ ] Admin dashboard
- [ ] Teacher dashboard
- [ ] Student dashboard
- [ ] Statistics & charts

### Attendance

- [ ] QR code scanner
- [ ] Manual attendance
- [ ] History view
- [ ] Real-time updates

### Management

- [ ] Student management
- [ ] Teacher management
- [ ] Class management
- [ ] Schedule management

### Reports

- [ ] Daily attendance report
- [ ] Weekly report
- [ ] Monthly report
- [ ] Export to PDF/Excel

## 🔧 Configuration

### API Endpoints

```typescript
// services/api.ts
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
```

### State Management

```typescript
// store/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
```

## 📱 Device Testing

### Android Emulator

1. Install Android Studio
2. Create virtual device
3. Run `npm run android`

### iOS Simulator (macOS)

1. Install Xcode
2. Run `npm run ios`

1. Install Expo Go app
2. Run `npm start`
3. Scan QR code

## 📦 Build APK & Firebase FCM Setup (EAS Build / Cloud)

Untuk membangun aplikasi siap pakai (file APK) di cloud Expo dan mengaktifkan fitur Push Notification Firebase FCM:

### 1. Konfigurasi Firebase FCM
1. Unduh file **`google-services.json`** dari Firebase Console proyek Anda (`smk-rajasa` dengan package name `com.smksrajasa.absensi`).
2. Taruh file `google-services.json` tersebut di dalam folder **`frontend/`**.
3. File ini sudah otomatis didaftarkan di dalam [app.json](file:///c:/Users/luthf/OneDrive/Desktop/KULIAH/semester%206/KKN/sistem-absensi/frontend/app.json) di bawah properti `"android": { "googleServicesFile": "./google-services.json" }`.

### 2. Kompilasi Cloud via EAS Build
Jalankan perintah ini di dalam folder `frontend/` untuk memicu build:

* **Build APK Uji Coba (Siap Pasang/Install):**
  ```bash
  eas build --platform android --profile preview
  ```
* **Build Development Client (Untuk Debugging):**
  ```bash
  eas build --platform android --profile development
  ```
* **Build Latar Belakang (Tanpa Terminal Menunggu):**
  ```bash
  eas build --platform android --profile preview --no-wait
  ```

---

## 🐛 Troubleshooting

### API Connection Error

- Pastikan backend running di port 8000
- Check `.env` API URL configuration
- Verify network connectivity

### Build Error

- Clear cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo start --clear`

### Module Not Found

- Check import paths
- Verify file exists
- Restart development server

## 📚 Documentation

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)

## 🤝 Contributing

Contribusi dipersilahkan! Silakan submit PR atau buat issue.

## 📝 License

MIT License
