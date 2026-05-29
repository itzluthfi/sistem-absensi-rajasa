<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClassesController extends BaseController
{
    public function index()
    {
        try {
            $classes = SchoolClass::with('major', 'homeroomTeacher')->paginate(15);
            return $this->sendResponse($classes);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data kelas. Silakan coba lagi.');
        }
    }

    public function show($id)
    {
        try {
            $class = SchoolClass::with('major', 'homeroomTeacher', 'students')->find($id);
            if (!$class) return $this->sendError('Kelas tidak ditemukan', [], 404);
            return $this->sendResponse($class);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data kelas. Silakan coba lagi.');
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
            if (!$class) return $this->sendError('Kelas tidak ditemukan', [], 404);
            $class->delete();
            return $this->sendResponse([], 'Kelas dihapus');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus kelas. Silakan coba lagi.');
        }
    }
}
