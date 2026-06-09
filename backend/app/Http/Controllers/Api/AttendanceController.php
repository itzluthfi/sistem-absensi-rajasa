<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Events\AttendanceMarked;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

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

            $query = \Illuminate\Support\Facades\DB::table('attendances')
                ->leftJoin('students', 'attendances.student_id', '=', 'students.id')
                ->leftJoin('classes', 'attendances.class_id', '=', 'classes.id')
                ->leftJoin('schedules', 'attendances.schedule_id', '=', 'schedules.id')
                ->leftJoin('subjects', 'schedules.subject_id', '=', 'subjects.id')
                ->select([
                    'attendances.*',
                    'students.full_name as student_full_name',
                    'students.nis as student_nis',
                    'classes.class_name as class_class_name',
                    'subjects.subject_name as subject_subject_name'
                ]);

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->whereBetween('attendances.date', [$request->start_date, $request->end_date]);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('attendances.status', $request->status);
            }

            // Filter by class
            if ($request->has('class_id')) {
                $query->where('attendances.class_id', $request->class_id);
            }

            // Filter by student
            if ($request->has('student_id')) {
                $query->where('attendances.student_id', $request->student_id);
            }

            // Filter by schedule
            if ($request->has('schedule_id')) {
                $query->where('attendances.schedule_id', $request->schedule_id);
            }

            // Role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                // Siswa can see attendance for their own class, but not other classes
                $studentClassId = $user->student->class_id;

                if ($request->has('schedule_id')) {
                    // Check if schedule belongs to student's class
                    $schedule = \Illuminate\Support\Facades\DB::table('schedules')
                        ->where('id', $request->schedule_id)
                        ->first();

                    if (!$schedule || $schedule->class_id != $studentClassId) {
                        // Not student's class schedule, restrict to own student_id
                        $query->where('attendances.student_id', $user->student->id);
                    }
                } elseif ($request->has('class_id')) {
                    if ($request->class_id != $studentClassId) {
                        // Not student's class, restrict
                        $query->where('attendances.student_id', $user->student->id);
                    }
                } else {
                    // No specific schedule/class of student, restrict to own student_id
                    $query->where('attendances.student_id', $user->student->id);
                }
            }

            if ($request->boolean('all') || $request->input('paginate') === 'false') {
                $rows = $query->orderBy('attendances.date', 'desc')
                    ->orderBy('attendances.time', 'desc')
                    ->get();
                $formatted = $rows->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'student_id' => $item->student_id,
                        'class_id' => $item->class_id,
                        'schedule_id' => $item->schedule_id,
                        'attendance_session_id' => $item->attendance_session_id,
                        'recorded_by' => isset($item->recorded_by) ? $item->recorded_by : null,
                        'date' => $item->date,
                        'time' => $item->time,
                        'status' => $item->status,
                        'late_minutes' => $item->late_minutes,
                        'device_info' => $item->device_info,
                        'notes' => $item->notes,
                        'location' => $item->location ? json_decode($item->location, true) : null,
                        'checkout_time' => $item->checkout_time,
                        'created_at' => $item->created_at,
                        'updated_at' => $item->updated_at,
                        'subject_name' => $item->subject_subject_name ?? null,
                        'student' => $item->student_id ? [
                            'id' => $item->student_id,
                            'full_name' => $item->student_full_name,
                            'nis' => $item->student_nis
                        ] : null,
                        'class' => $item->class_id ? [
                            'id' => $item->class_id,
                            'class_name' => $item->class_class_name
                        ] : null
                    ];
                });
                return $this->sendResponse($formatted);
            }

            $perPage = $request->input('per_page', 20);
            $attendances = $query->orderBy('attendances.date', 'desc')
                ->orderBy('attendances.time', 'desc')
                ->paginate($perPage);

            // Structure flat results into the exact nested JSON schema for frontend compatibility
            $attendances->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'student_id' => $item->student_id,
                    'class_id' => $item->class_id,
                    'schedule_id' => $item->schedule_id,
                    'attendance_session_id' => $item->attendance_session_id,
                    'recorded_by' => isset($item->recorded_by) ? $item->recorded_by : null,
                    'date' => $item->date,
                    'time' => $item->time,
                    'status' => $item->status,
                    'late_minutes' => $item->late_minutes,
                    'device_info' => $item->device_info,
                    'notes' => $item->notes,
                    'location' => $item->location ? json_decode($item->location, true) : null,
                    'checkout_time' => $item->checkout_time,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'subject_name' => $item->subject_subject_name ?? null,
                    'student' => $item->student_id ? [
                        'id' => $item->student_id,
                        'full_name' => $item->student_full_name,
                        'nis' => $item->student_nis
                    ] : null,
                    'class' => $item->class_id ? [
                        'id' => $item->class_id,
                        'class_name' => $item->class_class_name
                    ] : null
                ];
            });

            return $this->sendResponse($attendances);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data absensi: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified attendance
     */
    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();

            $item = \Illuminate\Support\Facades\DB::table('attendances')
                ->leftJoin('students', 'attendances.student_id', '=', 'students.id')
                ->leftJoin('classes', 'attendances.class_id', '=', 'classes.id')
                ->select([
                    'attendances.*',
                    'students.full_name as student_full_name',
                    'students.nis as student_nis',
                    'classes.class_name as class_class_name'
                ])
                ->where('attendances.id', $id)
                ->first();

            if (!$item) {
                return $this->sendError('Absensi tidak ditemukan', [], 404);
            }

            // Log the view
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_READ,
                'description' => "Viewed attendance #{$id}",
                'model_type' => 'App\Models\Attendance',
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $formatted = [
                'id' => $item->id,
                'student_id' => $item->student_id,
                'class_id' => $item->class_id,
                'schedule_id' => $item->schedule_id,
                'attendance_session_id' => $item->attendance_session_id,
                'recorded_by' => isset($item->recorded_by) ? $item->recorded_by : null,
                'date' => $item->date,
                'time' => $item->time,
                'status' => $item->status,
                'late_minutes' => $item->late_minutes,
                'device_info' => $item->device_info,
                'notes' => $item->notes,
                'location' => $item->location ? json_decode($item->location, true) : null,
                'checkout_time' => $item->checkout_time,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'student' => $item->student_id ? [
                    'id' => $item->student_id,
                    'full_name' => $item->student_full_name,
                    'nis' => $item->student_nis
                ] : null,
                'class' => $item->class_id ? [
                    'id' => $item->class_id,
                    'class_name' => $item->class_class_name
                ] : null
            ];

            return $this->sendResponse($formatted);
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
            if (!$user->hasPermissionTo('attendance.create') && !$user->hasRole(['super_admin', 'admin', 'guru'])) {
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
     * Validate and bind student device UUID
     */
    private function validateAndBindDevice($student, $deviceUuid)
    {
        if (empty($deviceUuid)) {
            return 'ID Perangkat (Device UUID) wajib disertakan untuk keperluan verifikasi keamanan.';
        }

        if (empty($student->device_uuid)) {
            // First time check-in: Bind device
            $student->device_uuid = $deviceUuid;
            $student->save();
            return true;
        }

        if ($student->device_uuid !== $deviceUuid) {
            return 'Perangkat yang Anda gunakan tidak terdaftar untuk akun ini. Silakan hubungi Guru atau Admin untuk melakukan reset perangkat.';
        }

        return true;
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
            if ($user->hasRole('siswa')) {
                $student = $user->student;
                if (!$student) {
                    return $this->sendError('Data profil siswa Anda tidak ditemukan.', [], 422);
                }

                // Device UUID binding validation
                $deviceUuid = $request->header('X-Device-UUID');
                $deviceValidation = $this->validateAndBindDevice($student, $deviceUuid);
                if ($deviceValidation !== true) {
                    return $this->sendError($deviceValidation, [], 422);
                }
            } else {
                $student = \App\Models\Student::findOrFail($data['student_id']);
            }
            $schedule = $session->schedule;

            if ($student->class_id !== $schedule->class_id) {
                return $this->sendError('Anda tidak terdaftar di kelas untuk mata pelajaran ini.', [], 422);
            }

            // GPS Validation (Multi-Location Absensi from gps_locations table)
            if ($request->has('location') && isset($data['location']['latitude']) && isset($data['location']['longitude'])) {
                $userLat = (float) $data['location']['latitude'];
                $userLng = (float) $data['location']['longitude'];

                $activeLocations = DB::table('gps_locations')->where('is_active', true)->get();

                // Fallback to legacy settings table if no locations defined yet
                if ($activeLocations->isEmpty()) {
                    $activeLocations = collect([[
                        'name'          => 'Sekolah',
                        'latitude'      => (float) DB::table('settings')->where('key', 'school_latitude')->value('value') ?? -7.245583,
                        'longitude'     => (float) DB::table('settings')->where('key', 'school_longitude')->value('value') ?? 112.737750,
                        'radius_meters' => (int) DB::table('settings')->where('key', 'school_radius_meters')->value('value') ?? 100,
                    ]])->map(fn($a) => (object) $a);
                }

                $withinAny = false;
                $minDistance = PHP_INT_MAX;
                $nearestName = '';

                foreach ($activeLocations as $loc) {
                    $dist = $this->calculateDistance($userLat, $userLng, $loc->latitude, $loc->longitude);
                    if ($dist < $minDistance) {
                        $minDistance = $dist;
                        $nearestName = $loc->name;
                    }
                    if ($dist <= $loc->radius_meters) {
                        $withinAny = true;
                        break;
                    }
                }

                if (!$withinAny) {
                    return $this->sendError(
                        'Anda berada di luar semua zona absensi (' . round($minDistance) . 'm dari titik terdekat: ' . $nearestName . '). Absensi ditolak.',
                        [],
                        422
                    );
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
                $lateMinutes = (int) $startTime->diffInMinutes($now);
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
            if (!$user->hasRole(['super_admin', 'admin', 'guru'])) {
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
                $lateMinutes = (int) $startTime->diffInMinutes($now);
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

            // Check daily entrance attendance mode setting (scan vs click)
            $mode = DB::table('settings')->where('key', 'school_entry_attendance_mode')->value('value') ?? 'scan';
            if ($mode === 'scan') {
                return $this->sendError('Absen masuk mandiri dinonaktifkan. Anda harus melakukan scan kartu QR di petugas piket pintu gerbang.', [], 422);
            }

            if (!$user->hasRole('siswa') || !$user->student) {
                return $this->sendError('Hanya siswa yang dapat melakukan absen masuk sekolah.', [], 403);
            }

            $student = $user->student;

            // Device UUID binding validation
            $deviceUuid = $request->header('X-Device-UUID');
            $deviceValidation = $this->validateAndBindDevice($student, $deviceUuid);
            if ($deviceValidation !== true) {
                return $this->sendError($deviceValidation, [], 422);
            }

            $today = now()->toDateString();

            // Check if already checked in today for school entry (schedule_id is null)
            $existing = Attendance::where('student_id', $student->id)
                ->whereNull('schedule_id')
                ->where('date', $today)
                ->first();

            if ($existing) {
                return $this->sendError('Anda sudah melakukan absen masuk sekolah hari ini.', [], 422);
            }

            // GPS Absensi (Multi-Location Absensi from gps_locations table)
            if ($request->has('location') && isset($request->location['latitude']) && isset($request->location['longitude'])) {
                $userLat = (float) $request->location['latitude'];
                $userLng = (float) $request->location['longitude'];

                $activeLocations = DB::table('gps_locations')->where('is_active', true)->get();

                if ($activeLocations->isEmpty()) {
                    $activeLocations = collect([[
                        'name'          => 'Sekolah',
                        'latitude'      => (float) DB::table('settings')->where('key', 'school_latitude')->value('value') ?? -7.245583,
                        'longitude'     => (float) DB::table('settings')->where('key', 'school_longitude')->value('value') ?? 112.737750,
                        'radius_meters' => (int) DB::table('settings')->where('key', 'school_radius_meters')->value('value') ?? 100,
                    ]])->map(fn($a) => (object) $a);
                }

                $withinAny = false;
                $minDistance = PHP_INT_MAX;
                $nearestName = '';

                foreach ($activeLocations as $loc) {
                    $dist = $this->calculateDistance($userLat, $userLng, $loc->latitude, $loc->longitude);
                    if ($dist < $minDistance) {
                        $minDistance = $dist;
                        $nearestName = $loc->name;
                    }
                    if ($dist <= $loc->radius_meters) {
                        $withinAny = true;
                        break;
                    }
                }

                if (!$withinAny) {
                    return $this->sendError(
                        'Anda berada di luar semua zona absensi (' . round($minDistance) . 'm dari titik terdekat: ' . $nearestName . ').',
                        [],
                        422
                    );
                }
            }

            // Morning limit for tardiness: 07:00 AM
            $now = now();
            $schoolStartTime = \Carbon\Carbon::parse('07:00:00');

            $status = 'hadir';
            $lateMinutes = 0;

            if ($now->format('H:i:s') > $schoolStartTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = (int) $schoolStartTime->diffInMinutes($now);
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

    /**
     * Student scans Picket Officer's Gate QR (Absen Masuk via scan QR Piket)
     */
    public function scanGate(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user->hasRole('siswa') || !$user->student) {
                return $this->sendError('Hanya siswa yang dapat melakukan absen masuk sekolah.', [], 403);
            }

            $student = $user->student;

            // Device UUID binding validation
            $deviceUuid = $request->header('X-Device-UUID');
            $deviceValidation = $this->validateAndBindDevice($student, $deviceUuid);
            if ($deviceValidation !== true) {
                return $this->sendError($deviceValidation, [], 422);
            }

            $today = now()->toDateString();

            // Check if already checked in today for school entry
            $existing = Attendance::where('student_id', $student->id)
                ->whereNull('schedule_id')
                ->where('date', $today)
                ->first();

            if ($existing) {
                return $this->sendError('Anda sudah melakukan absen masuk sekolah hari ini.', [], 422);
            }

            // GPS Absensi validation
            if ($request->has('location') && isset($request->location['latitude']) && isset($request->location['longitude'])) {
                $userLat = (float) $request->location['latitude'];
                $userLng = (float) $request->location['longitude'];

                $activeLocations = DB::table('gps_locations')->where('is_active', true)->get();

                if ($activeLocations->isEmpty()) {
                    $activeLocations = collect([[
                        'name'          => 'Sekolah',
                        'latitude'      => (float) DB::table('settings')->where('key', 'school_latitude')->value('value') ?? -7.245583,
                        'longitude'     => (float) DB::table('settings')->where('key', 'school_longitude')->value('value') ?? 112.737750,
                        'radius_meters' => (int) DB::table('settings')->where('key', 'school_radius_meters')->value('value') ?? 100,
                    ]])->map(fn($a) => (object) $a);
                }

                $withinAny = false;
                foreach ($activeLocations as $loc) {
                    $dist = $this->calculateDistance($userLat, $userLng, $loc->latitude, $loc->longitude);
                    if ($dist <= $loc->radius_meters) {
                        $withinAny = true;
                        break;
                    }
                }

                if (!$withinAny) {
                    return $this->sendError('Anda berada di luar jangkauan area sekolah. Silakan mendekat ke gerbang sekolah.', [], 422);
                }
            } else {
                return $this->sendError('Koordinat GPS lokasi Anda diperlukan untuk verifikasi Absensi.', [], 422);
            }

            // Cutoff time: 07:00:00 WIB
            $now = now();
            $schoolStartTime = \Carbon\Carbon::parse('07:00:00');

            $status = 'hadir';
            $lateMinutes = 0;

            if ($now->format('H:i:s') > $schoolStartTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = (int) $schoolStartTime->diffInMinutes($now);
            }

            $activePeriod = DB::table('academic_periods')->where('is_active', true)->first();
            $academicPeriodId = $activePeriod ? $activePeriod->id : null;

            $attendance = Attendance::create([
                'attendance_session_id' => null,
                'schedule_id' => null,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'academic_period_id' => $academicPeriodId,
                'date' => $today,
                'time' => $now->format('H:i:s'),
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'recorded_by' => $user->id,
                'location' => $request->input('location'),
                'device_info' => $request->input('device_info', 'Expo Mobile Client'),
                'notes' => 'Absen Masuk Sekolah Harian via Scan QR Piket',
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Student #{$student->id} completed Daily School Check-In via Scan QR Piket ({$status})",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Push Notification to Student
            try {
                $studentUser = $student->user;
                if ($studentUser) {
                    $dateStr = \Carbon\Carbon::parse($attendance->date)->translatedFormat('d F Y');
                    $timeStr = substr($attendance->time, 0, 5);
                    $statusText = $status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir';
                    $notifMessage = "Absensi masuk sekolah Anda pada tanggal {$dateStr} pukul {$timeStr} WIB berhasil dicatat sebagai {$statusText} via scan QR Piket.";
                    \Illuminate\Support\Facades\Notification::send(
                        $studentUser,
                        new \App\Notifications\GenericNotification($notifMessage)
                    );
                }
            } catch (\Exception $notifEx) {
                \Illuminate\Support\Facades\Log::warning('Failed to send scan gate notification: ' . $notifEx->getMessage());
            }

            return $this->sendResponse(
                $attendance->load(['student', 'class']),
                'Absen masuk sekolah via scan QR Piket berhasil dicatat sebagai ' . ($status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir tepat waktu.')
            );
        } catch (\Exception $e) {
            return $this->sendError('Gagal melakukan absen masuk sekolah via scan: ' . $e->getMessage());
        }
    }

    /**
     * Daily School Check-out (Absen Harian Pulang Sekolah)
     */
    public function dailyCheckOut(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user->hasRole('siswa') || !$user->student) {
                return $this->sendError('Hanya siswa yang dapat melakukan absen pulang sekolah.', [], 403);
            }

            $student = $user->student;

            // Device UUID binding validation
            $deviceUuid = $request->header('X-Device-UUID');
            $deviceValidation = $this->validateAndBindDevice($student, $deviceUuid);
            if ($deviceValidation !== true) {
                return $this->sendError($deviceValidation, [], 422);
            }

            $today = now()->toDateString();

            // Check if checked in today for school entry (schedule_id is null)
            $attendance = Attendance::where('student_id', $student->id)
                ->whereNull('schedule_id')
                ->where('date', $today)
                ->where('status', '!=', 'ditolak')
                ->first();

            if (!$attendance) {
                return $this->sendError('Anda belum melakukan absen masuk sekolah hari ini.', [], 422);
            }

            if ($attendance->checkout_time) {
                return $this->sendError('Anda sudah melakukan absen pulang hari ini.', [], 422);
            }

            // GPS Absensi (Multi-Location Absensi from gps_locations table)
            if ($request->has('location') && isset($request->location['latitude']) && isset($request->location['longitude'])) {
                $userLat = (float) $request->location['latitude'];
                $userLng = (float) $request->location['longitude'];

                $activeLocations = DB::table('gps_locations')->where('is_active', true)->get();

                if ($activeLocations->isEmpty()) {
                    $activeLocations = collect([[
                        'name'          => 'Sekolah',
                        'latitude'      => (float) DB::table('settings')->where('key', 'school_latitude')->value('value') ?? -7.245583,
                        'longitude'     => (float) DB::table('settings')->where('key', 'school_longitude')->value('value') ?? 112.737750,
                        'radius_meters' => (int) DB::table('settings')->where('key', 'school_radius_meters')->value('value') ?? 100,
                    ]])->map(fn($a) => (object) $a);
                }

                $withinAny = false;
                $minDistance = PHP_INT_MAX;
                $nearestName = '';

                foreach ($activeLocations as $loc) {
                    $dist = $this->calculateDistance($userLat, $userLng, $loc->latitude, $loc->longitude);
                    if ($dist < $minDistance) {
                        $minDistance = $dist;
                        $nearestName = $loc->name;
                    }
                    if ($dist <= $loc->radius_meters) {
                        $withinAny = true;
                        break;
                    }
                }

                if (!$withinAny) {
                    return $this->sendError(
                        'Anda berada di luar semua zona absensi (' . round($minDistance) . 'm dari titik terdekat: ' . $nearestName . ').',
                        [],
                        422
                    );
                }
            }

            // Verify if student is allowed to check out yet
            $schedules = \App\Models\Schedule::where('class_id', $student->class_id)
                ->where('day_name', now()->format('l'))
                ->get();

            $checkoutThreshold = '14:00:00';
            if ($schedules->isNotEmpty()) {
                $checkoutThreshold = $schedules->max('end_time');
            }

            $now = now();
            $currentTimeStr = $now->format('H:i:s');

            if ($currentTimeStr < $checkoutThreshold) {
                return $this->sendError('Absen pulang belum dibuka. Anda baru bisa absen pulang setelah jam pelajaran terakhir berakhir (pukul ' . substr($checkoutThreshold, 0, 5) . ').', [], 422);
            }

            $attendance->checkout_time = $now->format('H:i:s');
            $attendance->save();

            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Student #{$student->id} completed Daily School Check-Out",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse(
                $attendance->load(['student', 'class']),
                'Absen pulang sekolah berhasil dicatat.'
            );
        } catch (\Exception $e) {
            return $this->sendError('Gagal melakukan absen pulang sekolah: ' . $e->getMessage());
        }
    }

    /**
     * Petugas Piket scan student QR Card (Absen awal gerbang masuk sekolah)
     */
    public function petugasScan(Request $request)
    {
        try {
            $user = $request->user();

            // Only admin, petugas, or teachers can scan
            if (!$user->hasRole(['super_admin', 'admin', 'petugas', 'guru'])) {
                return $this->sendError('Akses ditolak. Anda tidak memiliki izin untuk memindai kehadiran gerbang.', [], 403);
            }

            $request->validate([
                'student_identifier' => 'required|string', // NISN or Student ID/NIS
            ]);

            $identifier = $request->student_identifier;

            // Find student by NISN, NIS, or ID
            $student = \App\Models\Student::where('nisn', $identifier)
                ->orWhere('nis', $identifier)
                ->orWhere('id', $identifier)
                ->first();

            if (!$student) {
                return $this->sendError('Siswa tidak ditemukan. Pastikan kartu QR Code valid.', [], 404);
            }

            if ($student->status !== 'active') {
                return $this->sendError('Siswa sudah tidak aktif.', [], 422);
            }

            $today = now()->toDateString();

            // Check if already checked in today for school entrance (schedule_id is null)
            $existing = Attendance::where('student_id', $student->id)
                ->whereNull('schedule_id')
                ->where('date', $today)
                ->first();

            if ($existing) {
                $studentClass = DB::table('classes')->where('id', $student->class_id)->first();
                return $this->sendError($student->full_name . ' sudah melakukan absen masuk harian.', [
                    'student' => [
                        'id' => $student->id,
                        'full_name' => $student->full_name,
                        'nis' => $student->nis,
                        'nisn' => $student->nisn,
                        'photo' => $student->photo,
                    ],
                    'class_name' => $studentClass ? $studentClass->class_name : 'N/A',
                    'time' => substr($existing->time, 0, 5),
                    'status' => $existing->status
                ], 422);
            }

            // Cutoff time: 07:00:00 WIB
            $now = now();
            $schoolStartTime = \Carbon\Carbon::parse('07:00:00');

            $status = 'hadir';
            $lateMinutes = 0;

            if ($now->format('H:i:s') > $schoolStartTime->format('H:i:s')) {
                $status = 'telat';
                $lateMinutes = (int) $schoolStartTime->diffInMinutes($now);
            }

            // Create Daily Attendance Check-in
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
                'notes' => 'Di-scan oleh petugas piket: ' . $user->name,
                'location' => $request->input('location'),
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Petugas #{$user->id} scanned student #{$student->id} at gate. Status: {$status}",
                'model_type' => Attendance::class,
                'model_id' => $attendance->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Push Notification to Student
            try {
                $studentUser = $student->user;
                if ($studentUser) {
                    $dateStr = \Carbon\Carbon::parse($attendance->date)->translatedFormat('d F Y');
                    $timeStr = substr($attendance->time, 0, 5);
                    $statusText = $status === 'telat' ? 'Terlambat (' . $lateMinutes . ' menit)' : 'Hadir';
                    $notifMessage = "Absensi masuk sekolah Anda pada tanggal {$dateStr} pukul {$timeStr} WIB berhasil dicatat sebagai {$statusText} oleh petugas piket: {$user->name}.";
                    \Illuminate\Support\Facades\Notification::send(
                        $studentUser,
                        new \App\Notifications\GenericNotification($notifMessage)
                    );
                }
            } catch (\Exception $notifEx) {
                \Illuminate\Support\Facades\Log::warning('Failed to send gate scan notification: ' . $notifEx->getMessage());
            }

            $class = DB::table('classes')->where('id', $student->class_id)->first();

            return $this->sendResponse([
                'attendance' => [
                    'id' => $attendance->id,
                    'student_id' => $attendance->student_id,
                    'class_id' => $attendance->class_id,
                    'date' => $attendance->date,
                    'time' => substr($attendance->time, 0, 5),
                    'status' => $attendance->status,
                    'late_minutes' => $attendance->late_minutes,
                ],
                'student' => [
                    'id' => $student->id,
                    'full_name' => $student->full_name,
                    'nis' => $student->nis,
                    'nisn' => $student->nisn,
                    'photo' => $student->photo,
                ],
                'class_name' => $class ? $class->class_name : 'N/A'
            ], 'Absensi masuk harian berhasil dicatat.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal memproses absensi piket: ' . $e->getMessage());
        }
    }

    /**
     * Get classes monitored by a petugas piket
     */
    public function getPetugasClasses(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user->hasRole('petugas')) {
                return $this->sendError('Akses ditolak. Hanya petugas piket yang memiliki kelas pengawasan.', [], 403);
            }

            $classes = DB::table('class_petugas as cp')
                ->join('classes as c', 'cp.class_id', '=', 'c.id')
                ->select('c.*')
                ->where('cp.user_id', $user->id)
                ->get();

            return $this->sendResponse($classes, 'Daftar kelas pengawasan petugas piket.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil kelas pengawasan: ' . $e->getMessage());
        }
    }
}
