<?php

namespace App\Http\Controllers\Api;

use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends BaseController
{
    /**
     * Display a listing of subjects (Mata Pelajaran)
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $search = $request->input('search');

            $query = Subject::query()->orderBy('subject_name', 'asc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('subject_name', 'like', "%{$search}%")
                      ->orWhere('subject_code', 'like', "%{$search}%");
                });
            }

            $subjects = $query->paginate($perPage);

            return $this->sendResponse($subjects, 'Subjects retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve subjects');
        }
    }

    /**
     * Store a newly created subject
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'subject_name' => 'required|string|max:255',
                'subject_code' => 'nullable|string|max:50|unique:subjects,subject_code',
                'description' => 'nullable|string',
            ]);

            $subject = Subject::create($validated);

            return $this->sendResponse($subject, 'Subject created successfully', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Failed to create subject: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified subject
     */
    public function show($id)
    {
        try {
            $subject = Subject::findOrFail($id);
            return $this->sendResponse($subject, 'Subject retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Subject not found', [], 404);
        }
    }

    /**
     * Update the specified subject
     */
    public function update(Request $request, $id)
    {
        try {
            $subject = Subject::findOrFail($id);

            $validated = $request->validate([
                'subject_name' => 'sometimes|required|string|max:255',
                'subject_code' => 'sometimes|nullable|string|max:50|unique:subjects,subject_code,' . $id,
                'description' => 'nullable|string',
            ]);

            $subject->update($validated);

            return $this->sendResponse($subject, 'Subject updated successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Failed to update subject: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified subject
     */
    public function destroy($id)
    {
        try {
            $subject = Subject::findOrFail($id);

            // Check if subject is used in schedules
            $hasSchedules = \Illuminate\Support\Facades\DB::table('schedules')->where('subject_id', $id)->exists();
            if ($hasSchedules) {
                return $this->sendError('Tidak dapat menghapus mata pelajaran karena masih digunakan dalam jadwal pelajaran aktif.', [], 400);
            }

            $subject->delete();

            return $this->sendResponse(null, 'Mata pelajaran berhasil dihapus.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus mata pelajaran: ' . $e->getMessage(), [], 500);
        }
    }
}