<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectsSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['subject_name' => 'Matematika', 'subject_code' => 'MAT'],
            ['subject_name' => 'Bahasa Indonesia', 'subject_code' => 'BIND'],
            ['subject_name' => 'Pemrograman', 'subject_code' => 'PRG'],
        ];

        foreach ($subjects as $s) {
            Subject::updateOrCreate([
                'subject_code' => $s['subject_code'] ?? null,
            ], $s);
        }
    }
}
