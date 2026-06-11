<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StudentsController;
use App\Http\Controllers\Api\TeachersController;
use App\Http\Controllers\Api\ClassesController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\QRController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\GpsLocationsController;
use App\Http\Controllers\Api\UsersController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

/**
 * API Routes - Sistem Absensi Digital SMKS Rajasa
 *
 * All routes defined here are prefixed with '/api'
 */

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::get('/qr/session', [QRController::class, 'sessionQr']);

// ============================================
// PROTECTED ROUTES (Requires Authentication)
// ============================================
Route::middleware('auth:sanctum')->group(function () {

    // Broadcasting Authorization (requires sanctum token)
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    // ----------------------------------------
    // Auth Routes - All authenticated users
    // ----------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/refresh-token', [AuthController::class, 'refreshToken']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/device-token', [AuthController::class, 'registerDeviceToken']);
    });

    // ============================================
    // STUDENTS - Role-based Access
    // ============================================
    // Admin & Super Admin: Full CRUD
    // Wali Kelas: Read (hanya kelas sendiri)
    // Guru: Read (hanya kelas sendiri)
    // Siswa: Read (hanya profil sendiri)
    // Kepala Sekolah: Read all
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('students', [StudentsController::class, 'store']);
        Route::put('students/{id}', [StudentsController::class, 'update']);
        Route::delete('students/{id}', [StudentsController::class, 'destroy']);
        Route::post('students/promote-bulk', [StudentsController::class, 'promoteBulk']);
    });

    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::post('students/{id}/reset-device', [StudentsController::class, 'resetDevice']);
    });

    Route::middleware('role:super_admin,admin,guru,kepala_sekolah,siswa')->group(function () {
        Route::get('students', [StudentsController::class, 'index']);
        Route::get('students/{id}', [StudentsController::class, 'show']);
    });

    // ============================================
    // TEACHERS - Role-based Access
    // ============================================
    // Admin & Super Admin: Full CRUD
    // Guru: Read
    // Kepala Sekolah: Read all
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('teachers', [TeachersController::class, 'store']);
        Route::put('teachers/{id}', [TeachersController::class, 'update']);
        Route::delete('teachers/{id}', [TeachersController::class, 'destroy']);
    });

    Route::middleware('role:super_admin,admin,guru,kepala_sekolah')->group(function () {
        Route::get('teachers', [TeachersController::class, 'index']);
        Route::get('teachers/{id}', [TeachersController::class, 'show']);
    });

    // ============================================
    // CLASSES - Role-based Access
    // ============================================
    // Admin & Super Admin: Full CRUD
    // Wali Kelas: Read (kelas sendiri)
    // Kepala Sekolah: Read all
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('classes', [ClassesController::class, 'store']);
        Route::put('classes/{id}', [ClassesController::class, 'update']);
        Route::delete('classes/{id}', [ClassesController::class, 'destroy']);
    });

    Route::middleware('role:super_admin,admin,kepala_sekolah')->group(function () {
        Route::get('classes', [ClassesController::class, 'index']);
        Route::get('classes/{id}', [ClassesController::class, 'show']);
    });

    // ============================================
    // ATTENDANCE - Role-based Access
    // ============================================
    // Admin & Super Admin: Full access
    // Guru: Create (absen siswa), Read
    // Wali Kelas: Create, Read (kelas sendiri)
    // Siswa: Create (absen sendiri), Read (profil sendiri)
    // Kepala Sekolah: Read all

    // Create attendance - Guru, Wali Kelas, Siswa
    Route::middleware('role:super_admin,admin,guru,siswa')->group(function () {
        Route::post('attendance', [AttendanceController::class, 'store']);
        Route::post('attendance/qr-scan', [AttendanceController::class, 'qrScan']);
        Route::post('attendance/qr-student-scan', [AttendanceController::class, 'qrStudentScan']);
        Route::post('attendance/daily-checkin', [AttendanceController::class, 'dailyCheckIn']);
        Route::post('attendance/daily-checkout', [AttendanceController::class, 'dailyCheckOut']);
        Route::post('attendance/scan-gate', [AttendanceController::class, 'scanGate']);
        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::get('attendance/{id}', [AttendanceController::class, 'show']);
        
        // Attendance sessions routes
        Route::get('attendance-sessions', [\App\Http\Controllers\Api\AttendanceSessionController::class, 'index']);
        Route::post('attendance-sessions', [\App\Http\Controllers\Api\AttendanceSessionController::class, 'store']);
        Route::get('attendance-sessions/{id}', [\App\Http\Controllers\Api\AttendanceSessionController::class, 'show']);
        Route::post('attendance-sessions/{id}/close', [\App\Http\Controllers\Api\AttendanceSessionController::class, 'close']);
    });

    // Absen gerbang oleh petugas / guru piket
    Route::middleware('role:super_admin,admin,petugas,guru')->group(function () {
        Route::post('attendance/petugas-scan', [AttendanceController::class, 'petugasScan']);
        Route::get('petugas/classes', [AttendanceController::class, 'getPetugasClasses']);
    });

    // Delete attendance - Admin, Guru, Wali Kelas
    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::delete('attendance/{id}', [AttendanceController::class, 'destroy']);
    });

    // ============================================
    // REPORTS - Role-based Access
    // ============================================
    // Admin, Guru, Wali Kelas, Kepala Sekolah: Can export
    Route::middleware('role:super_admin,admin,guru,kepala_sekolah')->group(function () {
        Route::get('reports/attendance/csv', [ReportController::class, 'attendanceCsv']);
        Route::get('reports/attendance/pdf', [ReportController::class, 'attendancePdf']);
        Route::get('reports/attendance/percent-excel', [ReportController::class, 'attendancePercentExcel']);
        Route::get('reports/attendance/percent-pdf', [ReportController::class, 'attendancePercentPdf']);
        Route::get('reports/attendance/summary', [ReportController::class, 'attendanceSummary']);
        
        // Alias for frontend compatibility
        Route::get('attendance/summary', [ReportController::class, 'attendanceSummary']);
    });

    // ============================================
    // LEAVE REQUESTS - Role-based Access
    // ============================================
    // All authenticated users can view and create
    Route::get('leave-requests', [LeaveRequestController::class, 'index']);
    Route::get('leave-requests/{id}', [LeaveRequestController::class, 'show']);
    Route::post('leave-requests', [LeaveRequestController::class, 'store']);

    // Approve/Reject - Guru, Wali Kelas, Admin, Super Admin
    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::post('leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
        Route::post('leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);
    });

    // ============================================
    // NOTIFICATIONS - Role-based Access
    // ============================================
    // All authenticated users can view their notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Send notification - Admin & Super Admin only
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('notifications/send', [NotificationController::class, 'sendTest']);
        Route::post('notifications/broadcast', [NotificationController::class, 'broadcast']);
    });

    // ============================================
    // QR CODE GENERATION
    // ============================================
    // Admin: Generate all QR codes
    // Guru: Generate QR for their students
    // Wali Kelas: Generate QR for their class
    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::get('qr/student/{id}', [QRController::class, 'studentQr']);
        Route::get('qr/class/{classId}', [QRController::class, 'classQr']);
    });

    // Students can view their own QR
    Route::middleware('role:siswa')->group(function () {
        Route::get('qr/my-qr', [QRController::class, 'myQr']);
    });

    // ============================================
    // ROLES & PERMISSIONS - Admin Only
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::apiResource('users', UsersController::class);
        Route::get('roles', [RoleController::class, 'index']);
        Route::get('roles/{id}', [RoleController::class, 'show']);
        Route::post('roles', [RoleController::class, 'store']);
        Route::put('roles/{id}', [RoleController::class, 'update']);
        Route::delete('roles/{id}', [RoleController::class, 'destroy']);
        Route::post('roles/assign', [RoleController::class, 'assignRole']);
        Route::post('roles/revoke', [RoleController::class, 'revokeRole']);
        Route::post('roles/give-permission', [RoleController::class, 'givePermissionToRole']);
        Route::post('roles/revoke-permission', [RoleController::class, 'revokePermissionFromRole']);
    });

    // ============================================
    // AUDIT LOG - Admin Only
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
        Route::get('audit-logs/{id}', [\App\Http\Controllers\Api\AuditLogController::class, 'show']);
    });

    // ============================================
    // NOTIFICATION LOG - Admin Only
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('notification-logs', [\App\Http\Controllers\Api\NotificationLogController::class, 'index']);
        Route::delete('notification-logs', [\App\Http\Controllers\Api\NotificationLogController::class, 'clear']);
    });

    // ============================================
    // SUBJECTS (Mata Pelajaran)
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::apiResource('subjects', \App\Http\Controllers\Api\SubjectController::class);
    });

    Route::middleware('role:super_admin,admin,guru,kepala_sekolah')->group(function () {
        Route::get('subjects', [\App\Http\Controllers\Api\SubjectController::class, 'index']);
        Route::get('subjects/{id}', [\App\Http\Controllers\Api\SubjectController::class, 'show']);
    });

    // ============================================
    // SCHEDULES (Jadwal Pelajaran)
    // ============================================
    Route::middleware('role:super_admin,admin,guru,siswa,kepala_sekolah')->group(function () {
        Route::get('schedules/today', [\App\Http\Controllers\Api\ScheduleController::class, 'today']);
    });

    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::apiResource('schedules', \App\Http\Controllers\Api\ScheduleController::class);
    });

    Route::middleware('role:super_admin,admin,guru,siswa,kepala_sekolah')->group(function () {
        Route::get('schedules', [\App\Http\Controllers\Api\ScheduleController::class, 'index']);
        Route::get('schedules/{id}', [\App\Http\Controllers\Api\ScheduleController::class, 'show']);
    });

    // ============================================
    // ACADEMIC PERIODS
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('academic-periods', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'store']);
        Route::put('academic-periods/{id}', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'update']);
        Route::delete('academic-periods/{id}', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'destroy']);
        Route::post('academic-periods/{id}/sync-transition', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'syncTransition']);
    });

    Route::middleware('role:super_admin,admin,guru,siswa,kepala_sekolah')->group(function () {
        Route::get('academic-periods', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'index']);
        Route::get('academic-periods/{id}', [\App\Http\Controllers\Api\AcademicPeriodsController::class, 'show']);
    });

    // ============================================
    // SETTINGS (GPS Configuration)
    // ============================================
    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::get('settings/gps', [SettingsController::class, 'getGpsSettings']);
    });
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::put('settings/gps', [SettingsController::class, 'updateGpsSettings']);
    });

    // Settings & Konfigurasi Mode Absensi
    Route::middleware('role:super_admin,admin,guru,siswa,kepala_sekolah,petugas')->group(function () {
        Route::get('settings/entry-mode', [SettingsController::class, 'getEntryMode']);
    });
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::put('settings/entry-mode', [SettingsController::class, 'updateEntryMode']);
    });

    // ============================================
    // GPS LOCATIONS (Multiple Geofence Points)
    // ============================================
    Route::middleware('role:super_admin,admin,guru')->group(function () {
        Route::get('gps-locations', [GpsLocationsController::class, 'index']);
    });
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('gps-locations', [GpsLocationsController::class, 'store']);
        Route::put('gps-locations/{id}', [GpsLocationsController::class, 'update']);
        Route::delete('gps-locations/{id}', [GpsLocationsController::class, 'destroy']);
        Route::post('gps-locations/{id}/toggle', [GpsLocationsController::class, 'toggle']);
    });

    // ============================================
    // EXCEL IMPORT & EXPORT
    // ============================================
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('import-export/export/{type}', [\App\Http\Controllers\Api\ImportExportController::class, 'export']);
        Route::get('import-export/template/{type}', [\App\Http\Controllers\Api\ImportExportController::class, 'template']);
        Route::post('import-export/import/{type}', [\App\Http\Controllers\Api\ImportExportController::class, 'import']);
    });
});