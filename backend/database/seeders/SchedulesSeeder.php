<?php

namespace Database\Seeders;

use App\Models\Schedule;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Models\Subject;
use App\Models\AcademicPeriod;
use Illuminate\Database\Seeder;

class SchedulesSeeder extends Seeder
{
    public function run(): void
    {
        // Eager load major relation for correct school-package mappings!
        $classes = SchoolClass::with('major')->get();
        $teachers = Teacher::all();
        $subjects = Subject::all();
        $activePeriod = AcademicPeriod::where('is_active', true)->first();

        if ($classes->isEmpty() || $teachers->isEmpty() || $subjects->isEmpty()) {
            return;
        }

        // Days for a standard Indonesian 5-Day school system (Monday to Friday)
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        foreach ($classes as $class) {
            $majorCode = $class->major ? $class->major->major_code : 'TKJ';

            // Filter subjects based on class major to keep the schedules highly authentic!
            // AKP -> AKT, MP -> MP, TITL -> LIS, TKRO -> OTO, TKJ -> TKJ, TPM -> TPM
            $prefix = match($majorCode) {
                'AKL' => 'AKT',
                'MP' => 'MP',
                'TITL' => 'LIS',
                'TKRO' => 'OTO',
                'TKJ' => 'TKJ',
                'TPM' => 'TPM',
                default => 'TKJ'
            };

            // Selected subjects consist of:
            // 6 general subjects (MAT, BIND, BING, PPKN, PJOK, PKK)
            // + 4 major-specific subjects
            $classSubjects = $subjects->filter(function($subj) use ($prefix) {
                $code = $subj->subject_code;
                return in_array($code, ['MAT', 'BIND', 'BING', 'PPKN', 'PJOK', 'PKK']) 
                    || str_starts_with($code, $prefix);
            })->values();

            if ($classSubjects->isEmpty()) {
                $classSubjects = $subjects->values(); // Fallback to all subjects if filtered list is empty
            }

            foreach ($days as $dayIndex => $day) {
                // Lesson 1: 07:00:00 - 08:30:00
                $subj1Index = ($dayIndex + $class->id * 2) % $classSubjects->count();
                $teach1Index = ($dayIndex * 2 + $class->id) % $teachers->count();
                
                Schedule::updateOrCreate([
                    'class_id' => $class->id,
                    'day_name' => $day,
                    'start_time' => '07:00:00',
                ], [
                    'subject_id' => $classSubjects->get($subj1Index)->id,
                    'teacher_id' => $teachers->values()->get($teach1Index)->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'end_time' => '08:30:00',
                    'room' => 'R.' . ($class->major ? $class->major->major_code : 'X') . ' - ' . ($class->id + 10),
                ]);

                // Lesson 2: 08:30:00 - 10:00:00
                $subj2Index = ($subj1Index + 1) % $classSubjects->count();
                $teach2Index = ($teach1Index + 1) % $teachers->count();
                
                Schedule::updateOrCreate([
                    'class_id' => $class->id,
                    'day_name' => $day,
                    'start_time' => '08:30:00',
                ], [
                    'subject_id' => $classSubjects->get($subj2Index)->id,
                    'teacher_id' => $teachers->values()->get($teach2Index)->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'end_time' => '10:00:00',
                    'room' => 'R.' . ($class->major ? $class->major->major_code : 'X') . ' - ' . ($class->id + 10),
                ]);

                // Lesson 3: 10:30:00 - 12:00:00 (Mon-Thu) or 10:30:00 - 11:30:00 (Friday before prayers)
                $subj3Index = ($subj2Index + 1) % $classSubjects->count();
                $teach3Index = ($teach2Index + 1) % $teachers->count();
                $endTime3 = ($day === 'Friday') ? '11:30:00' : '12:00:00';
                
                Schedule::updateOrCreate([
                    'class_id' => $class->id,
                    'day_name' => $day,
                    'start_time' => '10:30:00',
                ], [
                    'subject_id' => $classSubjects->get($subj3Index)->id,
                    'teacher_id' => $teachers->values()->get($teach3Index)->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'end_time' => $endTime3,
                    'room' => 'R.' . ($class->major ? $class->major->major_code : 'X') . ' - ' . ($class->id + 10),
                ]);

                // Lesson 4: 13:00:00 - 14:30:00 (Senin s.d. Kamis saja)
                if ($day !== 'Friday') {
                    $subj4Index = ($subj3Index + 1) % $classSubjects->count();
                    $teach4Index = ($teach3Index + 1) % $teachers->count();
                    
                    Schedule::updateOrCreate([
                        'class_id' => $class->id,
                        'day_name' => $day,
                        'start_time' => '13:00:00',
                    ], [
                        'subject_id' => $classSubjects->get($subj4Index)->id,
                        'teacher_id' => $teachers->values()->get($teach4Index)->id,
                        'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                        'end_time' => '14:30:00',
                        'room' => 'R.' . ($class->major ? $class->major->major_code : 'X') . ' - ' . ($class->id + 10),
                    ]);
                }
            }
        }
    }
}
