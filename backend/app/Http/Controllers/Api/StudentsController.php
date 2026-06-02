<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Student;
use Illuminate\Http\Request;
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
                    'users.username as user_username',
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
                            'username' => $item->user_username,
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
                    'users.username as user_username',
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
            if (!$student) return $this->sendError('Siswa tidak ditemukan', [], 404);
            $student->delete();
            return $this->sendResponse([], 'Siswa dihapus');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus siswa. Silakan coba lagi.');
        }
    }
}
