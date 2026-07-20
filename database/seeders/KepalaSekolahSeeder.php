<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class KepalaSekolahSeeder extends Seeder
{
    public function run(): void
    {
        $kepalaSekolah = [
            'name' => 'Ibu Dr. Siti Rahayu, M.Pd.',
            'email' => 'kepsek@example.com',
        ];

        $user = User::updateOrCreate([
            'email' => $kepalaSekolah['email'],
        ], [
            'name' => $kepalaSekolah['name'],
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        // Assign role kepala_sekolah
        $user->syncRoles(['kepala_sekolah']);
    }
}
