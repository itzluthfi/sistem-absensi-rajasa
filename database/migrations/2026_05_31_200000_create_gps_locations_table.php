<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gps_locations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->comment('Nama titik lokasi, misal: Gedung Utama, Lab Komputer');
            $table->double('latitude', 10, 7);
            $table->double('longitude', 10, 7);
            $table->unsignedInteger('radius_meters')->default(100)->comment('Radius geofence dalam meter');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed initial location from existing settings table if exists
        $lat  = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'school_latitude')->value('value')  ?? -7.243641;
        $lng  = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'school_longitude')->value('value') ?? 112.735156;
        $rad  = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'school_radius_meters')->value('value') ?? 100;

        \Illuminate\Support\Facades\DB::table('gps_locations')->insert([
            'name'          => 'SMK Rajasa',
            'latitude'      => (double) $lat,
            'longitude'     => (double) $lng,
            'radius_meters' => (int) $rad,
            'is_active'     => true,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('gps_locations');
    }
};
