<?php

namespace Database\Seeders;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TeachersSeeder extends Seeder
{
    public function run(): void
    {
        $teachers = [
            ['name' => 'Pak Budi Santoso, S.T.', 'email' => 'budi@example.com', 'nip' => 'T001', 'role' => 'guru'],
            ['name' => 'Ibu Siti Aminah, S.Pd.', 'email' => 'siti@example.com', 'nip' => 'T002', 'role' => 'guru'],
            ['name' => 'Pak H. Ahmad Wijaya, S.E.', 'email' => 'ahmad@example.com', 'nip' => 'T003', 'role' => 'wali_kelas'],
            ['name' => 'Ibu Dra. Rina Marlina', 'email' => 'rina@example.com', 'nip' => 'T004', 'role' => 'wali_kelas'],
            ['name' => 'Pak Eko Prasetyo, S.T.', 'email' => 'eko@example.com', 'nip' => 'T005', 'role' => 'wali_kelas'],
            ['name' => 'Ibu Lilis Suryani, S.Pd.', 'email' => 'lilis@example.com', 'nip' => 'T006', 'role' => 'wali_kelas'],
        ];

        foreach ($teachers as $t) {
            $user = User::firstOrCreate([
                'email' => $t['email'],
            ], [
                'name' => $t['name'],
                'password' => Hash::make('password'),
                'is_active' => true,
            ]);

            Teacher::updateOrCreate([
                'user_id' => $user->id,
            ], [
                'nip' => $t['nip'],
                'full_name' => $t['name'],
            ]);

            $user->syncRoles([$t['role']]);
        }
    }
}
