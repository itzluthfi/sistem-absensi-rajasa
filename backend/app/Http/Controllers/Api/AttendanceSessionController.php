<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\AttendanceSession;
use App\Models\Schedule;
use App\Models\AcademicPeriod;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceSessionController extends BaseController
{
    /**
     * Get active attendance sessions for today
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $today = now()->toDateString();
            
            $query = AttendanceSession::with(['schedule.subject', 'schedule.class', 'schedule.teacher'])
                ->where('attendance_date', $today);

            // Filtering based on role
            if ($user->hasRole('siswa') && $user->student) {
                // Siswa can only see sessions for their class
                $query->whereHas('schedule', function ($q) use ($user) {
                    $q->where('class_id', $user->student->class_id);
                });
            } elseif ($user->hasRole('guru') && $user->teacher) {
                // Guru can only see sessions they opened
                $query->whereHas('schedule', function ($q) use ($user) {
                    $q->where('teacher_id', $user->teacher->id);
                });
            }

            // Filter active only
            if ($request->has('active')) {
                $query->where('is_active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
            }

            $sessions = $query->orderBy('is_active', 'desc')->orderBy('created_at', 'desc')->get();
            return $this->sendResponse($sessions);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data sesi absensi: ' . $e->getMessage());
        }
    }

    /**
     * Open a new attendance session for a schedule
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            // Validate that user is teacher or admin
            if (!$user->hasRole(['super_admin', 'admin', 'guru', 'wali_kelas'])) {
                return $this->sendError('Anda tidak memiliki izin untuk membuka sesi absensi.', [], 403);
            }

            $data = $request->validate([
                'schedule_id' => 'required|exists:schedules,id',
                'require_qr' => 'nullable|boolean',
            ]);

            $schedule = Schedule::findOrFail($data['schedule_id']);

            // If user is a teacher, verify they own the schedule
            if ($user->hasRole('guru') && $user->teacher && $schedule->teacher_id !== $user->teacher->id) {
                return $this->sendError('Anda hanya dapat membuka sesi untuk jadwal mengajar Anda sendiri.', [], 403);
            }

            $today = now()->toDateString();
            $activePeriod = AcademicPeriod::where('is_active', true)->first();

            DB::beginTransaction();

            // Close any existing active session for the same schedule today
            AttendanceSession::where('schedule_id', $schedule->id)
                ->where('attendance_date', $today)
                ->where('is_active', true)
                ->update([
                    'is_active' => false,
                    'close_time' => now(),
                ]);

            // Create new secure session
            $session = AttendanceSession::create([
                'schedule_id' => $schedule->id,
                'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                'qr_token' => Str::random(48), // secure session token
                'attendance_date' => $today,
                'open_time' => now(),
                'close_time' => null,
                'is_active' => true,
                'require_qr' => $request->input('require_qr', true),
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Opened attendance session #{$session->id} for schedule #{$schedule->id}",
                'model_type' => AttendanceSession::class,
                'model_id' => $session->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            return $this->sendResponse(
                $session->load(['schedule.subject', 'schedule.class', 'schedule.teacher']),
                'Sesi absensi berhasil dibuka.',
                201
            );
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal membuka sesi absensi: ' . $e->getMessage());
        }
    }

    /**
     * Close an active attendance session manually
     */
    public function close(Request $request, $id)
    {
        try {
            $user = $request->user();
            $session = AttendanceSession::findOrFail($id);

            // Access check
            if (!$user->hasRole(['super_admin', 'admin'])) {
                if ($user->hasRole('guru') && $user->teacher) {
                    $schedule = $session->schedule;
                    if ($schedule->teacher_id !== $user->teacher->id) {
                        return $this->sendError('Anda hanya dapat menutup sesi mengajar Anda sendiri.', [], 403);
                    }
                } else {
                    return $this->sendError('Akses ditolak.', [], 403);
                }
            }

            if (!$session->is_active) {
                return $this->sendResponse($session, 'Sesi absensi sudah ditutup sebelumnya.');
            }

            $session->update([
                'is_active' => false,
                'close_time' => now(),
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Closed attendance session #{$session->id} manually",
                'model_type' => AttendanceSession::class,
                'model_id' => $session->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse(
                $session->load(['schedule.subject', 'schedule.class', 'schedule.teacher']),
                'Sesi absensi berhasil ditutup.'
            );
        } catch (\Exception $e) {
            return $this->sendError('Gagal menutup sesi absensi: ' . $e->getMessage());
        }
    }

    /**
     * Get details of a specific session
     */
    public function show(Request $request, $id)
    {
        try {
            $session = AttendanceSession::with([
                'schedule.subject', 
                'schedule.class', 
                'schedule.teacher',
                'attendances.student'
            ])->findOrFail($id);

            return $this->sendResponse($session);
        } catch (\Exception $e) {
            return $this->sendError('Sesi absensi tidak ditemukan.', [], 404);
        }
    }
}
