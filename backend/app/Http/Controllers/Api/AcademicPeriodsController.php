<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\AcademicPeriod;
use Illuminate\Http\Request;

class AcademicPeriodsController extends BaseController
{
    /**
     * Display a listing of academic periods
     */
    public function index()
    {
        try {
            $periods = AcademicPeriod::orderBy('id', 'desc')->get();
            return $this->sendResponse($periods, 'Periode akademik berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data periode akademik: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created academic period
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'semester' => 'required|in:ganjil,genap',
                'academic_year' => 'required|string|max:50',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'is_active' => 'required|boolean',
            ]);

            // If the new period is set as active, deactivate all other periods
            if ($validated['is_active']) {
                AcademicPeriod::where('is_active', true)->update(['is_active' => false]);
            }

            $period = AcademicPeriod::create($validated);

            return $this->sendResponse($period, 'Periode akademik berhasil dibuat.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat periode akademik: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified academic period
     */
    public function show($id)
    {
        try {
            $period = AcademicPeriod::findOrFail($id);
            return $this->sendResponse($period, 'Periode akademik berhasil ditemukan.');
        } catch (\Exception $e) {
            return $this->sendError('Periode akademik tidak ditemukan.', [], 404);
        }
    }

    /**
     * Update the specified academic period
     */
    public function update(Request $request, $id)
    {
        try {
            $period = AcademicPeriod::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'semester' => 'sometimes|required|in:ganjil,genap',
                'academic_year' => 'sometimes|required|string|max:50',
                'start_date' => 'sometimes|required|date',
                'end_date' => 'sometimes|required|date|after_or_equal:start_date',
                'is_active' => 'sometimes|required|boolean',
            ]);

            // If updating is_active to true, deactivate all other periods
            if (isset($validated['is_active']) && $validated['is_active']) {
                AcademicPeriod::where('id', '!=', $id)->where('is_active', true)->update(['is_active' => false]);
            }

            $period->update($validated);

            return $this->sendResponse($period, 'Periode akademik berhasil diperbarui.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui periode akademik: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified academic period
     */
    public function destroy($id)
    {
        try {
            $period = AcademicPeriod::findOrFail($id);
            
            // Do not allow deleting the currently active period to prevent database integrity issues
            if ($period->is_active) {
                return $this->sendError('Tidak dapat menghapus periode akademik yang sedang aktif.', [], 400);
            }

            $period->delete();

            return $this->sendResponse(null, 'Periode akademik berhasil dihapus.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus periode akademik: ' . $e->getMessage());
        }
    }
}
