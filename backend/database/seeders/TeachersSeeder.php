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
            // Guru biasa (index 0 - 5)
            ['name' => 'Pak Budi Santoso, S.T.', 'email' => 'budi@example.com', 'nip' => 'T001', 'role' => 'guru'],
            ['name' => 'Ibu Siti Aminah, S.Pd.', 'email' => 'siti@example.com', 'nip' => 'T002', 'role' => 'guru'],
            ['name' => 'Pak Bambang Hermawan, M.Pd.', 'email' => 'bambang@example.com', 'nip' => 'T003', 'role' => 'guru'],
            ['name' => 'Ibu Sri Wahyuni, S.S.', 'email' => 'sri@example.com', 'nip' => 'T004', 'role' => 'guru'],
            ['name' => 'Pak Hendra Wijaya, M.T.', 'email' => 'hendra@example.com', 'nip' => 'T005', 'role' => 'guru'],
            ['name' => 'Ibu Ani Yudhoyono, S.Pd.', 'email' => 'ani@example.com', 'nip' => 'T006', 'role' => 'guru'],

            // Guru biasa (index 6 - 24, total 19)
            ['name' => 'Pak H. Ahmad Wijaya, S.E.', 'email' => 'ahmad@example.com', 'nip' => 'T007', 'role' => 'guru'],
            ['name' => 'Ibu Dra. Rina Marlina', 'email' => 'rina@example.com', 'nip' => 'T008', 'role' => 'guru'],
            ['name' => 'Pak Eko Prasetyo, S.T.', 'email' => 'eko@example.com', 'nip' => 'T009', 'role' => 'guru'],
            ['name' => 'Ibu Lilis Suryani, S.Pd.', 'email' => 'lilis@example.com', 'nip' => 'T010', 'role' => 'guru'],
            ['name' => 'Pak Joko Susilo, S.Kom.', 'email' => 'joko@example.com', 'nip' => 'T011', 'role' => 'guru'],
            ['name' => 'Ibu Megawati, S.Pd.', 'email' => 'megawati@example.com', 'nip' => 'T012', 'role' => 'guru'],
            ['name' => 'Ibu Kartini, S.Pd.', 'email' => 'kartini@example.com', 'nip' => 'T013', 'role' => 'guru'],
            ['name' => 'Pak Agus Salim, S.Pd.', 'email' => 'agus@example.com', 'nip' => 'T014', 'role' => 'guru'],
            ['name' => 'Ibu Dewi Sartika, M.Pd.', 'email' => 'dewi@example.com', 'nip' => 'T015', 'role' => 'guru'],
            ['name' => 'Pak Rudi Hartono, S.E.', 'email' => 'rudi@example.com', 'nip' => 'T016', 'role' => 'guru'],
            ['name' => 'Pak Triyono, S.T.', 'email' => 'triyono@example.com', 'nip' => 'T017', 'role' => 'guru'],
            ['name' => 'Pak Jusuf Kalla, M.B.A.', 'email' => 'jusuf@example.com', 'nip' => 'T018', 'role' => 'guru'],
            ['name' => 'Pak Surya Paloh, S.IP.', 'email' => 'surya@example.com', 'nip' => 'T019', 'role' => 'guru'],
            ['name' => 'Ibu Megawati Soekarnoputri', 'email' => 'megawati_s@example.com', 'nip' => 'T020', 'role' => 'guru'],
            ['name' => 'Pak Prabowo Subianto, S.IP.', 'email' => 'prabowo@example.com', 'nip' => 'T021', 'role' => 'guru'],
            ['name' => 'Pak Joko Widodo, S.Hut.', 'email' => 'jokowi@example.com', 'nip' => 'T022', 'role' => 'guru'],
            ['name' => 'Ibu Sri Mulyani, Ph.D.', 'email' => 'sri_mulyani@example.com', 'nip' => 'T023', 'role' => 'guru'],
            ['name' => 'Pak Sandiaga Uno, M.B.A.', 'email' => 'sandiaga@example.com', 'nip' => 'T024', 'role' => 'guru'],
            ['name' => 'Ibu Khofifah Indar Parawansa, M.Si.', 'email' => 'khofifah@example.com', 'nip' => 'T025', 'role' => 'guru'],
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
