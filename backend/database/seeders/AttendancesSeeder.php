<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class AttendancesSeeder extends Seeder
{
    public function run(): void
    {
        $student = Student::first();
        if (!$student) return;

        for ($d = 0; $d < 5; $d++) {
            $date = Carbon::now()->subDays($d)->toDateString();

            Attendance::updateOrCreate([
                'student_id' => $student->id,
                'date' => $date,
            ], [
                'class_id' => $student->class_id,
                'time' => Carbon::now()->subDays($d)->toTimeString(),
                'status' => $d % 5 == 0 ? 'telat' : 'hadir',
                'location' => ['lat' => -6.200000, 'lng' => 106.816666],
            ]);
        }
    }
}
