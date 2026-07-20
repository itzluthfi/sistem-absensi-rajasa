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
        // Eager load hubungan major
        $classes = SchoolClass::with('major')->get();
        $teachers = Teacher::all();
        $subjects = Subject::all();
        $activePeriod = AcademicPeriod::where('is_active', true)->first();

        if ($classes->isEmpty() || $teachers->isEmpty() || $subjects->isEmpty()) {
            return;
        }

        // Cari Pak Budi Santoso (NIP T001) untuk dibatasi
        $budi = $teachers->first(function($t) {
            return $t->nip === 'T001';
        });

        // 5 Hari Sekolah
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        // Inisialisasi pelacak beban mengajar dan kesibukan guru per slot
        $workload = [];
        $busy = [];

        foreach ($classes as $class) {
            $majorCode = $class->major ? $class->major->major_code : 'TKJ';

            // Filter mata pelajaran berdasarkan jurusan
            $prefix = match($majorCode) {
                'AKL' => 'AKT',
                'MP' => 'MP',
                'TITL' => 'LIS',
                'TKRO' => 'OTO',
                'TKJ' => 'TKJ',
                'TPM' => 'TPM',
                default => 'TKJ'
            };

            $classSubjects = $subjects->filter(function($subj) use ($prefix) {
                $code = $subj->subject_code;
                return in_array($code, ['MAT', 'BIND', 'BING', 'PPKN', 'PJOK', 'PKK']) 
                    || str_starts_with($code, $prefix);
            })->values();

            if ($classSubjects->isEmpty()) {
                $classSubjects = $subjects->values();
            }

            foreach ($days as $dayIndex => $day) {
                // Tentukan slot jam pelajaran
                $slots = [
                    ['start' => '07:00:00', 'end' => '08:30:00'],
                    ['start' => '08:30:00', 'end' => '10:00:00'],
                    ['start' => '10:30:00', 'end' => ($day === 'Friday' ? '11:30:00' : '12:00:00')],
                ];
                
                if ($day !== 'Friday') {
                    $slots[] = ['start' => '13:00:00', 'end' => '14:30:00'];
                }

                foreach ($slots as $slotIndex => $slot) {
                    $startTime = $slot['start'];
                    $endTime = $slot['end'];

                    // Index pelajaran bergulir secara dinamis
                    $subjIndex = ($dayIndex * 4 + $slotIndex + $class->id) % $classSubjects->count();
                    $subject = $classSubjects->get($subjIndex);

                    // Pool guru yang berhak mengajar
                    $eligible = $teachers;

                    // Pak Budi Santoso (budi@example.com) hanya mengajar di kelas X TITL 1
                    if ($class->class_name !== 'X TITL 1' && $budi) {
                        $eligible = $eligible->filter(function($t) use ($budi) {
                            return $t->id !== $budi->id;
                        });
                    }

                    // Saring guru yang sedang bebas di jam & hari ini untuk menghindari tabrakan jadwal
                    $available = $eligible->filter(function($t) use ($day, $startTime, $busy) {
                        return !isset($busy[$day][$startTime][$t->id]);
                    });

                    if ($available->isEmpty()) {
                        // Fallback jika tidak ada guru yang kosong (seharusnya tidak terjadi karena rasio guru 25 : 19 kelas)
                        $selectedTeacher = $eligible->sortBy(function($t) use ($workload) {
                            return $workload[$t->id] ?? 0;
                        })->first();
                    } else {
                        // Pilih guru dengan beban mengajar paling sedikit untuk pembagian yang merata
                        $selectedTeacher = $available->sortBy(function($t) use ($workload) {
                            return $workload[$t->id] ?? 0;
                        })->first();
                    }

                    // Tandai guru sebagai sibuk di slot ini dan tambah beban mengajarnya
                    if ($selectedTeacher) {
                        $busy[$day][$startTime][$selectedTeacher->id] = true;
                        $workload[$selectedTeacher->id] = ($workload[$selectedTeacher->id] ?? 0) + 1;
                    }

                    Schedule::updateOrCreate([
                        'class_id' => $class->id,
                        'day_name' => $day,
                        'start_time' => $startTime,
                    ], [
                        'subject_id' => $subject->id,
                        'teacher_id' => $selectedTeacher ? $selectedTeacher->id : null,
                        'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                        'end_time' => $endTime,
                        'room' => 'R.' . ($class->major ? $class->major->major_code : 'X') . ' - ' . ($class->id + 10),
                    ]);
                }
            }
        }
    }
}
