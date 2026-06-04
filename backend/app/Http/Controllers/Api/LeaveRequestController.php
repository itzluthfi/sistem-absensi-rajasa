<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use App\Models\LeaveRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $query = \Illuminate\Support\Facades\DB::table('leave_requests')
                ->leftJoin('students', 'leave_requests.student_id', '=', 'students.id')
                ->leftJoin('users as approvers', 'leave_requests.approved_by', '=', 'approvers.id')
                ->select([
                    'leave_requests.*',
                    'students.full_name as student_full_name',
                    'students.nis as student_nis',
                    'approvers.name as approver_username',
                    'approvers.email as approver_email'
                ]);

            // Filter based on role
            if ($user->hasRole('siswa')) {
                $student = $user->student;
                if ($student) {
                    $query->where('leave_requests.student_id', $student->id);
                } else {
                    // Empty paginator manually to match BaseController schema
                    $empty = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20);
                    return (new BaseController)->sendResponse($empty, 'Daftar izin');
                }
            } elseif ($user->hasRole('wali_kelas') && !$user->hasRole(['super_admin', 'admin', 'kepala_sekolah'])) {
                $teacher = $user->teacher;
                if ($teacher) {
                    $classIds = \Illuminate\Support\Facades\DB::table('classes')
                        ->where('homeroom_teacher_id', $teacher->id)
                        ->pluck('id')
                        ->toArray();
                    
                    $query->whereIn('students.class_id', $classIds);
                } else {
                    $empty = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20);
                    return (new BaseController)->sendResponse($empty, 'Daftar izin');
                }
            } elseif ($user->hasRole('guru') && !$user->hasRole(['super_admin', 'admin', 'kepala_sekolah', 'wali_kelas'])) {
                $empty = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20);
                return (new BaseController)->sendResponse($empty, 'Daftar izin');
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('leave_requests.approval_status', $request->status);
            }

            $perPage = $request->input('per_page', 20);
            $list = $query->orderBy('leave_requests.created_at', 'desc')->paginate($perPage);

            // Restructure standard flat results to nested JSON arrays for Expo compatibility
            $list->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'student_id' => $item->student_id,
                    'permission_type' => $item->permission_type,
                    'start_date' => $item->start_date,
                    'end_date' => $item->end_date,
                    'reason' => $item->reason,
                    'attachment' => $item->attachment,
                    'approval_status' => $item->approval_status,
                    'approved_by' => $item->approved_by,
                    'approved_at' => $item->approved_at,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'student' => $item->student_id ? [
                        'id' => $item->student_id,
                        'full_name' => $item->student_full_name,
                        'nis' => $item->student_nis
                    ] : null,
                    'approver' => $item->approved_by ? [
                        'id' => $item->approved_by,
                        'username' => $item->approver_username,
                        'email' => $item->approver_email
                    ] : null
                ];
            });

            return (new BaseController)->sendResponse($list, 'Daftar izin');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengambil daftar izin: ' . $e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $item = \Illuminate\Support\Facades\DB::table('leave_requests')
                ->leftJoin('students', 'leave_requests.student_id', '=', 'students.id')
                ->leftJoin('users as approvers', 'leave_requests.approved_by', '=', 'approvers.id')
                ->select([
                    'leave_requests.*',
                    'students.full_name as student_full_name',
                    'students.nis as student_nis',
                    'approvers.name as approver_username',
                    'approvers.email as approver_email'
                ])
                ->where('leave_requests.id', $id)
                ->first();

            if (!$item) {
                return (new BaseController)->sendError('Izin tidak ditemukan.', [], 404);
            }

            // Log the view
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_READ,
                'description' => "Viewed leave request #{$id}",
                'model_type' => 'App\Models\LeaveRequest',
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $formatted = [
                'id' => $item->id,
                'student_id' => $item->student_id,
                'permission_type' => $item->permission_type,
                'start_date' => $item->start_date,
                'end_date' => $item->end_date,
                'reason' => $item->reason,
                'attachment' => $item->attachment,
                'approval_status' => $item->approval_status,
                'approved_by' => $item->approved_by,
                'approved_at' => $item->approved_at,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'student' => $item->student_id ? [
                    'id' => $item->student_id,
                    'full_name' => $item->student_full_name,
                    'nis' => $item->student_nis
                ] : null,
                'approver' => $item->approved_by ? [
                    'id' => $item->approved_by,
                    'username' => $item->approver_username,
                    'email' => $item->approver_email
                ] : null
            ];

            return (new BaseController)->sendResponse($formatted, 'Detail izin');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Izin tidak ditemukan.', [], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $data = $request->validate([
                'permission_type' => 'required|in:izin,sakit',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string|max:1000',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            // Get student_id from authenticated siswa, or from request
            $studentId = null;
            if ($user->hasRole('siswa') && $user->student) {
                $studentId = $user->student->id;
            } elseif ($request->has('student_id')) {
                $studentId = $request->student_id;
            }

            if (!$studentId) {
                return (new BaseController)->sendError('Student ID diperlukan.', [], 422);
            }

            $data['student_id'] = $studentId;
            $data['approval_status'] = 'pending';

            if ($request->hasFile('attachment')) {
                $path = $request->file('attachment')->store('leave_requests', 'public');
                $data['attachment'] = $path;
            }

            $leave = LeaveRequest::create($data);

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Created leave request #{$leave->id} ({$data['permission_type']})",
                'model_type' => LeaveRequest::class,
                'model_id' => $leave->id,
                'new_values' => $data,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return (new BaseController)->sendResponse($leave->load('student'), 'Izin berhasil diajukan', 201);
        } catch (ValidationException $e) {
            return (new BaseController)->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengajukan izin. Silakan coba lagi.');
        }
    }

    public function approve(Request $request, $id)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!$user->hasPermissionTo('leave_requests.approve') && !$user->hasRole(['super_admin', 'admin'])) {
                return (new BaseController)->sendError('Anda tidak memiliki izin untuk menyetujui izin.', [], 403);
            }

            $leave = LeaveRequest::findOrFail($id);

            // Homeroom teacher validation
            if ($user->hasRole('wali_kelas') && !$user->hasRole(['super_admin', 'admin'])) {
                $teacher = $user->teacher;
                if (!$teacher) {
                    return (new BaseController)->sendError('Data guru Anda tidak ditemukan.', [], 403);
                }
                
                $studentClassId = \Illuminate\Support\Facades\DB::table('students')
                    ->where('id', $leave->student_id)
                    ->value('class_id');
                
                $homeroomTeacherId = $studentClassId 
                    ? \Illuminate\Support\Facades\DB::table('classes')->where('id', $studentClassId)->value('homeroom_teacher_id')
                    : null;
                
                if ($homeroomTeacherId !== $teacher->id) {
                    return (new BaseController)->sendError('Anda hanya dapat menyetujui izin siswa perwalian Anda sendiri.', [], 403);
                }
            }

            if ($leave->approval_status !== 'pending') {
                return (new BaseController)->sendError('Izin sudah diproses sebelumnya.', [], 422);
            }

            $oldStatus = $leave->approval_status;
            $leave->approval_status = 'approved';
            $leave->approved_by = $user->id;
            $leave->approved_at = now();
            $leave->save();

            // Sync attendance records
            $student = $leave->student;
            if ($student && $student->class_id) {
                $startDate = \Carbon\Carbon::parse($leave->start_date);
                $endDate = \Carbon\Carbon::parse($leave->end_date);
                
                $activePeriod = \Illuminate\Support\Facades\DB::table('academic_periods')->where('is_active', true)->first();
                $academicPeriodId = $activePeriod ? $activePeriod->id : null;

                for ($date = clone $startDate; $date->lte($endDate); $date->addDay()) {
                    $currentDateStr = $date->toDateString();
                    $dayNameEng = $date->format('l'); // e.g. Monday, Tuesday, etc.
                    
                    // Handle school-level daily check-in attendance
                    $existingDaily = \App\Models\Attendance::where('student_id', $student->id)
                        ->whereNull('schedule_id')
                        ->where('date', $currentDateStr)
                        ->first();
                        
                    if ($existingDaily) {
                        $existingDaily->update([
                            'status' => $leave->permission_type,
                            'notes' => $leave->reason,
                            'recorded_by' => $user->id,
                            'academic_period_id' => $academicPeriodId,
                        ]);
                    } else {
                        \App\Models\Attendance::create([
                            'student_id' => $student->id,
                            'class_id' => $student->class_id,
                            'schedule_id' => null,
                            'attendance_session_id' => null,
                            'academic_period_id' => $academicPeriodId,
                            'date' => $currentDateStr,
                            'time' => now()->format('H:i:s'),
                            'status' => $leave->permission_type,
                            'notes' => $leave->reason,
                            'recorded_by' => $user->id,
                        ]);
                    }

                    // Find all schedules for the student's class on this day name
                    $schedules = \Illuminate\Support\Facades\DB::table('schedules')
                        ->where('class_id', $student->class_id)
                        ->where('day_name', $dayNameEng)
                        ->get();
                        
                    foreach ($schedules as $schedule) {
                        // Check if an attendance record already exists for this student, schedule, and date
                        $existingAttendance = \App\Models\Attendance::where('student_id', $student->id)
                            ->where('schedule_id', $schedule->id)
                            ->where('date', $currentDateStr)
                            ->first();
                            
                        // Find if there is an active/existing session for this schedule on this date
                        $session = \Illuminate\Support\Facades\DB::table('attendance_sessions')
                            ->where('schedule_id', $schedule->id)
                            ->where('attendance_date', $currentDateStr)
                            ->first();
                            
                        $sessionId = $session ? $session->id : null;
                        
                        if ($existingAttendance) {
                            $existingAttendance->update([
                                'status' => $leave->permission_type,
                                'notes' => $leave->reason,
                                'recorded_by' => $user->id,
                                'attendance_session_id' => $sessionId,
                                'academic_period_id' => $academicPeriodId,
                            ]);
                        } else {
                            \App\Models\Attendance::create([
                                'student_id' => $student->id,
                                'class_id' => $student->class_id,
                                'schedule_id' => $schedule->id,
                                'attendance_session_id' => $sessionId,
                                'academic_period_id' => $academicPeriodId,
                                'date' => $currentDateStr,
                                'time' => now()->format('H:i:s'),
                                'status' => $leave->permission_type,
                                'notes' => $leave->reason,
                                'recorded_by' => $user->id,
                            ]);
                        }
                    }
                }
            }

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_APPROVE,
                'description' => "Approved leave request #{$id}",
                'model_type' => LeaveRequest::class,
                'model_id' => $id,
                'old_values' => ['approval_status' => $oldStatus],
                'new_values' => ['approval_status' => 'approved', 'approved_by' => $user->id],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return (new BaseController)->sendResponse($leave->load('student', 'approver'), 'Izin disetujui');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal menyetujui izin: ' . $e->getMessage());
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!$user->hasPermissionTo('leave_requests.reject') && !$user->hasRole(['super_admin', 'admin'])) {
                return (new BaseController)->sendError('Anda tidak memiliki izin untuk menolak izin.', [], 403);
            }

            $leave = LeaveRequest::findOrFail($id);

            // Homeroom teacher validation
            if ($user->hasRole('wali_kelas') && !$user->hasRole(['super_admin', 'admin'])) {
                $teacher = $user->teacher;
                if (!$teacher) {
                    return (new BaseController)->sendError('Data guru Anda tidak ditemukan.', [], 403);
                }
                
                $studentClassId = \Illuminate\Support\Facades\DB::table('students')
                    ->where('id', $leave->student_id)
                    ->value('class_id');
                
                $homeroomTeacherId = $studentClassId 
                    ? \Illuminate\Support\Facades\DB::table('classes')->where('id', $studentClassId)->value('homeroom_teacher_id')
                    : null;
                
                if ($homeroomTeacherId !== $teacher->id) {
                    return (new BaseController)->sendError('Anda hanya dapat menolak izin siswa perwalian Anda sendiri.', [], 403);
                }
            }

            if ($leave->approval_status !== 'pending') {
                return (new BaseController)->sendError('Izin sudah diproses sebelumnya.', [], 422);
            }

            $oldStatus = $leave->approval_status;
            $leave->approval_status = 'rejected';
            $leave->approved_by = $user->id;
            $leave->approved_at = now();
            $leave->save();

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_REJECT,
                'description' => "Rejected leave request #{$id}",
                'model_type' => LeaveRequest::class,
                'model_id' => $id,
                'old_values' => ['approval_status' => $oldStatus],
                'new_values' => ['approval_status' => 'rejected', 'approved_by' => $user->id],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return (new BaseController)->sendResponse($leave->load('student', 'approver'), 'Izin ditolak');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal menolak izin.');
        }
    }
}