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
                    'approvers.username as approver_username',
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
                    'approvers.username as approver_username',
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

            if ($leave->approval_status !== 'pending') {
                return (new BaseController)->sendError('Izin sudah diproses sebelumnya.', [], 422);
            }

            $oldStatus = $leave->approval_status;
            $leave->approval_status = 'approved';
            $leave->approved_by = $user->id;
            $leave->approved_at = now();
            $leave->save();

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
            return (new BaseController)->sendError('Gagal menyetujui izin.');
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