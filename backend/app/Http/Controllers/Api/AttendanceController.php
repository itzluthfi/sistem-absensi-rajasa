<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Events\AttendanceMarked;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AttendanceController extends BaseController
{
    /**
     * Display a listing of attendance
     * Role-based filtering is now handled in API routes
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $query = Attendance::with(['student', 'class']);

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->whereBetween('date', [$request->start_date, $request->end_date]);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by class
            if ($request->has('class_id')) {
                $query->where('class_id', $request->class_id);
            }

            // Filter by student
            if ($request->has('student_id')) {
                $query->where('student_id', $request->student_id);
            }

            // Filter by schedule
            if ($request->has('schedule_id')) {
                $query->where('schedule_id', $request->schedule_id);
            }

            // Role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                // Siswa can only see their own attendance
                $query->where('student_id', $user->student->id);
            }

            $perPage = $request->input('per_page', 20);
            $attendances = $query->orderBy('date', 'desc')->orderBy('time', 'desc')->paginate($perPage);

            return $this->sendResponse($attendances);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data absensi. Silakan coba lagi.');
        }
    }

    /**
     * Display the specified attendance
     */
    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();
            $att = Attendance::with(['student', 'class'])->findOrFail($id);

            // Log the view
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_READ,
                'description' => "Viewed attendance #{$id}",
                'model_type' => Attendance::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse($att);
        } catch (\Exception $e) {
            return $this->sendError('Absensi tidak ditemukan', [], 404);
        }
    }

    /**
     * Store a newly created attendance
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $data = $request->validate([
                'student_id' => 'required|exists:students,id',
                'class_id' => 'nullable|exists:classes,id',
                'date' => 'required|date',
                'time' => 'required',
                'status' => 'required|in:hadir,telat,izin,sakit,alpha,ditolak',
                'location' => 'nullable|array',
            ]);

            // Check permission (handled by middleware, but double check here)
            if (!$user->hasPermissionTo('attendance.create') && !$user->hasRole(['super_admin', 'admin', 'guru', 'wali_kelas'])) {
                return $this->sendError('Anda tidak memiliki izin untuk membuat absensi.', [], 403);
            }

            $data['recorded_by'] = $user->id;

            $attendance = Attendance::create($data);

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Created attendance for student #{$data['student_id']} ({$data['status']})",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'new_values' => $data,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Broadcast event for realtime dashboard
            try {
                event(new AttendanceMarked($attendance));
            } catch (\Exception $e) {
                // Ignore broadcast errors
            }

            return $this->sendResponse($attendance->load('student', 'class'), 'Absensi tersimpan', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal menyimpan absensi. Silakan coba lagi.');
        }
    }

    /**
     * Haversine formula to calculate distance between coordinates in meters
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // in meters
        
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        
        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);
             
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earthRadius * $c; // distance in meters
    }

    /**
     * QR Code scan for attendance (Siswa Scan QR Guru)
     */
    public function qrScan(Request $request)
    {
        try {
            $user = $request->user();

            $data = $request->validate([
                'session_id' => 'required|exists:attendance_sessions,id',
                'student_id' => 'required|exists:students,id',
                'qr_token' => 'nullable|string',
                'timestamp' => 'required|string',
                'location' => 'nullable|array',
                'device_info' => 'nullable|string',
                'notes' => 'nullable|string',
            ]);

            // Validate that session is active and matches today
            $session = \App\Models\AttendanceSession::findOrFail($data['session_id']);
            $today = now()->toDateString();
            
            if (!$session->is_active || $session->attendance_date->toDateString() !== $today) {
                return $this->sendError('Sesi absensi sudah tidak aktif atau berbeda hari.', [], 422);
            }

            // Validate secure session token ONLY if session requires QR
            if ($session->require_qr) {
                if (empty($data['qr_token']) || $session->qr_token !== $data['qr_token']) {
                    return $this->sendError('Token QR Code tidak valid atau wajib melakukan scan QR.', [], 422);
                }
            }

            // Verify student class matches schedule class (SMK class-package boundary!)
            $student = \App\Models\Student::findOrFail($data['student_id']);
            $schedule = $session->schedule;
            
            if ($student->class_id !== $schedule->class_id) {
                return $this->sendError('Anda tidak terdaftar di kelas untuk mata pelajaran ini.', [], 422);
            }

            // GPS Validation (Within 100 meters of SMKS Rajasa Surabaya)
            // Coordinates of SMKS Rajasa Surabaya: Latitude -7.245583, Longitude 112.737750
            if ($request->has('location') && isset($data['location']['latitude']) && isset($data['location']['longitude'])) {
                $schoolLat = -7.245583;
                $schoolLng = 112.737750;
                $distance = $this->calculateDistance(
                    $data['location']['latitude'],
                    $data['location']['longitude'],
                    $schoolLat,
                    $schoolLng
                );
                
                // Max radius threshold: 100 meters
                if ($distance > 100) {
                    return $this->sendError('Anda berada di luar radius kelas (' . round($distance) . 'm dari sekolah). Absensi ditolak.', [], 422);
                }
            }

            // Verify student hasn't already checked in for this session (ignoring rejected ones)
            $existing = Attendance::where('student_id', $student->id)
                ->where('attendance_session_id', $session->id)
                ->where('status', '!=', 'ditolak')
                ->first();

            if ($existing) {
                return $this->sendError('Anda sudah melakukan absensi untuk pelajaran ini.', [], 422);
            }

            // Calculate status & late minutes based on schedule start_time
            // Lateness threshold: 15 minutes tolerance after start_time
            $now = now();
            $startTime = \Carbon\Carbon::parse($schedule->start_time);
            $toleranceTime = (clone $startTime)->addMinutes(15);
            
            $status = 'hadir';
            $lateMinutes = 0;
            
            if ($now->format('H:i:s') > $toleranceTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = max(0, $now->diffInMinutes($startTime));
            }

            $attendanceData = [
                'attendance_session_id' => $session->id,
                'schedule_id' => $schedule->id,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'date' => $today,
                'time' => $now->format('H:i:s'),
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'recorded_by' => $user->id,
                'location' => $data['location'] ?? null,
                'device_info' => $data['device_info'] ?? null,
                'notes' => $data['notes'] ?? null,
            ];

            $attendance = Attendance::create($attendanceData);

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Student #{$student->id} marked as {$status} (late: {$lateMinutes}m) via QR scan",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Broadcast event
            try {
                event(new AttendanceMarked($attendance));
            } catch (\Exception $e) {
                // Ignore broadcast errors
            }

            return $this->sendResponse(
                $attendance->load(['student', 'class']), 
                'Absensi berhasil dicatat sebagai ' . ($status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir tepat waktu.')
            );
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memproses absensi: ' . $e->getMessage());
        }
    }

    /**
     * QR Code scan for attendance (Guru Scan QR Siswa)
     */
    public function qrStudentScan(Request $request)
    {
        try {
            $user = $request->user();

            // Only teacher or admin can scan student
            if (!$user->hasRole(['super_admin', 'admin', 'guru', 'wali_kelas'])) {
                return $this->sendError('Hanya Guru atau Staf yang dapat memindai QR siswa.', [], 403);
            }

            $data = $request->validate([
                'session_id' => 'required|exists:attendance_sessions,id',
                'student_id' => 'required|exists:students,id',
                'timestamp' => 'required|string',
                'notes' => 'nullable|string',
            ]);

            $session = \App\Models\AttendanceSession::findOrFail($data['session_id']);
            $today = now()->toDateString();

            if (!$session->is_active || $session->attendance_date->toDateString() !== $today) {
                return $this->sendError('Sesi absensi sudah tidak aktif atau berbeda hari.', [], 422);
            }

            $schedule = $session->schedule;

            // Verify teacher owns the session schedule
            if ($user->hasRole('guru') && $user->teacher && $schedule->teacher_id !== $user->teacher->id) {
                return $this->sendError('Anda hanya dapat mencatat absensi untuk kelas mengajar Anda sendiri.', [], 403);
            }

            // Verify student belongs to class
            $student = \App\Models\Student::findOrFail($data['student_id']);
            if ($student->class_id !== $schedule->class_id) {
                return $this->sendError('Siswa tidak terdaftar di kelas untuk sesi pelajaran ini.', [], 422);
            }

            // Verify student hasn't already checked in for this session (ignoring rejected ones)
            $existing = Attendance::where('student_id', $student->id)
                ->where('attendance_session_id', $session->id)
                ->where('status', '!=', 'ditolak')
                ->first();

            if ($existing) {
                return $this->sendError('Siswa sudah melakukan absensi untuk sesi pelajaran ini.', [], 422);
            }

            // Calculate status & lateness
            $now = now();
            $startTime = \Carbon\Carbon::parse($schedule->start_time);
            $toleranceTime = (clone $startTime)->addMinutes(15);
            
            $status = 'hadir';
            $lateMinutes = 0;
            
            if ($now->format('H:i:s') > $toleranceTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = max(0, $now->diffInMinutes($startTime));
            }

            $attendanceData = [
                'attendance_session_id' => $session->id,
                'schedule_id' => $schedule->id,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'date' => $today,
                'time' => $now->format('H:i:s'),
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'recorded_by' => $user->id,
                'notes' => $data['notes'] ?? 'Ditelusuri oleh Guru',
            ];

            $attendance = Attendance::create($attendanceData);

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Guru marked student #{$student->id} as {$status} via student QR scan",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Broadcast event
            try {
                event(new AttendanceMarked($attendance));
            } catch (\Exception $e) {
                // Ignore broadcast errors
            }

            return $this->sendResponse(
                $attendance->load(['student', 'class']),
                'Absensi siswa ' . $student->full_name . ' berhasil dicatat sebagai ' . ($status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir.')
            );
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memproses absensi siswa: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified attendance
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();

            $att = Attendance::findOrFail($id);
            $oldStatus = $att->status;

            // Update status to 'ditolak' rather than deleting the record
            $att->status = 'ditolak';
            $att->save();

            // Audit log for this reject update
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Rejected attendance #{$id} for student #{$att->student_id} (changed from {$oldStatus} to ditolak)",
                'model_type' => Attendance::class,
                'model_id' => $id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'ditolak'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse($att->load(['student', 'class']), 'Absensi berhasil ditolak');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menolak absensi.');
        }
    }

    /**
     * Get today's statistics
     */
    public function todayStats(Request $request)
    {
        try {
            $user = $request->user();

            $today = now()->toDateString();

            $query = Attendance::where('date', $today);

            // Apply role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('student_id', $user->student->id);
            }

            $stats = [
                'total' => $query->count(),
                'hadir' => (clone $query)->where('status', 'hadir')->count(),
                'telat' => (clone $query)->where('status', 'telat')->count(),
                'izin' => (clone $query)->where('status', 'izin')->count(),
                'sakit' => (clone $query)->where('status', 'sakit')->count(),
                'alpha' => (clone $query)->where('status', 'alpha')->count(),
            ];

            return $this->sendResponse($stats);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil statistik.');
        }
    }

    /**
     * Daily School Check-in (Absen Harian Masuk Sekolah)
     */
    public function dailyCheckIn(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user->hasRole('siswa') || !$user->student) {
                return $this->sendError('Hanya siswa yang dapat melakukan absen masuk sekolah.', [], 403);
            }
            
            $student = $user->student;
            $today = now()->toDateString();
            
            // Check if already checked in today for school entry (schedule_id is null)
            $existing = Attendance::where('student_id', $student->id)
                ->whereNull('schedule_id')
                ->where('date', $today)
                ->first();
                
            if ($existing) {
                return $this->sendError('Anda sudah melakukan absen masuk sekolah hari ini.', [], 422);
            }
            
            // GPS Geofencing (optional, validate within 100m of school)
            if ($request->has('location') && isset($request->location['latitude']) && isset($request->location['longitude'])) {
                $schoolLat = -7.245583;
                $schoolLng = 112.737750;
                $distance = $this->calculateDistance(
                    $request->location['latitude'],
                    $request->location['longitude'],
                    $schoolLat,
                    $schoolLng
                );
                
                if ($distance > 100) {
                    return $this->sendError('Anda berada di luar radius sekolah (' . round($distance) . 'm dari sekolah).', [], 422);
                }
            }
            
            // Morning limit for tardiness: 07:00 AM
            $now = now();
            $schoolStartTime = \Carbon\Carbon::parse('07:00:00');
            
            $status = 'hadir';
            $lateMinutes = 0;
            
            if ($now->format('H:i:s') > $schoolStartTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = max(0, $now->diffInMinutes($schoolStartTime));
            }
            
            $attendance = Attendance::create([
                'attendance_session_id' => null,
                'schedule_id' => null,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'date' => $today,
                'time' => $now->format('H:i:s'),
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'recorded_by' => $user->id,
                'location' => $request->input('location'),
                'device_info' => $request->input('device_info', 'Expo Mobile Client'),
                'notes' => 'Absen Masuk Sekolah Harian Mandiri',
            ]);
            
            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Student #{$student->id} completed Daily School Check-In ({$status})",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            
            return $this->sendResponse(
                $attendance->load(['student', 'class']),
                'Absen masuk sekolah berhasil dicatat sebagai ' . ($status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir tepat waktu.')
            );
        } catch (\Exception $e) {
            return $this->sendError('Gagal melakukan absen masuk sekolah: ' . $e->getMessage());
        }
    }
}