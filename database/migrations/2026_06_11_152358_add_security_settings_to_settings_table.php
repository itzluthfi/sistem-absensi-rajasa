<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('settings')->insertOrIgnore([
            [
                'key' => 'security_enable_biometrics',
                'value' => 'true',
                'description' => 'Mengaktifkan verifikasi biometrik (Fingerprint/FaceID) saat presensi',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'security_enable_device_binding',
                'value' => 'true',
                'description' => 'Mengunci akun siswa hanya pada 1 perangkat utama',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'security_enable_geofencing',
                'value' => 'true',
                'description' => 'Membatasi presensi hanya di dalam radius geofence lokasi sekolah',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'security_enable_fake_gps',
                'value' => 'true',
                'description' => 'Mendeteksi dan memblokir presensi menggunakan Fake GPS/Mock Location',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')
            ->whereIn('key', [
                'security_enable_biometrics',
                'security_enable_device_binding',
                'security_enable_geofencing',
                'security_enable_fake_gps'
            ])->delete();
    }
};
