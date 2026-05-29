<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TeachersController extends BaseController
{
    public function index()
    {
        try {
            $teachers = Teacher::with('user')->paginate(15);
            return $this->sendResponse($teachers);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data guru. Silakan coba lagi.');
        }
    }

    public function show($id)
    {
        try {
            $teacher = Teacher::with('user', 'classes')->find($id);
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);
            return $this->sendResponse($teacher);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data guru. Silakan coba lagi.');
        }
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'user_id' => 'required|exists:users,id',
                'nip' => 'nullable|string',
                'full_name' => 'required|string|max:255',
            ]);

            $teacher = Teacher::create($data);
            return $this->sendResponse($teacher, 'Guru berhasil dibuat', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat guru. Silakan coba lagi.');
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $teacher = Teacher::find($id);
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);

            $data = $request->validate([
                'nip' => 'nullable|string',
                'full_name' => 'sometimes|string|max:255',
            ]);

            $teacher->update($data);
            return $this->sendResponse($teacher, 'Guru diperbarui');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui data guru. Silakan coba lagi.');
        }
    }

    public function destroy($id)
    {
        try {
            $teacher = Teacher::find($id);
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);
            $teacher->delete();
            return $this->sendResponse([], 'Guru dihapus');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus guru. Silakan coba lagi.');
        }
    }
}
