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

            $query = LeaveRequest::with(['student', 'approver']);

            // Filter based on role
            if ($user->hasRole('siswa')) {
                // Siswa can only see their own leave requests
                $student = $user->student;
                if ($student) {
                    $query->where('student_id', $student->id);
                } else {
                    return (new BaseController)->sendResponse(['data' => []], 'Daftar izin');
                }
            } elseif ($user->hasRole(['guru', 'wali_kelas'])) {
                // Guru and Wali Kelas can see leave requests from their class
                // (Implementation depends on relationship between teachers and students)
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('approval_status', $request->status);
            }

            $perPage = $request->input('per_page', 20);
            $list = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return (new BaseController)->sendResponse($list, 'Daftar izin');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengambil daftar izin.');
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();
            $leave = LeaveRequest::with(['student', 'approver'])->findOrFail($id);

            // Log the view
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_READ,
                'description' => "Viewed leave request #{$id}",
                'model_type' => LeaveRequest::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return (new BaseController)->sendResponse($leave, 'Detail izin');
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