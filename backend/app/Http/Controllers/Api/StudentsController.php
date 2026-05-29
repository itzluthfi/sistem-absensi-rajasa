<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentsController extends BaseController
{
    public function index()
    {
        try {
            $students = Student::with('user', 'class')->paginate(15);
            return $this->sendResponse($students);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data siswa. Silakan coba lagi.');
        }
    }

    public function show($id)
    {
        try {
            $student = Student::with('user', 'class', 'attendances')->find($id);
            if (!$student) return $this->sendError('Siswa tidak ditemukan', [], 404);
            return $this->sendResponse($student);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data siswa. Silakan coba lagi.');
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
