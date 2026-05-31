<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectsSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            // Core/General Subjects
            ['subject_name' => 'Matematika Terapan', 'subject_code' => 'MAT', 'description' => 'Matematika untuk kebutuhan kejuruan'],
            ['subject_name' => 'Bahasa Indonesia', 'subject_code' => 'BIND', 'description' => 'Bahasa Indonesia tata tulis dan komunikasi resmi'],
            ['subject_name' => 'Bahasa Inggris Komunikasi', 'subject_code' => 'BING', 'description' => 'Bahasa Inggris dunia kerja dan industri'],
            ['subject_name' => 'Pendidikan Pancasila', 'subject_code' => 'PPKN', 'description' => 'Pendidikan kewarganegaraan dan ideologi negara'],
            ['subject_name' => 'Pendidikan Jasmani Olahraga & Kesehatan', 'subject_code' => 'PJOK', 'description' => 'Kesehatan fisik, mental, dan olahraga kebugaran'],
            ['subject_name' => 'Produk Kreatif dan Kewirausahaan', 'subject_code' => 'PKK', 'description' => 'Perencanaan bisnis dan pembuatan produk kreatif kejuruan'],

            // AKL (Accounting) Specific Subjects
            ['subject_name' => 'Akuntansi Keuangan', 'subject_code' => 'AKT-KEU', 'description' => 'Dasar dan praktik akuntansi keuangan entitas bisnis'],
            ['subject_name' => 'Administrasi Perpajakan', 'subject_code' => 'AKT-PJK', 'description' => 'Tata cara pelaporan SPT dan administrasi pajak Indonesia'],
            ['subject_name' => 'Komputer Akuntansi (MYOB)', 'subject_code' => 'AKT-KOMP', 'description' => 'Pengolahan laporan keuangan menggunakan perangkat lunak MYOB'],
            ['subject_name' => 'Praktikum Akuntansi Perusahaan Jasa & Dagang', 'subject_code' => 'AKT-PRAK', 'description' => 'Siklus akuntansi lengkap perusahaan jasa dan dagang'],

            // MP (Office Management) Specific Subjects
            ['subject_name' => 'Kearsipan Perkantoran', 'subject_code' => 'MP-ARS', 'description' => 'Manajemen dan tata laksana pengarsipan dokumen perkantoran'],
            ['subject_name' => 'Otomatisasi Humas dan Keprotokolan', 'subject_code' => 'MP-HUM', 'description' => 'Teknik komunikasi publik dan keprotokolan resmi humas'],
            ['subject_name' => 'Otomatisasi Tata Kelola Keuangan', 'subject_code' => 'MP-KEU', 'description' => 'Administrasi dan pengelolaan kas kecil kantor'],
            ['subject_name' => 'Otomatisasi Tata Kelola Kepegawaian', 'subject_code' => 'MP-PEG', 'description' => 'Sistem administrasi sdm dan tata laksana kepegawaian'],

            // TITL (Electrical) Specific Subjects
            ['subject_name' => 'Instalasi Penerangan Listrik', 'subject_code' => 'LIS-PEN', 'description' => 'Pemasangan jaringan lampu penerangan rumah dan gedung'],
            ['subject_name' => 'Instalasi Tenaga Listrik', 'subject_code' => 'LIS-TEN', 'description' => 'Perancangan dan pemasangan instalasi daya 3-phase industri'],
            ['subject_name' => 'Instalasi Motor Listrik', 'subject_code' => 'LIS-MOT', 'description' => 'Sistem kendali kontaktor magnetik motor listrik'],
            ['subject_name' => 'Perbaikan Peralatan Listrik', 'subject_code' => 'LIS-PER', 'description' => 'Teknik pemeliharaan dan reparasi elektronik rumah tangga'],

            // TKRO (Automotive) Specific Subjects
            ['subject_name' => 'Pemeliharaan Mesin Kendaraan Ringan (PMKR)', 'subject_code' => 'OTO-MES', 'description' => 'Tune-up, perbaikan silinder kop dan sistem mesin otomotif'],
            ['subject_name' => 'Pemeliharaan Sasis & Drivetrain', 'subject_code' => 'OTO-SAS', 'description' => 'Perbaikan sistem rem, kemudi, suspensi, dan transmisi mobil'],
            ['subject_name' => 'Pemeliharaan Kelistrikan Otomotif', 'subject_code' => 'OTO-LIS', 'description' => 'Jaringan kabel body, sistem starter, pengisian, dan efi'],
            ['subject_name' => 'Teknologi Sasis Kendaraan Ringan', 'subject_code' => 'OTO-TEK', 'description' => 'Dasar sasis modern dan teknologi suspensi pintar'],

            // TKJ (Network) Specific Subjects
            ['subject_name' => 'Administrasi Infrastruktur Jaringan (AIJ)', 'subject_code' => 'TKJ-AIJ', 'description' => 'Konfigurasi routing dinamis, VLAN, dan firewall Mikrotik/Cisco'],
            ['subject_name' => 'Administrasi Sistem Jaringan (ASJ)', 'subject_code' => 'TKJ-ASJ', 'description' => 'Instalasi OS server Linux, web server, DNS, mail server, dan database'],
            ['subject_name' => 'Teknologi Layanan Jaringan (TLJ)', 'subject_code' => 'TKJ-TLJ', 'description' => 'Sistem VoIP komunikasi suara berbasis protokol IP'],
            ['subject_name' => 'Keamanan Jaringan Komputer', 'subject_code' => 'TKJ-SEC', 'description' => 'Teknik enkripsi, IPS/IDS, dan mitigasi cyber attack'],

            // TPM (Machining) Specific Subjects
            ['subject_name' => 'Teknik Gambar Manufaktur', 'subject_code' => 'TPM-GAM', 'description' => 'Pembuatan gambar 2D dan 3D komponen mesin menggunakan CAD'],
            ['subject_name' => 'Teknik Pemesinan Bubut', 'subject_code' => 'TPM-BUB', 'description' => 'Praktik pembubutan poros bertingkat, alur, ulir luar/dalam'],
            ['subject_name' => 'Teknik Pemesinan Frais', 'subject_code' => 'TPM-FRA', 'description' => 'Pengerjaan milling roda gigi lurus, roda gigi rack, dan bidang rata'],
            ['subject_name' => 'Teknik Pemesinan CNC', 'subject_code' => 'TPM-CNC', 'description' => 'Pemrograman kode G dan M mesin CNC bubut dan frais pabrik'],
        ];

        foreach ($subjects as $s) {
            Subject::updateOrCreate([
                'subject_code' => $s['subject_code'],
            ], $s);
        }
    }
}
