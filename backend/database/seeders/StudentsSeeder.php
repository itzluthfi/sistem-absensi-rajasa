<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StudentsSeeder extends Seeder
{
    public function run(): void
    {
        $classes = SchoolClass::all();

        if ($classes->isEmpty()) return;

        // Expanded list of 70 realistic mock names
        $names = [
            'Ahmad Fauzi', 'Bambang Hermawan', 'Cici Paramida', 'Dedi Wijaya', 
            'Eka Saputra', 'Fahri Hamzah', 'Gita Gutawa', 'Hendra Setiawan', 
            'Indah Permatasari', 'Joko Susilo', 'Kartika Putri', 'Lukman Hakim', 
            'Muhammad Ridwan', 'Novi Andriani', 'Oki Setiana', 'Putra Siregar',
            'Rian Dwi', 'Santi Wulandari', 'Taufik Hidayat', 'Wahyudi Pratama',
            'Aditya Pratama', 'Bella Saputri', 'Cahyo Utomo', 'Dewi Lestari',
            'Eko Prasetyo', 'Fitriani', 'Galang Ramadhan', 'Hesti Wulandari',
            'Irfan Hakim', 'Julia Perez', 'Kevin Sanjaya', 'Larasati',
            'Mulyono', 'Nabila Syakieb', 'Octavia', 'Panji Petualang',
            'Qori', 'Rizky Billar', 'Sule', 'Tukul Arwana',
            'Udin Sedunia', 'Vicky Prasetyo', 'Wulan Guritno', 'Xena',
            'Yuni Shara', 'Zaskia Gotik', 'Agus Harimurti', 'Bunga Citra',
            'Chelsea Olivia', 'Deddy Corbuzier', 'Elly Sugigi', 'Fatin Shidqia',
            'Gading Marten', 'Hesti Purwadinata', 'Indra Herlambang', 'Jessica Iskandar',
            'Kaesang Pangarep', 'Luna Maya', 'Mulan Jameela', 'Nikita Mirzani',
            'Olga Syahputra', 'Pevita Pearce', 'Raffi Ahmad', 'Syahrini',
            'Tora Sudiro', 'Uus', 'Valerie Thomas', 'Wendi Cagur',
            'Yuki Kato', 'Zumi Zola'
        ];

        // Seed a primary test student account that is easy to remember
        $testUser = User::updateOrCreate([
            'email' => 'siswa@example.com',
        ], [
            'name' => 'Siswa Test Rajasa',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $testUser->syncRoles(['siswa']);

        $tkjClass = SchoolClass::where('class_name', 'X TKJ 1')->first() ?? $classes->first();

        Student::updateOrCreate([
            'user_id' => $testUser->id,
        ], [
            'class_id' => $tkjClass->id,
            'nisn' => '00987654321',
            'nis' => '12345',
            'full_name' => 'Siswa Test Rajasa',
        ]);

        // Seed other mock students and distribute them across classes
        foreach ($names as $index => $name) {
            $studentNum = $index + 1;
            $email = "siswa{$studentNum}@example.com";
            
            // First 9 students go to X TKJ 1 to make it a populated test class (total 10 students with Siswa Test Rajasa)
            if ($index < 9) {
                $class = $tkjClass;
            } else {
                $class = $classes->values()->get($index % $classes->count());
            }

            $user = User::firstOrCreate([
                'email' => $email,
            ], [
                'name' => $name,
                'password' => Hash::make('password'),
                'is_active' => true,
            ]);

            Student::updateOrCreate([
                'user_id' => $user->id,
            ], [
                'class_id' => $class->id,
                'nisn' => 'NISN' . str_pad($studentNum, 4, '0', STR_PAD_LEFT),
                'nis' => 'NIS' . str_pad($studentNum, 4, '0', STR_PAD_LEFT),
                'full_name' => $name,
            ]);

            $user->syncRoles(['siswa']);
        }
    }
}
