# 📚 Sistem Absensi Digital SMKS Rajasa Surabaya

<p align="center">
  <img src="frontend/assets/images/logo.png" alt="Logo SMKS Rajasa" width="180"/>
</p>

Sistem Absensi Digital berbasis mobile untuk **SMKS Rajasa Surabaya** - Aplikasi absensi siswa modern berbasis mata pelajaran (**Subject & Session Based QR**) menggunakan QR Code secure token, validasi lokasi GPS (`expo-location`), serta pengelolaan data otomatis berbasis **Periode Akademik & Sistem Paket Kelas**.

---

## 📋 Daftar Isi
- [Deskripsi](#-deskripsi)
- [Karakteristik SMKS Rajasa](#-karakteristik-smks-rajasa)
- [Alur Absensi Hibrida](#-alur-absensi-hibrida)
- [Tech Stack](#-tech-stack)
- [Struktur Database](#-struktur-database)
- [Relasi Tabel](#-relasi-tabel)
- [User & Role Uji Coba](#-user--role-uji-coba)
- [API Endpoints Baru](#-api-endpoints-baru)
- [Instalasi](#-instalasi)

---

## 📝 Deskripsi

Sistem Absensi Digital SMKS Rajasa dirancang khusus untuk memodernisasi absensi sekolah dengan tingkat keamanan tinggi. Sistem ini mencatat kehadiran **per sesi mata pelajaran sesuai jadwal hari ini**, mencegah siswa bolos di tengah hari sekolah, serta memudahkan Wali Kelas, Guru, dan Kepala Sekolah memonitor rekap kehadiran secara realtime.

---

## 🏫 Karakteristik SMKS Rajasa

Sistem absensi ini diselaraskan dengan aturan dan profil riil **SMKS Rajasa Surabaya**:
1. **6 Jurusan / Kompetensi Keahlian**:
   * **AKL** (Akuntansi dan Keuangan Lembaga)
   * **MP** (Manajemen Perkantoran)
   * **TITL** (Teknik Instalasi Tenaga Listrik)
   * **TKRO** (Teknik Kendaraan Ringan Otomotif)
   * **TKJ** (Teknik Komputer dan Jaringan)
   * **TPM** (Teknik Pemesinan)
2. **Sistem 5 Hari Kerja (Full Day)**: 
   Jadwal pelajaran (`schedules`) dikonfigurasi hanya untuk **Senin s.d. Jumat**. Status keterlambatan dihitung secara dinamis per sesi pelajaran berdasarkan toleransi 15 menit dari jam mulai (`start_time`), adil untuk transisi kelas Full Day.
3. **Struktur Kelas Rombel yang Riil**: 
   Penamaan kelas menggunakan format formal rombel SMK (misal: `X TKJ 1`, `XI AKL 1`, `XII TPM 1`) untuk menampung skala rombel sekolah.
4. **Sistem Paket Kelas (Periode Akademik)**:
   Siswa tidak perlu merancang jadwal (KRS) manual. Siswa dipaketkan langsung ke suatu kelas untuk Periode Aktif berjalan (misal: *Semester Ganjil 2025/2026*). Saat ganti semester, data lama tersimpan rapi sebagai arsip dan siswa dinaikkan ke kelas baru.

---

## 🔄 Alur Absensi Hibrida (Session-Based QR)

Sistem menyediakan metode absensi hibrida dinamis di dalam kelas:

* **Opsi 1: Siswa Scan QR Guru (Rekomendasi)**:
  1. Guru menekan tombol **"Buka Presensi Kelas"** di jadwal hari ini pada Beranda (mengaktifkan sesi absensi baru).
  2. Aplikasi Guru menampilkan **QR Code Sesi** (berisi token unik secure).
  3. Siswa masuk ke menu scan di HP-nya, memindai QR Guru, dan aplikasi otomatis mendeteksi koordinat GPS (`expo-location`).
  4. Server Laravel memvalidasi jarak GPS siswa dengan koordinat sekolah SMKS Rajasa Surabaya (Lat: `-7.245583`, Lng: `112.737750`). Jika berada di luar radius 100 meter, absensi ditolak untuk mencegah titip absen.
* **Opsi 2: Guru Scan QR Siswa (Cadangan)**:
  1. Siswa menekan **"Tampilkan QR Absen Saya"** di HP-nya yang menghasilkan token unik berbatas waktu.
  2. Guru mengaktifkan kamera pemindai di HP Guru untuk men-scan QR tersebut. Kehadiran tercatat instan di HP siswa.

---

## 💻 Tech Stack

### Backend
* **PHP 8.2+** / **Laravel 12**
* **Laravel Sanctum** (API Authentication)
* **Spatie Permission** (RBAC & Granular Permissions)
* **Barryvdh DomPDF** (Export PDF)
* **MySQL** (Database)

### Frontend
* **React Native** / **Expo SDK 54** (Universal Codebase)
* **TypeScript** (100% Type-Safe)
* **Expo Router** (File-based Navigation)
* **Zustand** (Global State Management)
* **Axios** (HTTP REST Client)

---

## 🗄️ Struktur Database

### Tabel Utama

| Tabel | Deskripsi |
|---|---|
| **academic_periods** | Menyimpan daftar tahun ajaran dan semester aktif/tidak aktif |
| **users** | Akun autentikasi untuk login (Multi-Role) |
| **students** | Profil siswa terikat dengan user dan kelas aktif |
| **teachers** | Profil guru terikat dengan user |
| **classes** | Data rombel kelas terikat ke jurusan dan periode akademik aktif |
| **majors** | 6 Jurusan resmi SMKS Rajasa |
| **subjects** | Daftar mata pelajaran |
| **schedules** | Jadwal mingguan per kelas (Senin - Jumat) terikat ke periode |
| **attendance_sessions**| Sesi absensi yang dibuka guru per jadwal pelajaran hari ini |
| **attendances** | Riwayat kehadiran siswa terikat ke sesi aktif, durasi keterlambatan, GPS, dan metadata perangkat |
| **leave_requests** | Pengajuan izin online |
| **audit_logs** | Rekam jejak audit keamanan sistem |

---

## 🔗 Relasi Tabel

```
academic_periods
├── hasMany → classes               (1:N) - Kelas dalam periode ini
├── hasMany → schedules             (1:N) - Jadwal dalam periode ini
└── hasMany → attendance_sessions   (1:N) - Sesi kelas dalam periode ini

school_classes (classes)
├── belongsTo → academic_periods    (N:1) - Semester aktif kelas
├── belongsTo → majors             (N:1) - Kompetensi keahlian
├── belongsTo → teachers (homeroom)(N:1) - Wali kelas
├── hasMany → students             (1:N) - Anggota siswa kelas
└── hasMany → schedules            (1:N) - Jadwal kelas

attendance_sessions
├── belongsTo → schedules           (N:1) - Jadwal rujukan sesi
├── belongsTo → academic_periods    (N:1) - Semester sesi pelajaran
└── hasMany → attendances           (1:N) - Log hadir siswa di sesi ini

attendances
├── belongsTo → students            (N:1) - Murid pengabsen
├── belongsTo → attendance_sessions (N:1) - Sesi pelajaran yang di-absen
└── belongsTo → school_classes      (N:1) - Kelas saat absen
```

---

## 👥 User & Role Uji Coba

Gunakan kredensial berikut untuk melakukan pengujian lokal (Password untuk semua akun adalah `password`):

| Email | Role | Nama Lengkap / Kegunaan |
|---|---|---|
| `admin@example.com` | **Super Admin** | Akses Penuh Sistem & Pengaturan Periode |
| `siswa@example.com` | **Siswa** | Akun Siswa Utama (Terdaftar di Kelas **X TKJ 1**) |
| `rina@example.com` | **Wali Kelas** | Wali Kelas **X TKJ 1** / Kelola Absensi & Izin |
| `budi@example.com` | **Guru** | Guru Pengajar (Buka Sesi & Scan QR Siswa) |
| `siswa1@example.com` s/d `siswa20@example.com` | **Siswa** | Siswa Mockup yang didistribusikan di berbagai kelas |

---

## 🔌 API Endpoints Baru

Berikut adalah endpoint baru yang dikonstruksikan untuk alur hibrida sesi kelas:

### 📅 Schedules (Jadwal)
* `GET /api/schedules/today` -> Menampilkan jadwal pelajaran/mengajar hari ini sesuai user login (termasuk status absen siswa dan tanda keaktifan sesi kelas).

### ⏳ Sesi Pelajaran (`attendance-sessions`)
* `POST /api/attendance-sessions` -> Buka sesi absensi per jadwal kelas (Guru).
* `POST /api/attendance-sessions/{id}/close` -> Tutup sesi absensi manual (Guru).
* `GET /api/attendance-sessions/{id}` -> Ambil sesi aktif dan daftar kehadiran realtime.
* `GET /api/attendance-sessions` -> List seluruh sesi hari ini.

### 🎯 Pemindaian Presensi (`attendance`)
* `POST /api/attendance/qr-scan` -> Siswa memindai QR Guru (Validasi GPS Sekolah, Token Sesi, Kelas, & Status Terlambat).
* `POST /api/attendance/qr-student-scan` -> Guru memindai QR Siswa (Validasi Sesi Aktif & Identitas Siswa).

---

## 🚀 Instalasi

### Setup Backend Laravel
```bash
# Pindah ke direktori backend
cd backend

# Pasang dependensi
composer install

# Siapkan file .env lokal
cp .env.example .env

# Generate security key
php artisan key:generate

# Konfigurasi database di file .env Anda (DB_DATABASE=sistem_absensi)

# Jalankan migrasi dan penyemaian data terpadu SMKS Rajasa Surabaya
php artisan migrate:fresh --seed

# Jalankan server lokal
php artisan serve
```

### Setup Frontend Expo App
```bash
# Pindah ke direktori frontend
cd frontend

# Pasang dependensi
npm install

# Uji kepatuhan tipe TypeScript (0 Error)
npm run typecheck

# Jalankan Expo CLI
npx expo start
```

---

## 📱 Cara Build APK Mandiri (Android Standalone App)

Aplikasi mobile Expo dapat dikompilasi menjadi berkas installer **`.apk`** mandiri untuk diinstal secara langsung di ponsel Android tanpa melalui aplikasi pihak ketiga (seperti Expo Go).

Terdapat dua cara untuk melakukan kompilasi lokal di komputer Windows Anda:

### ⚙️ Persyaratan Awal (Prerequisites)
Sebelum melakukan build lokal, pastikan komputer Windows Anda memiliki:
1. **Java Development Kit (JDK 17)** terinstal. Cek via terminal: `java -version`.
2. **Android SDK** terinstal (biasanya otomatis jika Anda menginstal *Android Studio*).
3. Mengatur variabel lingkungan sistem `ANDROID_HOME` mengarah ke lokasi Android SDK Anda (misal: `C:\Users\luthf\AppData\Local\Android\Sdk`).

---

### 🚀 Metode 1: Kompilasi Instan via Terminal (Direkomendasikan)
Metode ini adalah cara tercepat untuk memproduksi file `.apk` langsung menggunakan Gradle Wrapper di terminal/PowerShell Anda:

1. **Jalankan Inisialisasi Expo Prebuild lokal** (untuk menghasilkan folder native `/android` terkonfigurasi otomatis):
   ```bash
   cd frontend
   npx expo prebuild -p android --no-install
   ```
2. **Masuk ke folder native android**:
   ```bash
   cd android
   ```
3. **Mulai proses kompilasi**:
   * **Untuk Versi Debug (Mudah & Cepat untuk diinstal langsung)**:
     ```powershell
     .\gradlew assembleDebug
     ```
   * **Untuk Versi Release (Ukuran optimal & performa produksi)**:
     ```powershell
     .\gradlew assembleRelease
     ```
4. **Temukan File APK Anda**:
   * Output file `.apk` siap pasang akan berada di direktori:
     `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (atau `release/app-release.apk`).
   * *Salin file `app-debug.apk` tersebut ke ponsel Android Anda dan klik pasang!*

---

### 💻 Metode 2: Kompilasi via Android Studio
Jika Anda ingin menandatangani (*signing*) sertifikat digital secara visual atau mengaudit kode native:

1. Jalankan inisialisasi prebuild di terminal terlebih dahulu:
   ```bash
   cd frontend
   npx expo prebuild -p android --no-install
   ```
2. Buka aplikasi **Android Studio**.
3. Pilih **Open an Existing Project** dan arahkan ke folder:
   `sistem-absensi/frontend/android`
4. Tunggu sinkronisasi sistem Gradle hingga selesai (notifikasi sukses akan muncul di kanan bawah).
5. Lakukan Build:
   * **Untuk APK Uji Coba**: Pilih menu **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**. Klik tombol **Locate** pada notifikasi sukses untuk membuka folder hasil.
   * **Untuk APK Rilis Resmi**: Pilih menu **Build -> Generate Signed Bundle / APK...**, pilih opsi **APK**, lalu buat Keystore baru untuk menandatangani tanda tangan digital keamanan aplikasi rilis Anda secara permanen.

---

## 👨‍💻 credit

Dibuat dengan ❤️ untuk **SMKS Rajasa Surabaya**

