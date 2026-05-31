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
                'value' => '-7.245583',
                'description' => 'Garis Lintang (Latitude) SMKS Rajasa Surabaya',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'school_longitude',
                'value' => '112.737750',
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
