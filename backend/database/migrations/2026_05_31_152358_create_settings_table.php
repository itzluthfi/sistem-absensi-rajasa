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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->index();
            $table->text('value')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });
 
        // Seed default school GPS settings
        DB::table('settings')->insert([
            [
                'key' => 'school_latitude',
                'value' => '-7.243641',
                'description' => 'Garis Lintang (Latitude) SMKS Rajasa Surabaya',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'school_longitude',
                'value' => '112.735156',
                'description' => 'Garis Bujur (Longitude) SMKS Rajasa Surabaya',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'school_radius_meters',
                'value' => '100',
                'description' => 'Radius toleransi absensi siswa dalam meter',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'school_entry_attendance_mode',
                'value' => 'scan',
                'description' => 'Mode absensi masuk sekolah: scan (oleh petugas piket) atau click (klik mandiri siswa dengan GPS)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'enable_daily_checkout',
                'value' => 'false',
                'description' => 'Mengaktifkan absensi pulang harian: true (wajib) atau false (tidak wajib)',
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
        Schema::dropIfExists('settings');
    }
};
