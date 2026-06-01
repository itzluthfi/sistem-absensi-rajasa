<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\Major;
use App\Models\Teacher;
use App\Models\AcademicPeriod;
use Illuminate\Database\Seeder;

class ClassesSeeder extends Seeder
{
    public function run(): void
    {
        $majors = Major::all()->keyBy('major_code');
        
        // Ambil hanya guru yang memiliki role 'wali_kelas'
        $waliKelasTeachers = Teacher::whereHas('user', function($query) {
            $query->whereHas('roles', function($rQuery) {
                $rQuery->where('name', 'wali_kelas');
            });
        })->get()->values();

        $activePeriod = AcademicPeriod::where('is_active', true)->first();

        // 19 Kelas representatif
        $classesData = [
            // AKL
            ['class_name' => 'X AKL 1', 'major_code' => 'AKL'],
            ['class_name' => 'XI AKL 1', 'major_code' => 'AKL'],
            ['class_name' => 'XII AKL 1', 'major_code' => 'AKL'],

            // MP
            ['class_name' => 'X MP 1', 'major_code' => 'MP'],
            ['class_name' => 'XI MP 1', 'major_code' => 'MP'],
            ['class_name' => 'XII MP 1', 'major_code' => 'MP'],

            // TITL
            ['class_name' => 'X TITL 1', 'major_code' => 'TITL'],
            ['class_name' => 'XI TITL 1', 'major_code' => 'TITL'],
            ['class_name' => 'XII TITL 1', 'major_code' => 'TITL'],

            // TKRO
            ['class_name' => 'X TKRO 1', 'major_code' => 'TKRO'],
            ['class_name' => 'XI TKRO 1', 'major_code' => 'TKRO'],
            ['class_name' => 'XII TKRO 1', 'major_code' => 'TKRO'],

            // TKJ
            ['class_name' => 'X TKJ 1', 'major_code' => 'TKJ'],
            ['class_name' => 'X TKJ 2', 'major_code' => 'TKJ'],
            ['class_name' => 'XI TKJ 1', 'major_code' => 'TKJ'],
            ['class_name' => 'XII TKJ 1', 'major_code' => 'TKJ'],

            // TPM
            ['class_name' => 'X TPM 1', 'major_code' => 'TPM'],
            ['class_name' => 'XI TPM 1', 'major_code' => 'TPM'],
            ['class_name' => 'XII TPM 1', 'major_code' => 'TPM'],
        ];

        foreach ($classesData as $idx => $class) {
            $major = $majors->get($class['major_code']);
            
            // Setiap kelas dipasangkan dengan 1 wali kelas unik secara sekuensial
            $homeroomTeacher = $waliKelasTeachers->get($idx);

            if ($major) {
                SchoolClass::updateOrCreate([
                    'class_name' => $class['class_name'],
                ], [
                    'major_id' => $major->id,
                    'homeroom_teacher_id' => $homeroomTeacher ? $homeroomTeacher->id : null,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'academic_year' => '2025/2026'
                ]);
            }
        }
    }
}
