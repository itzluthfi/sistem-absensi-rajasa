<?php

namespace Database\Seeders;

use App\Models\Major;
use Illuminate\Database\Seeder;

class MajorsSeeder extends Seeder
{
    public function run(): void
    {
        $majors = [
            ['major_name' => 'Akuntansi dan Keuangan Lembaga', 'major_code' => 'AKL'],
            ['major_name' => 'Manajemen Perkantoran', 'major_code' => 'MP'],
            ['major_name' => 'Teknik Instalasi Tenaga Listrik', 'major_code' => 'TITL'],
            ['major_name' => 'Teknik Kendaraan Ringan Otomotif', 'major_code' => 'TKRO'],
            ['major_name' => 'Teknik Komputer dan Jaringan', 'major_code' => 'TKJ'],
            ['major_name' => 'Teknik Pemesinan', 'major_code' => 'TPM'],
        ];

        foreach ($majors as $m) {
            Major::updateOrCreate([
                'major_code' => $m['major_code'],
            ], $m);
        }
    }
}
