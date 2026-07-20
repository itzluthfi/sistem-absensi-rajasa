<?php

namespace Database\Seeders;

use App\Models\AcademicPeriod;
use Illuminate\Database\Seeder;

class AcademicPeriodsSeeder extends Seeder
{
    public function run(): void
    {
        AcademicPeriod::firstOrCreate([
            'semester' => 'ganjil',
            'academic_year' => '2025/2026',
        ], [
            'name' => 'Tahun Ajaran 2025/2026 - Ganjil',
            'is_active' => true,
            'start_date' => '2025-07-01',
            'end_date' => '2025-12-31',
        ]);

        AcademicPeriod::firstOrCreate([
            'semester' => 'genap',
            'academic_year' => '2025/2026',
        ], [
            'name' => 'Tahun Ajaran 2025/2026 - Genap',
            'is_active' => false,
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
        ]);
    }
}
