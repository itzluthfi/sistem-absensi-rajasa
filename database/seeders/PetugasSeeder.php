<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PetugasSeeder extends Seeder
{
    public function run(): void
    {
        $petugas = [
            'name' => 'Pak Budi Jatmiko (Petugas Piket)',
            'email' => 'petugas@example.com',
        ];

        $user = User::updateOrCreate([
            'email' => $petugas['email'],
        ], [
            'name' => $petugas['name'],
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        // Assign role petugas
        $user->syncRoles(['petugas']);
    }
}
