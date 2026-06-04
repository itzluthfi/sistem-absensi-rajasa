<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // ============================================
        // STEP 1: Create Roles
        // ============================================
        $this->call([
            RolesSeeder::class,
        ]);

        // ============================================
        // STEP 2: Create Permissions & Assign to Roles
        // ============================================
        $this->call([
            PermissionsSeeder::class,
        ]);

        // ============================================
        // STEP 3: User Seeders (Admin & Super Admin)
        // ============================================

        $testUser = User::updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $testUser->syncRoles(['admin']);

        $adminUser = User::updateOrCreate([
            'email' => 'admin@example.com',
        ], [
            'name' => 'Administrator',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $adminUser->syncRoles(['super_admin']);

        // ============================================
        // STEP 4: Academic Seeders
        // ============================================

        $this->call([
            MajorsSeeder::class,
            AcademicPeriodsSeeder::class,
            TeachersSeeder::class,
            WaliKelasSeeder::class,
            ClassesSeeder::class,
            StudentsSeeder::class,
            SubjectsSeeder::class,
            SchedulesSeeder::class,
            AttendancesSeeder::class,
        ]);

        // ============================================
        // STEP 5: Special Role Seeder (Kepala Sekolah)
        // ============================================

        $this->call([
            KepalaSekolahSeeder::class,
            PetugasSeeder::class,
        ]);
    }
}