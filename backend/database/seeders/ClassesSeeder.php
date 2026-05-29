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
        $teachers = Teacher::all();
        $activePeriod = AcademicPeriod::where('is_active', true)->first();

        // Seed a realistic representative list of classes across the 6 majors and grades X, XI, XII
        $classesData = [
            // AKL
            ['class_name' => 'X AKL 1', 'major_code' => 'AKL', 'teacher_index' => 2],
            ['class_name' => 'XI AKL 1', 'major_code' => 'AKL', 'teacher_index' => 2],
            ['class_name' => 'XII AKL 1', 'major_code' => 'AKL', 'teacher_index' => 2],

            // MP
            ['class_name' => 'X MP 1', 'major_code' => 'MP', 'teacher_index' => 5],
            ['class_name' => 'XI MP 1', 'major_code' => 'MP', 'teacher_index' => 5],
            ['class_name' => 'XII MP 1', 'major_code' => 'MP', 'teacher_index' => 5],

            // TITL
            ['class_name' => 'X TITL 1', 'major_code' => 'TITL', 'teacher_index' => 0],
            ['class_name' => 'XI TITL 1', 'major_code' => 'TITL', 'teacher_index' => 0],
            ['class_name' => 'XII TITL 1', 'major_code' => 'TITL', 'teacher_index' => 0],

            // TKRO
            ['class_name' => 'X TKRO 1', 'major_code' => 'TKRO', 'teacher_index' => 1],
            ['class_name' => 'XI TKRO 1', 'major_code' => 'TKRO', 'teacher_index' => 1],
            ['class_name' => 'XII TKRO 1', 'major_code' => 'TKRO', 'teacher_index' => 1],

            // TKJ
            ['class_name' => 'X TKJ 1', 'major_code' => 'TKJ', 'teacher_index' => 3],
            ['class_name' => 'X TKJ 2', 'major_code' => 'TKJ', 'teacher_index' => 3],
            ['class_name' => 'XI TKJ 1', 'major_code' => 'TKJ', 'teacher_index' => 3],
            ['class_name' => 'XII TKJ 1', 'major_code' => 'TKJ', 'teacher_index' => 3],

            // TPM
            ['class_name' => 'X TPM 1', 'major_code' => 'TPM', 'teacher_index' => 4],
            ['class_name' => 'XI TPM 1', 'major_code' => 'TPM', 'teacher_index' => 4],
            ['class_name' => 'XII TPM 1', 'major_code' => 'TPM', 'teacher_index' => 4],
        ];

        foreach ($classesData as $class) {
            $major = $majors->get($class['major_code']);
            $teacher = $teachers->values()->get($class['teacher_index']) ?? $teachers->first();

            if ($major) {
                SchoolClass::updateOrCreate([
                    'class_name' => $class['class_name'],
                ], [
                    'major_id' => $major->id,
                    'homeroom_teacher_id' => $teacher ? $teacher->id : null,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'academic_year' => '2025/2026'
                ]);
            }
        }
    }
}
