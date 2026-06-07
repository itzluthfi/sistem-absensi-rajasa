<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentsController extends BaseController
{
    public function index(Request $request)
    {
        try {
            // Validate class_id if provided - must be a valid integer
            if ($request->has('class_id')) {
                $classId = $request->query('class_id');
                if (!is_numeric($classId) || intval($classId) <= 0) {
                    return $this->sendError('Parameter class_id tidak valid.', [], 422);
                }

                // Check if class exists
                $classExists = DB::table('classes')->where('id', intval($classId))->exists();
                if (!$classExists) {
                    // Return empty array instead of error - class might not have students
                    return $this->sendResponse([], 'Tidak ada siswa di kelas ini.');
                }
            }

            $query = DB::table('students')
                ->leftJoin('users', 'students.user_id', '=', 'users.id')
                ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
                ->select([
                    'students.id',
                    'students.user_id',
                    'students.class_id',
                    'students.full_name',
                    'students.nisn',
                    'students.nis',
                    'students.created_at',
                    'students.updated_at',
                    'users.email as user_email',
                    'users.name as user_username',
                    'classes.class_name as class_class_name',
                    'classes.academic_period_id as class_academic_period_id'
                ]);

            if ($request->has('academic_period_id')) {
                $academicPeriodId = $request->query('academic_period_id');
                if (is_numeric($academicPeriodId)) {
                    $query->where('classes.academic_period_id', $academicPeriodId);
                }
            }

            if ($request->has('class_id')) {
                $query->where('students.class_id', intval($request->query('class_id')));
            }

            if ($request->boolean('all')) {
                $students = $query->orderBy('students.full_name', 'asc')->get();
                $formatted = $students->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'user_id' => $item->user_id,
                        'class_id' => $item->class_id,
                        'full_name' => $item->full_name,
                        'nisn' => $item->nisn,
                        'nis' => $item->nis,
                        'created_at' => $item->created_at,
                        'updated_at' => $item->updated_at,
                        'user' => $item->user_id ? [
                            'id' => $item->user_id,
                            'email' => $item->user_email,
                        ] : null,
                        'class' => $item->class_id ? [
                            'id' => $item->class_id,
                            'class_name' => $item->class_class_name,
                            'academic_period_id' => $item->class_academic_period_id,
                        ] : null
                    ];
                });
                return $this->sendResponse($formatted);
            }

            $perPage = $request->input('per_page', 15);
            $students = $query->paginate($perPage);

            // Restructure standard flat results to nested JSON arrays for Expo compatibility
            $students->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'user_id' => $item->user_id,
                    'class_id' => $item->class_id,
                    'full_name' => $item->full_name,
                    'nisn' => $item->nisn,
                    'nis' => $item->nis,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'user' => $item->user_id ? [
                        'id' => $item->user_id,
                        'email' => $item->user_email,
                        'username' => $item->user_username,
                    ] : null,
                    'class' => $item->class_id ? [
                        'id' => $item->class_id,
                        'class_name' => $item->class_class_name,
                        'academic_period_id' => $item->class_academic_period_id,
                    ] : null
                ];
            });

            return $this->sendResponse($students);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data siswa: ' . $e->getMessage(),
                'errors' => [],
            ], 500); // Return 500 for server errors, not 400
        }
    }

    public function show($id)
    {
        try {
            $item = \Illuminate\Support\Facades\DB::table('students')
                ->leftJoin('users', 'students.user_id', '=', 'users.id')
                ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
                ->select([
                    'students.*',
                    'users.email as user_email',
                    'users.name as user_username',
                    'classes.class_name as class_class_name',
                    'classes.academic_period_id as class_academic_period_id'
                ])
                ->where('students.id', $id)
                ->first();

            if (!$item) {
                return $this->sendError('Siswa tidak ditemukan', [], 404);
            }

            // Fetch recent 10 attendances for this student using fast flat query
            $attendances = \Illuminate\Support\Facades\DB::table('attendances')
                ->where('student_id', $id)
                ->orderBy('date', 'desc')
                ->orderBy('time', 'desc')
                ->limit(10)
                ->get();

            $formatted = [
                'id' => $item->id,
                'user_id' => $item->user_id,
                'class_id' => $item->class_id,
                'full_name' => $item->full_name,
                'nisn' => $item->nisn,
                'nis' => $item->nis,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'user' => $item->user_id ? [
                    'id' => $item->user_id,
                    'email' => $item->user_email,
                    'username' => $item->user_username,
                ] : null,
                'class' => $item->class_id ? [
                    'id' => $item->class_id,
                    'class_name' => $item->class_class_name,
                    'academic_period_id' => $item->class_academic_period_id,
                ] : null,
                'attendances' => $attendances
            ];

            return $this->sendResponse($formatted);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data siswa: ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'user_id' => 'required|exists:users,id',
                'class_id' => 'nullable|exists:classes,id',
                'full_name' => 'required|string|max:255',
                'nisn' => 'nullable|string',
                'nis' => 'nullable|string',
            ]);

            $student = Student::create($data);
            return $this->sendResponse($student, 'Siswa berhasil dibuat', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat siswa. Silakan coba lagi.');
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $student = Student::find($id);
            if (!$student) return $this->sendError('Siswa tidak ditemukan', [], 404);

            $data = $request->validate([
                'class_id' => 'nullable|exists:classes,id',
                'full_name' => 'sometimes|string|max:255',
                'nisn' => 'nullable|string',
                'nis' => 'nullable|string',
            ]);
            $student->update($data);
            return $this->sendResponse($student, 'Siswa diperbarui');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui data siswa. Silakan coba lagi.');
        }
    }

    public function destroy($id)
    {
        try {
            $student = Student::find($id);
            if (!$student) {
                return $this->sendError('Siswa tidak ditemukan', [], 404);
            }

            // Check if student has attendance records
            $hasAttendances = DB::table('attendances')->where('student_id', $id)->exists();
            if ($hasAttendances) {
                return $this->sendError('Tidak dapat menghapus siswa karena siswa sudah memiliki catatan absensi. Silakan nonaktifkan akun pengguna siswa untuk menonaktifkannya.', [], 400);
            }

            // Check if student has leave requests
            $hasLeaveRequests = DB::table('leave_requests')->where('student_id', $id)->exists();
            if ($hasLeaveRequests) {
                return $this->sendError('Tidak dapat menghapus siswa karena siswa memiliki data pengajuan izin/sakit. Silakan nonaktifkan akun pengguna siswa.', [], 400);
            }

            $userId = $student->user_id;

            DB::beginTransaction();

            $student->delete();

            // Clean up the associated user account
            if ($userId) {
                DB::table('users')->where('id', $userId)->delete();
            }

            DB::commit();

            return $this->sendResponse([], 'Siswa berhasil dihapus');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal menghapus siswa: ' . $e->getMessage(), [], 500);
        }
    }

    public function promoteBulk(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user->hasRole(['super_admin', 'admin'])) {
                return $this->sendError('Anda tidak memiliki izin untuk memindahkan kelas siswa.', [], 403);
            }

            $validated = $request->validate([
                'student_ids' => 'required|array',
                'student_ids.*' => 'exists:students,id',
                'target_class_id' => 'required|exists:classes,id',
            ]);

            $studentIds = $validated['student_ids'];
            $targetClassId = $validated['target_class_id'];

            DB::beginTransaction();

            Student::whereIn('id', $studentIds)->update([
                'class_id' => $targetClassId,
                'updated_at' => now()
            ]);

            // Add Audit Log
            $className = DB::table('classes')->where('id', $targetClassId)->value('class_name') ?? 'ID: ' . $targetClassId;
            \App\Models\AuditLog::create([
                'user_id' => $user->id,
                'action' => \App\Models\AuditLog::ACTION_UPDATE,
                'description' => "Memindahkan massal " . count($studentIds) . " siswa ke kelas " . $className,
                'model_type' => Student::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            DB::commit();

            return $this->sendResponse(null, 'Berhasil memindahkan ' . count($studentIds) . ' siswa ke kelas ' . $className . '.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal memproses pemindahan kelas siswa: ' . $e->getMessage());
        }
    }

    /**
     * Reset student device binding UUID
     */
    public function resetDevice(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user->hasRole(['super_admin', 'admin', 'guru', 'wali_kelas'])) {
                return $this->sendError('Anda tidak memiliki izin untuk mereset perangkat siswa.', [], 403);
            }

            $student = Student::findOrFail($id);
            $student->device_uuid = null;
            $student->save();

            // Audit Log
            \App\Models\AuditLog::create([
                'user_id' => $user->id,
                'action' => \App\Models\AuditLog::ACTION_UPDATE,
                'description' => "Reset device UUID for student #{$id} ({$student->full_name})",
                'model_type' => Student::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return $this->sendResponse(null, 'Perangkat siswa berhasil di-reset.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mereset perangkat: ' . $e->getMessage());
        }
    }
}
