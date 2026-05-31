# SLIDE-BY-SLIDE PRESENTATION SCRIPT
## DEMONSTRASI & SOSIALISASI RAJASA ACADEMIC SYSTEM (RAS)
*Format ini dirancang khusus untuk paparan di hadapan Kepala Sekolah, Dewan Guru, Staf Tata Usaha, dan Komite/Yayasan SMKS Rajasa Surabaya.*

---

<!-- slide -->
### **SLIDE 1: COVER PRESENTASI (FIRST IMPRESSION)**
*(Desain Premium: Latar belakang biru dongker/navy khas sekolah, aksen gold/silver elegan, logo sekolah di tengah)*

# **DOKUMEN PAPARAN & DEMONSTRASI SISTEM**
## **RAJASA ACADEMIC SYSTEM (RAS)**
### *Transformasi Ekosistem Sekolah Digital Berbasis Dual-Mode Verification, Geofencing GPS, dan Rekapitulasi Real-Time*

**Penyaji:** Tim Pengembang & Implementasi Teknologi Digital
**Ditujukan Kepada:** Kepala Sekolah, Dewan Guru, Staf Tata Usaha, dan Yayasan SMKS Rajasa Surabaya
**Tahun Ajaran:** 2026/2027

---

<!-- slide -->
### **SLIDE 2: LATAR BELAKANG & TUJUAN IMPLEMENTASI**
*(Desain: Menampilkan infografis 3 masalah vs 3 solusi digital)*

#### **Mengapa SMKS Rajasa Membutuhkan RAS?**
1. **Meningkatkan Efisiensi Waktu**: Mengurangi waktu yang terbuang untuk mengabsen siswa secara manual satu per satu di setiap jam pelajaran (rata-rata menghemat 10–15 menit per kelas).
2. **Menjamin Akurasi & Keabsahan Data**: Mencegah manipulasi kehadiran (seperti titip absen atau pemalsuan tanda tangan) melalui sistem pelacakan berbasis lokasi dan persetujuan guru.
3. **Penyederhanaan Administrasi TU**: Proses rekapitulasi data kehadiran bulanan untuk laporan dinas dapat diselesaikan secara otomatis hanya dengan satu klik.
4. **Membangun Kedisiplinan Siswa**: Melatih akuntabilitas dan kedisiplinan siswa SMKS Rajasa melalui pencatatan keterlambatan harian yang presisi.

---

<!-- slide -->
### **SLIDE 3: ARSITEKTUR SISTEM & INFRASTRUKTUR TEKNOLOGI**
*(Desain: Visual alur integrasi data dari HP Siswa & Guru menuju Cloud Server)*

#### **Infrastruktur Modern, Aman, dan Ringan:**
* **Satu Kode Aplikasi untuk Semua (Multi-Platform)**: Aplikasi dapat diakses secara fleksibel menggunakan Laptop/PC (melalui Web) maupun Smartphone Android & iOS milik guru dan siswa.
* **Keamanan Data Tingkat Tinggi (Laravel Sanctum & HTTPS)**: Seluruh pertukaran data dilindungi enkripsi SSL aktif untuk menjaga privasi data guru, siswa, dan sekolah.
* **Penyimpanan Terpusat (Cloud Database)**: Seluruh data terekam secara aman di server, menghilangkan risiko kehilangan berkas fisik akibat kerusakan atau faktor cuaca.
* **Siap Skala Besar**: Arsitektur modular yang siap menampung ribuan data siswa SMKS Rajasa tanpa penurunan performa.

---

<!-- slide -->
### **SLIDE 4: ALUR UTAMA (1) - ABSEN MASUK SEKOLAH (DAILY CHECK-IN)**
*(Desain: Ilustrasi peta sekolah dengan radius lingkaran geofence 100m)*

#### **Sistem Pengawal Kedisiplinan Pagi Siswa:**
1. **Deteksi Lokasi Akurat (GPS Geofencing)**:
   * Siswa wajib mengaktifkan GPS pada smartphone mereka untuk melakukan absen masuk.
   * Sistem hanya mengizinkan absen jika siswa secara fisik telah berada di area sekolah (radius **100 meter** dari koordinat SMKS Rajasa: `-7.245583, 112.737750`).
2. **Kalkulasi Keterlambatan Otomatis**:
   * Jam masuk sekolah ditetapkan pukul **07:00 WIB** (fleksibel dikonfigurasi).
   * Siswa yang melakukan klik absen setelah jam 07:00 WIB akan langsung tercatat sebagai **"Terlambat"** dan sistem otomatis mengalkulasi menit keterlambatannya secara presisi ke dalam sistem.
3. **Kartu Status Dashboard**:
   * Dashboard siswa menampilkan kartu informasi status kehadiran harian secara jelas (Hadir / Terlambat / Belum Absen).

---

<!-- slide -->
### **SLIDE 5: ALUR UTAMA (2) - DUAL-MODE PRESENSI MATA PELAJARAN**
*(Desain: Komparasi kenyamanan guru dalam memilih metode verifikasi kelas)*

#### **Fleksibilitas Guru dalam Mengelola Sesi Kehadiran:**

* **MODE 1: "Hanya Klik Tombol" (Sangat Direkomendasikan / Default)**
  * **Cara Kerja**: Guru membuka sesi mapel di sistem. Siswa cukup menekan tombol "Hadir" pada aplikasi di HP-nya masing-masing.
  * **Manfaat**: Sangat efisien, hemat waktu, dan mencegah kerumunan siswa di depan kelas untuk melakukan scan QR Code. Cocok untuk situasi kelas harian yang padat.
  
* **MODE 2: "Wajib Scan QR Code"**
  * **Cara Kerja**: Guru menampilkan QR Code dinamis dari HP/Proyektor miliknya. Siswa wajib memindai QR Code tersebut secara langsung menggunakan kamera aplikasi.
  * **Manfaat**: Memberikan tingkat keamanan ekstra tinggi jika guru ingin memastikan siswa benar-benar berada di tempat duduknya masing-masing.

---

<!-- slide -->
### **SLIDE 6: ALUR UTAMA (3) - HAK VETO GURU & HAK AKSES PERIZINAN**
*(Desain: Ilustrasi dasbor guru dengan tombol tindakan penolakan visual berwarna merah)*

#### **Menjaga Kedaulatan Penuh Guru dan Validitas Kehadiran:**

#### **1. Fitur "Teacher Override Rejection" (Veto Guru)**
* **Kendala Umum**: Siswa nakal melakukan klik "Hadir" dari kantin atau luar kelas ketika mode "Klik Tombol" diaktifkan.
* **Solusi RAS**: Guru memegang kontrol penuh atas daftar siswa yang masuk. Di layar guru, terdapat **tombol "Tolak Kehadiran" (ikon tempat sampah merah)** di samping nama tiap siswa.
* **Tindakan**: Jika siswa terbukti melakukan kecurangan (absen tapi tidak fisik berada di kelas), Guru dapat membatalkan absensi tersebut seketika. Record otomatis terhapus dari database secara *real-time*.

#### **2. Modul Pengajuan Izin & Sakit Digital**
* Siswa mengunggah foto surat dokter atau surat izin orang tua langsung via aplikasi.
* Guru pengampu atau Wali Kelas menerima notifikasi permohonan tersebut untuk memberikan keputusan **Setuju (Approve)** atau **Tolak (Reject)**.

---

<!-- slide -->
### **SLIDE 7: DESAIN RESPONSIF - PREMIUM DATA TABLES & MOBILE LAYOUT**
*(Desain: Mockup perbandingan antarmuka monitor PC Tata Usaha vs layar Smartphone Guru)*

#### **Optimal di Setiap Perangkat untuk Menunjang Produktivitas Kerja:**

* **Tampilan Desktop (PC Guru & Monitor Staf TU)**:
  * Disajikan dalam bentuk **Premium Data Tables** terstruktur.
  * Format tabel memuat informasi lengkap secara horizontal: NISN, Nama Lengkap, Jam Check-in, Status Kehadiran, Keterlambatan, dan Aksi Kontrol.
  * Sangat memudahkan Staf TU dalam melakukan verifikasi silang dan penyaringan (*filtering*) data dalam jumlah massal.

* **Tampilan Mobile (Smartphone Guru & Siswa)**:
  * Menggunakan sistem **List Card** yang ringkas dan intuitif.
  * Navigasi sentuh yang dioptimalkan untuk performa cepat di lapangan.
  * Hemat kuota data internet dan responsif terhadap pergerakan mobilitas guru di lingkungan sekolah.

---

<!-- slide -->
### **SLIDE 8: PEMBAGIAN TUGAS & FUNGSI FITUR (SISWA & GURU)**
*(Desain: Pembagian area kerja digital Guru vs Siswa)*

#### **Hak Akses & Kemudahan Bagi SISWA:**
* Melakukan absen masuk harian sekolah di pagi hari berdasarkan lokasi GPS (Geofencing).
* Melakukan klaim kehadiran di setiap mata pelajaran melalui HP secara instan.
* Mengunggah foto surat dokter/orang tua secara mandiri jika terpaksa tidak hadir.
* Memantau akumulasi kehadiran pribadi sebagai bahan evaluasi kedisiplinan.

#### **Hak Akses & Otoritas Bagi GURU:**
* Mengaktifkan sesi pelajaran baru dan menentukan metode validasi kelas.
* Memantau daftar presensi kelas yang berjalan secara *real-time* di layar HP/Laptop.
* Membatalkan kehadiran siswa yang melanggar aturan kehadiran di kelas (*override rejection*).
* Melakukan pemeriksaan berkas izin/sakit digital siswa.

---

<!-- slide -->
### **SLIDE 9: PEMBAGIAN TUGAS & FUNGSI FITUR (ADMIN TU, WALI KELAS, & KEPALA SEKOLAH)**
*(Desain: Skema alur koordinasi data tingkat manajerial)*

#### **1. Staf Tata Usaha (ADMIN TU) - Pusat Kontrol Master Data**
* Memegang kendali penuh atas data induk sekolah (Input data Siswa baru, Guru, Kelas, Jurusan, Mapel, dan Jadwal pelajaran).
* Memproses data kehadiran secara massal dan mengunduh laporan bulanan resmi berformat **PDF siap cetak (A4)** atau format **CSV/Excel** untuk pengarsipan dinas.

#### **2. Wali Kelas - Pengawas Akademik Kelas**
* Memantau statistik kehadiran dan grafik keaktifan siswa di bawah perwaliannya.
* Menerima rekap data keterlambatan siswa untuk koordinasi tindak lanjut dengan bimbingan konseling (BK).

#### **3. Kepala Sekolah - Pengambil Kebijakan (Executive Dashboard)**
* Memantau tingkat kehadiran guru dan siswa secara global setiap hari secara real-time via *Read-Only Dashboard* sebagai bahan evaluasi kebijakan sekolah.

---

<!-- slide -->
### **SLIDE 10: STRATEGI DEPLOYMENT & JAMINAN KEAMANAN**
*(Desain: Ikon server awan dengan perisai keamanan)*

#### **Persiapan Menuju Rilis Produksi Sekolah:**

1. **Migrasi Database Aman**:
   * Melakukan migrasi database bersih pada server VPS sekolah: `php artisan migrate --force`.
   * Memasukkan data awal sekolah (jurusan, kelas, guru) menggunakan tools migrasi otomatis.
2. **Hosting Web Frontend via Vercel**:
   * Konfigurasi routing canggih pada `vercel.json` untuk memastikan pengalaman akses web yang cepat, tanpa kendala putus koneksi atau error halaman tidak ditemukan.
3. **Penyebaran Aplikasi Mobile (EAS Build)**:
   * Menghasilkan berkas aplikasi mandiri (.APK) yang siap dibagikan ke seluruh siswa dan guru SMKS Rajasa.
4. **Kewajiban Protokol SSL (HTTPS)**:
   * Menjamin seluruh sistem berjalan di bawah protokol HTTPS demi keamanan transfer koordinat GPS Geofencing siswa dan izin kamera untuk scan QR.

---

<!-- slide -->
### **SLIDE 11: PETA JALAN PENGEMBANGAN - RAS AKADEMIK & PEMBELAJARAN**
*(Desain: Garis waktu masa depan integrasi fitur pembelajaran)*

Sistem RAS dirancang dengan arsitektur masa depan yang siap dikembangkan menjadi pusat sistem informasi sekolah terpadu tanpa perlu membongkar sistem yang sudah ada:

* **1. Modul Penugasan Online (Assignments Hub)**:
  * Guru dapat mengunggah instruksi tugas terstruktur dan berkas soal.
  * Siswa mengumpulkan hasil pekerjaan (dokumen/foto) langsung lewat aplikasi.
  * Koreksi dan penilaian tugas secara langsung di dalam sistem.

* **2. Modul Buku Nilai & E-Rapor Terintegrasi (Grades Engine)**:
  * Pencatatan nilai harian, nilai UTS, dan nilai UAS siswa secara sistematis.
  * Kalkulasi nilai akhir otomatis berdasarkan rumus bobot yang disepakati sekolah.
  * Ekspor berkas rapor digital yang sesuai dengan format Dapodik.

* **3. Modul Perpustakaan & Bahan Ajar Digital (Learning Resources)**:
  * Guru dapat membagikan modul ajar, materi presentasi, modul praktikum, atau link video pembelajaran di satu tempat yang mudah diakses siswa kapan saja.

---

<!-- slide -->
### **SLIDE 12: PETA JALAN PENGEMBANGAN - KELENGKAPAN EKOSISTEM RAS**
*(Desain: Ikon gateway pembayaran digital, konseling, dan integrasi WhatsApp)*

* **4. Sistem Poin Pelanggaran & Prestasi (Discipline & BK Module)**:
  * Pencatatan poin negatif (pelanggaran tata tertib sekolah) dan poin positif (prestasi siswa).
  * Akumulasi skor yang otomatis memicu surat peringatan digital (SP 1, SP 2, SP 3) bagi siswa bermasalah.
  * Membantu tugas Guru BK dalam melakukan *tracking* pembinaan siswa.

* **5. Modul Keuangan & Pembayaran SPP Cashless (School Finance Gateway)**:
  * Integrasi dengan *Payment Gateway* nasional (Midtrans/Xendit) untuk memfasilitasi transaksi pembayaran sekolah digital.
  * Orang tua dapat membayar SPP, uang praktikum, atau iuran lainnya melalui Transfer Bank (Virtual Account), E-Wallet (GoPay, DANA, ShopeePay), maupun kasir minimarket.
  * Pelacakan tunggakan secara otomatis dan penerbitan kuitansi digital sah.

* **6. Portal Orang Tua & Integrasi WhatsApp Gateway**:
  * Akun khusus bagi orang tua untuk memantau absensi masuk pagi anak, progres nilai, poin pelanggaran, serta status tagihan SPP.
  * Pengiriman pesan otomatis (WhatsApp/SMS) ke HP orang tua jika anak terlambat hadir atau tidak masuk tanpa keterangan.

---

<!-- slide -->
### **SLIDE 13: REKOMENDASI BRANDING & NAMA APLIKASI**
*(Desain: Penayangan logo visual minimalis dan modern di layar utama)*

Sebagai bentuk representasi profesionalisme, modernitas, dan kredibilitas SMKS Rajasa Surabaya di mata publik dan dinas pendidikan:

# **Rajasa Academic System (RAS)**
*(Sistem Akademik Terpadu & Kehadiran - SMKS Rajasa)*

> **Visi Pengembangan Ekosistem RAS**:
> *"Menjadikan SMKS Rajasa Surabaya sebagai pelopor institusi pendidikan vokasi berbasis digital terdepan di Surabaya yang transparan, akuntabel, efisien, dan modern melalui pemanfaatan ekosistem Rajasa Academic System."*

---
*(Terima Kasih - Sesi Demonstrasi & Tanya Jawab)*
