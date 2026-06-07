<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClassesController extends BaseController
{
    public function index(Request $request)
    {
        try {
            $query = \Illuminate\Support\Facades\DB::table('classes')
                ->leftJoin('majors', 'classes.major_id', '=', 'majors.id')
                ->leftJoin('teachers', 'classes.homeroom_teacher_id', '=', 'teachers.id')
                ->select([
                    'classes.*',
                    'majors.major_name as major_major_name',
                    'majors.major_code as major_major_code',
                    'teachers.full_name as teacher_full_name',
                    'teachers.nip as teacher_nip'
                ]);

            if ($request->has('academic_period_id')) {
                $query->where('classes.academic_period_id', $request->query('academic_period_id'));
            }

            $classes = $query->paginate(15);

            // Restructure stdClass to nested JSON structures for frontend compatibility
            $classes->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'major_id' => $item->major_id,
                    'homeroom_teacher_id' => $item->homeroom_teacher_id,
                    'academic_period_id' => $item->academic_period_id,
                    'class_name' => $item->class_name,
                    'academic_year' => $item->academic_year,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'major' => $item->major_id ? [
                        'id' => $item->major_id,
                        'major_name' => $item->major_major_name,
                        'major_code' => $item->major_major_code,
                    ] : null,
                    'homeroom_teacher' => $item->homeroom_teacher_id ? [
                        'id' => $item->homeroom_teacher_id,
                        'full_name' => $item->teacher_full_name,
                        'nip' => $item->teacher_nip,
                    ] : null
                ];
            });

            return $this->sendResponse($classes);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data kelas: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        try {
            $item = \Illuminate\Support\Facades\DB::table('classes')
                ->leftJoin('majors', 'classes.major_id', '=', 'majors.id')
                ->leftJoin('teachers', 'classes.homeroom_teacher_id', '=', 'teachers.id')
                ->select([
                    'classes.*',
                    'majors.major_name as major_major_name',
                    'majors.major_code as major_major_code',
                    'teachers.full_name as teacher_full_name',
                    'teachers.nip as teacher_nip'
                ])
                ->where('classes.id', $id)
                ->first();

            if (!$item) {
                return $this->sendError('Kelas tidak ditemukan', [], 404);
            }

            // Fetch students inside this class with flat Query Builder
            $students = \Illuminate\Support\Facades\DB::table('students')
                ->where('class_id', $id)
                ->get();

            $formatted = [
                'id' => $item->id,
                'major_id' => $item->major_id,
                'homeroom_teacher_id' => $item->homeroom_teacher_id,
                'academic_period_id' => $item->academic_period_id,
                'class_name' => $item->class_name,
                'academic_year' => $item->academic_year,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'major' => $item->major_id ? [
                    'id' => $item->major_id,
                    'major_name' => $item->major_major_name,
                    'major_code' => $item->major_major_code,
                ] : null,
                'homeroom_teacher' => $item->homeroom_teacher_id ? [
                    'id' => $item->homeroom_teacher_id,
                    'full_name' => $item->teacher_full_name,
                    'nip' => $item->teacher_nip,
                ] : null,
                'students' => $students
            ];

            return $this->sendResponse($formatted);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data kelas: ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'major_id' => 'required|exists:majors,id',
                'homeroom_teacher_id' => 'nullable|exists:teachers,id',
                'class_name' => 'required|string|max:255',
                'academic_year' => 'nullable|string',
            ]);

            $class = SchoolClass::create($data);
            return $this->sendResponse($class, 'Kelas berhasil dibuat', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat kelas. Silakan coba lagi.');
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $class = SchoolClass::find($id);
            if (!$class) return $this->sendError('Kelas tidak ditemukan', [], 404);

            $data = $request->validate([
                'homeroom_teacher_id' => 'nullable|exists:teachers,id',
                'class_name' => 'sometimes|string|max:255',
                'academic_year' => 'nullable|string',
            ]);

            $class->update($data);
            return $this->sendResponse($class, 'Kelas diperbarui');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui data kelas. Silakan coba lagi.');
        }
    }

    public function destroy($id)
    {
        try {
            $class = SchoolClass::find($id);
            if (!$class) {
                return $this->sendError('Kelas tidak ditemukan', [], 404);
            }

            // Check if class has students
            $hasStudents = \Illuminate\Support\Facades\DB::table('students')->where('class_id', $id)->exists();
            if ($hasStudents) {
                return $this->sendError('Tidak dapat menghapus kelas karena masih ada siswa di dalam kelas ini. Silakan pindahkan siswa terlebih dahulu.', [], 400);
            }

            // Check if class has schedules
            $hasSchedules = \Illuminate\Support\Facades\DB::table('schedules')->where('class_id', $id)->exists();
            if ($hasSchedules) {
                return $this->sendError('Tidak dapat menghapus kelas karena kelas ini memiliki jadwal pelajaran aktif. Silakan hapus jadwal pelajaran terkait terlebih dahulu.', [], 400);
            }

            $class->delete();
            return $this->sendResponse([], 'Kelas berhasil dihapus');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus kelas: ' . $e->getMessage(), [], 500);
        }
    }
}
