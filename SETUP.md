# 🚀 SETUP SISTEM ABSENSI DIGITAL - SMKS RAJASA

## Struktur Project

```
sistem-absensi/
├── backend/                 # Laravel 12 REST API
├── frontend/                # Expo React Native App
├── desain-sistem.txt        # Dokumentasi desain
└── SETUP.md                 # File ini
```

---

## ⚙️ Prerequisites

- **PHP 8.3+** ✅ (Installed)
- **Composer** ✅ (Installed)
- **Node.js 24+** ✅ (Installed)
- **npm/yarn** ✅ (Installed)
- **MySQL 8.0+** (Pastikan sudah running)

---

## 🔧 Setup Backend (Laravel)

### 1. Configure Database MySQL

Edit file `.env` di folder `backend/`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistem_absensi
DB_USERNAME=root
DB_PASSWORD=
```

### 2. Buat Database

```powershell
# Buka MySQL
mysql -u root

# Buat database
CREATE DATABASE sistem_absensi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. Run Migrations

```powershell
cd backend
php artisan migrate
```

### 4. Generate App Key (jika belum ada)

```powershell
php artisan key:generate
```

### 5. Publish Sanctum Config

```powershell
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 6. Publish Permission Config

```powershell
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
```

### 7. Setup Storage Link

```powershell
php artisan storage:link
```

### 8. Seed Database (Optional)

```powershell
php artisan db:seed
```

### 9. Start Backend Server

```powershell
# Terminal 1: Laravel Server
php artisan serve

# Terminal 2: Reverb Server (untuk Realtime)
php artisan reverb:start
```

Backend akan berjalan di: **http://localhost:8000**

---

## 📱 Setup Frontend (Expo)

### 1. Configure API URL

Edit atau buat file `services/api.ts`:

```typescript
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
```

### 2. Start Frontend Server

```powershell
cd frontend
npm start
# atau
npx expo start
```

### 3. Buka di Device/Emulator

- **Android**: Tekan `a` di terminal
- **iOS**: Tekan `i` di terminal
- **Web**: Tekan `w` di terminal
- **Expo Go**: Scan QR Code dengan Expo Go app

---

## 📁 Backend Structure

```
backend/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       └── Api/              # API Controllers
│   ├── Models/                   # Database Models
│   ├── Repositories/             # Data Access Layer
│   ├── Services/                 # Business Logic
│   └── Enums/                    # Enum Classes
├── routes/
│   └── api.php                   # API Routes
├── database/
│   ├── migrations/               # Database Migrations
│   └── seeders/                  # Database Seeders
├── storage/
│   └── app/                      # File Storage
└── .env                          # Environment Configuration
```

---

## 📁 Frontend Structure

```
frontend/
├── app/
│   ├── auth/                     # Auth Screens
│   ├── dashboard/                # Dashboard Screens
│   │   ├── admin/
│   │   ├── guru/
│   │   └── siswa/
│   ├── attendance/               # Attendance Screens
│   ├── students/                 # Student Management
│   ├── teachers/                 # Teacher Management
│   ├── classes/                  # Class Management
│   └── reports/                  # Reports
├── components/
│   ├── ui/                       # Reusable UI Components
│   ├── cards/                    # Card Components
│   ├── charts/                   # Chart Components
│   └── forms/                    # Form Components
├── services/
│   ├── api.ts                    # API Client
│   └── auth.ts                   # Auth Service
├── store/
│   ├── authStore.ts              # Auth State
│   └── attendanceStore.ts        # Attendance State
└── package.json
```

---

## 🔐 Installed Packages

### Backend

- `laravel/sanctum` - API Authentication
- `spatie/laravel-permission` - Role & Permission
- `barryvdh/laravel-dompdf` - PDF Export
- `maatwebsite/excel` - Excel Export
- `simplesoftwareio/simple-qrcode` - QR Code Generator
- `spatie/laravel-activitylog` - Activity Logging
- `laravel/reverb` - Real-time Sockets

### Frontend

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

---

## 📝 Next Steps

1. **Buat Models Laravel** di `backend/app/Models/`
   - User, Role, Student, Teacher, Class, Subject, Schedule, Attendance, etc.

2. **Buat Migrations** untuk tabel database
3. **Buat API Controllers** di `backend/app/Http/Controllers/Api/`

4. **Setup API Routes** di `backend/routes/api.php`

5. **Buat Frontend Screens** di `frontend/app/`

6. **Setup Authentication Flow** (Login/Register)

7. **Integrate QR Code Scanner** untuk absensi

8. **Setup Real-time Dashboard** dengan Reverb

---

## 🚨 Troubleshooting

### Backend Issues

- **CORS Error**: Setup CORS middleware di `config/cors.php`
- **Database Connection**: Pastikan MySQL running dan credentials benar
- **Storage Permission**: Jalankan `php artisan storage:link`

### Frontend Issues

- **API Connection**: Pastikan backend running di port 8000
- **Expo Issues**: Update Expo SDK: `npm install -g expo-cli@latest`
- **Android Emulator**: Pastikan Android Studio & Emulator running

---

## 🎯 Development Workflow

```powershell
# Terminal 1: Backend Server
cd backend
php artisan serve

# Terminal 2: Reverb (Realtime)
cd backend
php artisan reverb:start

# Terminal 3: Frontend
cd frontend
npm start
```

---

## 📚 Reference

- [Laravel 12 Docs](https://laravel.com/docs/12)
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

---

**Happy Coding! 🎉**
