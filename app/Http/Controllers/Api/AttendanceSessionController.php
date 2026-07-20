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
     * Auto-close any active sessions whose close time has passed
     */
    private function autoCloseExpiredSessions()
    {
        DB::table('attendance_sessions')
            ->where('is_active', true)
            ->whereNotNull('close_time')
            ->where('close_time', '<=', now())
            ->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);
    }

    /**
     * Helper to load an attendance session with its schedule, subject, class, and teacher using raw joins.
     */
    private function getSessionWithRelations($sessionId)
    {
        $sess = DB::table('attendance_sessions as ats')
            ->leftJoin('schedules as sc', 'ats.schedule_id', '=', 'sc.id')
            ->leftJoin('subjects as sub', 'sc.subject_id', '=', 'sub.id')
            ->leftJoin('classes as cl', 'sc.class_id', '=', 'cl.id')
            ->leftJoin('teachers as tc', 'sc.teacher_id', '=', 'tc.id')
            ->select(
                'ats.*',
                'sc.class_id',
                'sc.day_name',
                'sc.start_time',
                'sc.end_time',
                'sc.subject_id',
                'sc.teacher_id',
                'sc.academic_period_id as schedule_academic_period_id',
                'sc.room',
                'sub.subject_name',
                'cl.class_name',
                'tc.full_name as teacher_full_name'
            )
            ->where('ats.id', $sessionId)
            ->first();
 
        if (!$sess) return null;
 
        $mapped = new \stdClass();
        $mapped->id = $sess->id;
        $mapped->schedule_id = $sess->schedule_id;
        $mapped->academic_period_id = isset($sess->academic_period_id) ? $sess->academic_period_id : null;
        $mapped->qr_token = $sess->qr_token;
        $mapped->attendance_date = $sess->attendance_date;
        $mapped->open_time = $sess->open_time;
        $mapped->close_time = $sess->close_time;
        $mapped->is_active = (bool) $sess->is_active;
        $mapped->require_qr = (bool) $sess->require_qr;
        $mapped->created_at = $sess->created_at;
        $mapped->updated_at = $sess->updated_at;
 
        $mapped->schedule = new \stdClass();
        $mapped->schedule->id = $sess->schedule_id;
        $mapped->schedule->class_id = $sess->class_id;
        $mapped->schedule->day_name = $sess->day_name;
        $mapped->schedule->start_time = $sess->start_time;
        $mapped->schedule->subject_id = $sess->subject_id;
        $mapped->schedule->teacher_id = $sess->teacher_id;
        $mapped->schedule->academic_period_id = $sess->schedule_academic_period_id;
        $mapped->schedule->end_time = $sess->end_time;
        $mapped->schedule->room = $sess->room;
 
        $mapped->schedule->subject = new \stdClass();
        $mapped->schedule->subject->id = $sess->subject_id;
        $mapped->schedule->subject->subject_name = $sess->subject_name;
 
        $mapped->schedule->class = new \stdClass();
        $mapped->schedule->class->id = $sess->class_id;
        $mapped->schedule->class->class_name = $sess->class_name;
 
        $mapped->schedule->teacher = new \stdClass();
        $mapped->schedule->teacher->id = $sess->teacher_id;
        $mapped->schedule->teacher->full_name = $sess->teacher_full_name;
 
        return $mapped;
    }
 
    /**
     * Get active attendance sessions for today
     */
    public function index(Request $request)
    {
        try {
            $this->autoCloseExpiredSessions();
            
            $user = $request->user();
            $today = now()->toDateString();
            
            // To avoid loading user relations via Eloquent:
            $studentClassId = null;
            if ($user->hasRole('siswa')) {
                $student = DB::table('students')->where('user_id', $user->id)->first();
                if ($student) {
                    $studentClassId = $student->class_id;
                }
            }

            $teacherId = null;
            if ($user->hasRole('guru')) {
                $teacher = DB::table('teachers')->where('user_id', $user->id)->first();
                if ($teacher) {
                    $teacherId = $teacher->id;
                }
            }

            $query = DB::table('attendance_sessions as ats')
                ->leftJoin('schedules as sc', 'ats.schedule_id', '=', 'sc.id')
                ->leftJoin('subjects as sub', 'sc.subject_id', '=', 'sub.id')
                ->leftJoin('classes as cl', 'sc.class_id', '=', 'cl.id')
                ->leftJoin('teachers as tc', 'sc.teacher_id', '=', 'tc.id')
                ->select(
                    'ats.*',
                    'sc.class_id',
                    'sc.day_name',
                    'sc.start_time',
                    'sc.end_time',
                    'sc.subject_id',
                    'sc.teacher_id',
                    'sc.academic_period_id as schedule_academic_period_id',
                    'sc.room',
                    'sub.subject_name',
                    'cl.class_name',
                    'tc.full_name as teacher_full_name'
                );

            if ($request->has('schedule_id')) {
                $query->where('ats.schedule_id', $request->schedule_id);
            } else {
                if ($request->has('active') && filter_var($request->active, FILTER_VALIDATE_BOOLEAN) === true) {
                    $query->where('ats.is_active', true);
                } else {
                    if ($request->has('date')) {
                        $query->where('ats.attendance_date', $request->date);
                    } else {
                        $query->where('ats.attendance_date', $today);
                    }
                }
            }

            if ($studentClassId) {
                $query->where('sc.class_id', $studentClassId);
            } elseif ($teacherId) {
                $query->where('sc.teacher_id', $teacherId);
            }

            if ($request->has('active') && filter_var($request->active, FILTER_VALIDATE_BOOLEAN) === false) {
                $query->where('ats.is_active', false);
            }
 
            $rawSessions = $query->orderBy('ats.is_active', 'desc')
                ->orderBy('ats.created_at', 'desc')
                ->get();
 
            $sessions = $rawSessions->map(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->schedule_id = $item->schedule_id;
                $mapped->academic_period_id = isset($item->academic_period_id) ? $item->academic_period_id : null;
                $mapped->qr_token = $item->qr_token;
                $mapped->attendance_date = $item->attendance_date;
                $mapped->open_time = $item->open_time;
                $mapped->close_time = $item->close_time;
                $mapped->is_active = (bool) $item->is_active;
                $mapped->require_qr = (bool) $item->require_qr;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;
 
                $mapped->schedule = new \stdClass();
                $mapped->schedule->id = $item->schedule_id;
                $mapped->schedule->class_id = $item->class_id;
                $mapped->schedule->day_name = $item->day_name;
                $mapped->schedule->start_time = $item->start_time;
                $mapped->schedule->subject_id = $item->subject_id;
                $mapped->schedule->teacher_id = $item->teacher_id;
                $mapped->schedule->academic_period_id = $item->schedule_academic_period_id;
                $mapped->schedule->end_time = $item->end_time;
                $mapped->schedule->room = $item->room;
 
                $mapped->schedule->subject = new \stdClass();
                $mapped->schedule->subject->id = $item->subject_id;
                $mapped->schedule->subject->subject_name = $item->subject_name;
 
                $mapped->schedule->class = new \stdClass();
                $mapped->schedule->class->id = $item->class_id;
                $mapped->schedule->class->class_name = $item->class_name;
 
                $mapped->schedule->teacher = new \stdClass();
                $mapped->schedule->teacher->id = $item->teacher_id;
                $mapped->schedule->teacher->full_name = $item->teacher_full_name;
 
                return $mapped;
            });
 
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
            $this->autoCloseExpiredSessions();

            $user = $request->user();
 
            // Validate that user is teacher or admin
            if (!$user->hasRole(['super_admin', 'admin', 'guru'])) {
                return $this->sendError('Anda tidak memiliki izin untuk membuka sesi absensi.', [], 403);
            }
 
            $data = $request->validate([
                'schedule_id' => 'required|exists:schedules,id',
                'require_qr' => 'nullable|boolean',
                'attendance_date' => 'nullable|date',
                'close_time' => 'nullable|date_format:Y-m-d H:i:s|after:now',
            ]);
 
            $schedule = DB::table('schedules')->where('id', $data['schedule_id'])->first();
            if (!$schedule) {
                return $this->sendError('Jadwal tidak ditemukan.', [], 404);
            }
 
            // If user is a teacher, verify they own the schedule
            if ($user->hasRole('guru')) {
                $teacher = DB::table('teachers')->where('user_id', $user->id)->first();
                if ($teacher && $schedule->teacher_id !== $teacher->id) {
                    return $this->sendError('Anda hanya dapat membuka sesi untuk jadwal mengajar Anda sendiri.', [], 403);
                }
            }
 
            $attendanceDate = $request->input('attendance_date', now()->toDateString());
            
            // Calculate close time
            $closeTime = null;
            if ($request->filled('close_time')) {
                $closeTime = \Carbon\Carbon::parse($request->input('close_time'));
            } else {
                // Default: schedule end_time + 15 minutes
                $scheduleEndTime = $schedule->end_time; // e.g. '10:00:00'
                $defaultClose = \Carbon\Carbon::parse($attendanceDate . ' ' . $scheduleEndTime)->addMinutes(15);
                if ($defaultClose->isPast()) {
                    $defaultClose = now()->addMinutes(15);
                }
                $closeTime = $defaultClose;
            }

            $activePeriod = DB::table('academic_periods')->where('is_active', true)->first();
 
            // Check if there is already a session for the same schedule on the target date
            $existingSession = DB::table('attendance_sessions')
                ->where('schedule_id', $schedule->id)
                ->where('attendance_date', $attendanceDate)
                ->first();

            DB::beginTransaction();
 
            if ($existingSession) {
                // REOPEN existing session
                DB::table('attendance_sessions')
                    ->where('id', $existingSession->id)
                    ->update([
                        'is_active' => true,
                        'open_time' => now(),
                        'close_time' => $closeTime,
                        'require_qr' => $request->input('require_qr', true),
                        'updated_at' => now(),
                    ]);
                $sessionId = $existingSession->id;
                $actionType = AuditLog::ACTION_UPDATE;
                $actionDesc = "Reopened attendance session #{$sessionId} for schedule #{$schedule->id}";
            } else {
                // CREATE new session
                $sessionId = DB::table('attendance_sessions')->insertGetId([
                    'schedule_id' => $schedule->id,
                    'academic_period_id' => $activePeriod ? $activePeriod->id : null,
                    'qr_token' => Str::random(48), // secure session token
                    'attendance_date' => $attendanceDate,
                    'open_time' => now(),
                    'close_time' => $closeTime,
                    'is_active' => true,
                    'require_qr' => $request->input('require_qr', true),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $actionType = AuditLog::ACTION_CREATE;
                $actionDesc = "Opened attendance session #{$sessionId} for schedule #{$schedule->id}";

                // Link any pre-existing attendances (e.g. from approved leave requests) for target date's schedule to the new session
                DB::table('attendances')
                    ->where('schedule_id', $schedule->id)
                    ->where('date', $attendanceDate)
                    ->whereNull('attendance_session_id')
                    ->update([
                        'attendance_session_id' => $sessionId,
                        'updated_at' => now()
                    ]);
            }

            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => $actionType,
                'description' => $actionDesc,
                'model_type' => AttendanceSession::class,
                'model_id' => $sessionId,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            // Send notifications to all students in this class
            try {
                $subjectName = DB::table('subjects')->where('id', $schedule->subject_id)->value('subject_name') ?? 'Pelajaran';
                $teacherName = DB::table('teachers')->where('id', $schedule->teacher_id)->value('full_name') ?? 'Guru';
                $requireQrMode = $request->input('require_qr', true);
                $modeText = $requireQrMode ? 'Scan QR Code' : 'Klik Absen Mandiri';
                $message = "Presensi {$subjectName} telah dibuka oleh {$teacherName}. Mode: {$modeText}. Silakan absen sekarang!";

                // Get all students in the class
                $studentUserIds = DB::table('students')
                    ->where('class_id', $schedule->class_id)
                    ->pluck('user_id')
                    ->toArray();

                if (!empty($studentUserIds)) {
                    $students = \App\Models\User::whereIn('id', $studentUserIds)->get();
                    \Illuminate\Support\Facades\Notification::send(
                        $students,
                        new \App\Notifications\GenericNotification($message)
                    );
                }
            } catch (\Exception $notifEx) {
                // Notification failure should not block the session opening
                \Illuminate\Support\Facades\Log::warning('Failed to send attendance open notifications: ' . $notifEx->getMessage());
            }

            $session = $this->getSessionWithRelations($sessionId);
            return $this->sendResponse(
                $session,
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
            $session = DB::table('attendance_sessions')->where('id', $id)->first();
            if (!$session) {
                return $this->sendError('Sesi absensi tidak ditemukan.', [], 404);
            }
 
            // Access check
            if (!$user->hasRole(['super_admin', 'admin'])) {
                if ($user->hasRole('guru')) {
                    $teacher = DB::table('teachers')->where('user_id', $user->id)->first();
                    $schedule = DB::table('schedules')->where('id', $session->schedule_id)->first();
                    if ($teacher && $schedule && $schedule->teacher_id !== $teacher->id) {
                        return $this->sendError('Anda hanya dapat menutup sesi mengajar Anda sendiri.', [], 403);
                    }
                } else {
                    return $this->sendError('Akses ditolak.', [], 403);
                }
            }
 
            if (!$session->is_active) {
                $sessionWithRelations = $this->getSessionWithRelations($id);
                return $this->sendResponse($sessionWithRelations, 'Sesi absensi sudah ditutup sebelumnya.');
            }
 
            DB::table('attendance_sessions')
                ->where('id', $id)
                ->update([
                    'is_active' => false,
                    'close_time' => now(),
                    'updated_at' => now(),
                ]);
 
            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Closed attendance session #{$id} manually",
                'model_type' => AttendanceSession::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            $sessionWithRelations = $this->getSessionWithRelations($id);
            return $this->sendResponse(
                $sessionWithRelations,
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
            $session = DB::table('attendance_sessions as ats')
                ->leftJoin('schedules as sc', 'ats.schedule_id', '=', 'sc.id')
                ->leftJoin('subjects as sub', 'sc.subject_id', '=', 'sub.id')
                ->leftJoin('classes as cl', 'sc.class_id', '=', 'cl.id')
                ->leftJoin('teachers as tc', 'sc.teacher_id', '=', 'tc.id')
                ->select(
                    'ats.*',
                    'sc.class_id',
                    'sc.day_name',
                    'sc.start_time',
                    'sc.end_time',
                    'sc.subject_id',
                    'sc.teacher_id',
                    'sc.academic_period_id as schedule_academic_period_id',
                    'sc.room',
                    'sub.subject_name',
                    'cl.class_name',
                    'tc.full_name as teacher_full_name'
                )
                ->where('ats.id', $id)
                ->first();
 
            if (!$session) {
                return $this->sendError('Sesi absensi tidak ditemukan.', [], 404);
            }

            // Calculate meeting number chronologically (by ID order for the schedule)
            $meetingNumber = DB::table('attendance_sessions')
                ->where('schedule_id', $session->schedule_id)
                ->where('id', '<=', $session->id)
                ->count();

            // Fetch attendances for this session
            $attendancesRaw = DB::table('attendances as a')
                ->join('students as s', 'a.student_id', '=', 's.id')
                ->select(
                    'a.*',
                    's.full_name as student_full_name',
                    's.nis as student_nis'
                )
                ->where('a.attendance_session_id', $id)
                ->get();

            $attendances = $attendancesRaw->map(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->attendance_session_id = $item->attendance_session_id;
                $mapped->student_id = $item->student_id;
                $mapped->class_id = $item->class_id;
                $mapped->academic_period_id = isset($item->academic_period_id) ? $item->academic_period_id : null;
                $mapped->date = $item->date;
                $mapped->time = $item->time;
                $mapped->status = $item->status;
                $mapped->location = $item->location;
                $mapped->device_info = $item->device_info;
                $mapped->notes = $item->notes;
                $mapped->late_minutes = $item->late_minutes;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;

                $mapped->student = new \stdClass();
                $mapped->student->id = $item->student_id;
                $mapped->student->full_name = $item->student_full_name;
                $mapped->student->nis = $item->student_nis;

                return $mapped;
            });

            $mappedSession = new \stdClass();
            $mappedSession->id = $session->id;
            $mappedSession->schedule_id = $session->schedule_id;
            $mappedSession->academic_period_id = isset($session->academic_period_id) ? $session->academic_period_id : null;
            $mappedSession->qr_token = $session->qr_token;
            $mappedSession->attendance_date = $session->attendance_date;
            $mappedSession->open_time = $session->open_time;
            $mappedSession->close_time = $session->close_time;
            $mappedSession->is_active = (bool) $session->is_active;
            $mappedSession->require_qr = (bool) $session->require_qr;
            $mappedSession->meeting_number = $meetingNumber;
            $mappedSession->created_at = $session->created_at;
            $mappedSession->updated_at = $session->updated_at;

            $mappedSession->schedule = new \stdClass();
            $mappedSession->schedule->id = $session->schedule_id;
            $mappedSession->schedule->class_id = $session->class_id;
            $mappedSession->schedule->day_name = $session->day_name;
            $mappedSession->schedule->start_time = $session->start_time;
            $mappedSession->schedule->subject_id = $session->subject_id;
            $mappedSession->schedule->teacher_id = $session->teacher_id;
            $mappedSession->schedule->academic_period_id = $session->schedule_academic_period_id;
            $mappedSession->schedule->end_time = $session->end_time;
            $mappedSession->schedule->room = $session->room;
 
            $mappedSession->schedule->subject = new \stdClass();
            $mappedSession->schedule->subject->id = $session->subject_id;
            $mappedSession->schedule->subject->subject_name = $session->subject_name;
 
            $mappedSession->schedule->class = new \stdClass();
            $mappedSession->schedule->class->id = $session->class_id;
            $mappedSession->schedule->class->class_name = $session->class_name;
 
            $mappedSession->schedule->teacher = new \stdClass();
            $mappedSession->schedule->teacher->id = $session->teacher_id;
            $mappedSession->schedule->teacher->full_name = $session->teacher_full_name;
 
            $mappedSession->attendances = $attendances;
 
            return $this->sendResponse($mappedSession);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('FCM/Session retrieve error in show: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->sendError('Gagal memuat detail sesi: ' . $e->getMessage(), [], 500);
        }
    }
}
