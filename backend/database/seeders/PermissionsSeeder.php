<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            // Student permissions
            'students.view',
            'students.create',
            'students.update',
            'students.delete',

            // Teacher permissions
            'teachers.view',
            'teachers.create',
            'teachers.update',
            'teachers.delete',

            // Class permissions
            'classes.view',
            'classes.create',
            'classes.update',
            'classes.delete',

            // Subject permissions (Mata Pelajaran)
            'subjects.view',
            'subjects.create',
            'subjects.update',
            'subjects.delete',

            // Schedule permissions (Jadwal)
            'schedules.view',
            'schedules.create',
            'schedules.update',
            'schedules.delete',

            // Attendance permissions
            'attendance.view',
            'attendance.create',
            'attendance.update',
            'attendance.delete',
            'attendance.scan',
            'attendance.export',

            // Leave Request permissions
            'leave_requests.view',
            'leave_requests.create',
            'leave_requests.approve',
            'leave_requests.reject',

            // Report permissions
            'reports.view',
            'reports.export',

            // Notification permissions
            'notifications.view',
            'notifications.send',
            'notifications.broadcast',

            // User management permissions
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // Audit log permissions
            'audit_logs.view',
            'audit_logs.export',

            // QR Code permissions
            'qr_codes.generate',
            'qr_codes.view',
        ];

        // Step 1: Create ALL permissions first
        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ]);
        }

        // Step 2: Clear cache to ensure permissions are recognized
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // Step 3: Now assign permissions to roles
        $this->assignPermissionsToRoles();
    }

    private function assignPermissionsToRoles()
    {
        // Super Admin - Full access
        $superAdmin = Role::findByName('super_admin');
        $allPermissions = Permission::pluck('name')->toArray();
        $superAdmin->syncPermissions($allPermissions);

        // Admin - Full CRUD except audit_logs delete
        $admin = Role::findByName('admin');
        $adminPermissions = [
            'students.view', 'students.create', 'students.update', 'students.delete',
            'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
            'classes.view', 'classes.create', 'classes.update', 'classes.delete',
            'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete',
            'schedules.view', 'schedules.create', 'schedules.update', 'schedules.delete',
            'attendance.view', 'attendance.create', 'attendance.delete', 'attendance.scan', 'attendance.export',
            'leave_requests.view', 'leave_requests.create', 'leave_requests.approve', 'leave_requests.reject',
            'reports.view', 'reports.export',
            'notifications.view', 'notifications.send', 'notifications.broadcast',
            'users.view', 'users.create', 'users.update',
            'audit_logs.view',
            'qr_codes.generate',
        ];
        $admin->syncPermissions($adminPermissions);

        // Wali Kelas - Manage their own class
        $waliKelas = Role::findByName('wali_kelas');
        $waliKelasPermissions = [
            'students.view',
            'teachers.view',
            'classes.view',
            'subjects.view',
            'schedules.view',
            'attendance.view', 'attendance.create', 'attendance.scan',
            'leave_requests.view', 'leave_requests.approve', 'leave_requests.reject',
            'reports.view', 'reports.export',
            'notifications.view',
            'qr_codes.generate', 'qr_codes.view',
        ];
        $waliKelas->syncPermissions($waliKelasPermissions);

        // Guru - Basic teaching permissions
        $guru = Role::findByName('guru');
        $guruPermissions = [
            'teachers.view',
            'classes.view',
            'subjects.view',
            'schedules.view',
            'attendance.view', 'attendance.create', 'attendance.scan',
            'leave_requests.view', 'leave_requests.create',
            'reports.view',
            'notifications.view',
            'qr_codes.generate', 'qr_codes.view',
        ];
        $guru->syncPermissions($guruPermissions);

        // Siswa - Limited permissions
        $siswa = Role::findByName('siswa');
        $siswaPermissions = [
            'students.view', // Can view own profile
            'attendance.view', // Can view own attendance
            'attendance.create', // Can mark own attendance (via QR)
            'leave_requests.view', 'leave_requests.create',
            'notifications.view',
            'qr_codes.view', // Can view own QR
        ];
        $siswa->syncPermissions($siswaPermissions);

        // Kepala Sekolah - Read-only supervisory permissions
        $kepalaSekolah = Role::findByName('kepala_sekolah');
        $kepalaSekolahPermissions = [
            'students.view',
            'teachers.view',
            'classes.view',
            'subjects.view',
            'schedules.view',
            'attendance.view',
            'leave_requests.view',
            'reports.view', 'reports.export',
            'notifications.view',
        ];
        $kepalaSekolah->syncPermissions($kepalaSekolahPermissions);

        // Clear cache again after all assignments
        app('cache')->forget('spatie.permission.cache');
    }
}