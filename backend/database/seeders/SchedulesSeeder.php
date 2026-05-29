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
        $classes = SchoolClass::all();
        $teachers = Teacher::all();
        $subjects = Subject::all();
        $activePeriod = AcademicPeriod::where('is_active', true)->first();

        if ($classes->isEmpty() || $teachers->isEmpty() || $subjects->isEmpty()) {
            return;
        }

        // Days for a Full Day / 5-Day school system (Monday to Friday only)
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        foreach ($classes as $class) {
            foreach ($days as $dayIndex => $day) {
                // Lesson 1: 07:00 - 08:30
                $subj1Index = ($dayIndex + $class->id) % $subjects->count();
                $teach1Index = ($dayIndex * 2 + $class->id) % $teachers->count();
                
                Schedule::updateOrCreate([
                    'class_id' => $class->id,
                    'day_name' => $day,
                    'start_time' => '07:00:00',
                ], [
                    'subject_id' => $subjects->values()->get($subj1Index)->id,
                    'teacher_id' => $teachers->values()->get($teach1Index)->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'end_time' => '08:30:00',
                ]);

                // Lesson 2: 08:30 - 10:00
                $subj2Index = ($subj1Index + 1) % $subjects->count();
                $teach2Index = ($teach1Index + 1) % $teachers->count();
                
                Schedule::updateOrCreate([
                    'class_id' => $class->id,
                    'day_name' => $day,
                    'start_time' => '08:30:00',
                ], [
                    'subject_id' => $subjects->values()->get($subj2Index)->id,
                    'teacher_id' => $teachers->values()->get($teach2Index)->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'end_time' => '10:00:00',
                ]);

                // Lesson 3 (Only on key days like Monday/Wednesday/Friday for SMK full day): 10:30 - 12:00
                if (in_array($day, ['Monday', 'Wednesday', 'Friday'])) {
                    $subj3Index = ($subj2Index + 1) % $subjects->count();
                    $teach3Index = ($teach2Index + 1) % $teachers->count();
                    
                    Schedule::updateOrCreate([
                        'class_id' => $class->id,
                        'day_name' => $day,
                        'start_time' => '10:30:00',
                    ], [
                        'subject_id' => $subjects->values()->get($subj3Index)->id,
                        'teacher_id' => $teachers->values()->get($teach3Index)->id,
                        'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                        'end_time' => '12:00:00',
                    ]);
                }
            }
        }
    }
}
