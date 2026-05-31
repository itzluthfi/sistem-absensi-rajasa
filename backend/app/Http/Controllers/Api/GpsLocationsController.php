<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GpsLocationsController extends BaseController
{
    /**
     * List all GPS locations
     */
    public function index()
    {
        try {
            $locations = DB::table('gps_locations')
                ->orderBy('is_active', 'desc')
                ->orderBy('created_at', 'asc')
                ->get();

            return $this->sendResponse($locations, 'Daftar lokasi GPS berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil lokasi GPS: ' . $e->getMessage());
        }
    }

    /**
     * Store a new GPS location
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name'          => 'required|string|max:100',
                'latitude'      => 'required|numeric|between:-90,90',
                'longitude'     => 'required|numeric|between:-180,180',
                'radius_meters' => 'required|integer|min:5|max:5000',
                'is_active'     => 'sometimes|boolean',
            ]);

            $validated['is_active']   = $validated['is_active'] ?? true;
            $validated['created_at']  = now()->toDateTimeString();
            $validated['updated_at']  = now()->toDateTimeString();

            $id = DB::table('gps_locations')->insertGetId($validated);

            $location = DB::table('gps_locations')->where('id', $id)->first();

            return $this->sendResponse($location, 'Lokasi GPS berhasil ditambahkan.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal menyimpan lokasi GPS: ' . $e->getMessage());
        }
    }

    /**
     * Update a GPS location
     */
    public function update(Request $request, $id)
    {
        try {
            $exists = DB::table('gps_locations')->where('id', $id)->exists();
            if (!$exists) {
                return $this->sendError('Lokasi GPS tidak ditemukan.', [], 404);
            }

            $validated = $request->validate([
                'name'          => 'sometimes|required|string|max:100',
                'latitude'      => 'sometimes|required|numeric|between:-90,90',
                'longitude'     => 'sometimes|required|numeric|between:-180,180',
                'radius_meters' => 'sometimes|required|integer|min:5|max:5000',
                'is_active'     => 'sometimes|boolean',
            ]);

            $validated['updated_at'] = now()->toDateTimeString();

            DB::table('gps_locations')->where('id', $id)->update($validated);

            $location = DB::table('gps_locations')->where('id', $id)->first();

            return $this->sendResponse($location, 'Lokasi GPS berhasil diperbarui.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui lokasi GPS: ' . $e->getMessage());
        }
    }

    /**
     * Delete a GPS location
     */
    public function destroy($id)
    {
        try {
            // Count active locations before deletion to prevent deleting the last one
            $activeCount = DB::table('gps_locations')->where('is_active', true)->count();
            $target = DB::table('gps_locations')->where('id', $id)->first();

            if (!$target) {
                return $this->sendError('Lokasi GPS tidak ditemukan.', [], 404);
            }

            if ($activeCount <= 1 && $target->is_active) {
                return $this->sendError('Tidak dapat menghapus satu-satunya lokasi aktif. Tambahkan lokasi lain terlebih dahulu.', [], 422);
            }

            DB::table('gps_locations')->where('id', $id)->delete();

            return $this->sendResponse(null, 'Lokasi GPS berhasil dihapus.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus lokasi GPS: ' . $e->getMessage());
        }
    }

    /**
     * Toggle is_active status
     */
    public function toggle($id)
    {
        try {
            $location = DB::table('gps_locations')->where('id', $id)->first();
            if (!$location) {
                return $this->sendError('Lokasi GPS tidak ditemukan.', [], 404);
            }

            // Prevent disabling the last active location
            if ($location->is_active) {
                $activeCount = DB::table('gps_locations')->where('is_active', true)->count();
                if ($activeCount <= 1) {
                    return $this->sendError('Tidak dapat menonaktifkan satu-satunya lokasi aktif.', [], 422);
                }
            }

            DB::table('gps_locations')->where('id', $id)->update([
                'is_active'  => !$location->is_active,
                'updated_at' => now()->toDateTimeString(),
            ]);

            $updated = DB::table('gps_locations')->where('id', $id)->first();

            return $this->sendResponse($updated, 'Status lokasi GPS berhasil diubah.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengubah status: ' . $e->getMessage());
        }
    }
}
