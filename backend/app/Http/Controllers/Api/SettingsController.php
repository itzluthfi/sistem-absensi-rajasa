<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;
use Illuminate\Validation\ValidationException;
 
class SettingsController extends BaseController
{
    /**
     * Get the global GPS Geofencing Settings
     */
    public function getGpsSettings(Request $request)
    {
        try {
            $user = $request->user();
            
            // Limit access to administrative roles
            if (!$user->hasRole(['super_admin', 'admin', 'guru'])) {
                return $this->sendError('Anda tidak memiliki izin untuk melihat pengaturan GPS.', [], 403);
            }
 
            $settings = DB::table('settings')
                ->whereIn('key', ['school_latitude', 'school_longitude', 'school_radius_meters'])
                ->get()
                ->keyBy('key');
 
            $data = [
                'school_latitude' => (double) ($settings['school_latitude']->value ?? -7.245583),
                'school_longitude' => (double) ($settings['school_longitude']->value ?? 112.737750),
                'school_radius_meters' => (int) ($settings['school_radius_meters']->value ?? 100),
            ];
 
            return $this->sendResponse($data, 'Pengaturan GPS berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil pengaturan GPS: ' . $e->getMessage());
        }
    }
 
    /**
     * Update the global GPS Geofencing Settings
     */
    public function updateGpsSettings(Request $request)
    {
        try {
            $user = $request->user();
            
            // Strictly check for write permission (only Admin and Super Admin)
            if (!$user->hasRole(['super_admin', 'admin'])) {
                return $this->sendError('Anda tidak memiliki izin untuk mengubah pengaturan GPS.', [], 403);
            }
 
            $data = $request->validate([
                'school_latitude' => 'required|numeric|between:-90,90',
                'school_longitude' => 'required|numeric|between:-180,180',
                'school_radius_meters' => 'required|integer|min:5|max:5000',
            ]);
 
            DB::beginTransaction();
 
            DB::table('settings')
                ->where('key', 'school_latitude')
                ->update([
                    'value' => (string) $data['school_latitude'],
                    'updated_at' => now(),
                ]);
 
            DB::table('settings')
                ->where('key', 'school_longitude')
                ->update([
                    'value' => (string) $data['school_longitude'],
                    'updated_at' => now(),
                ]);
 
            DB::table('settings')
                ->where('key', 'school_radius_meters')
                ->update([
                    'value' => (string) $data['school_radius_meters'],
                    'updated_at' => now(),
                ]);
 
            // Audit Log the change
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Updated school GPS Geofencing: Lat={$data['school_latitude']}, Lng={$data['school_longitude']}, Radius={$data['school_radius_meters']}m",
                'model_type' => 'App\\Models\\Setting',
                'model_id' => 0,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode($data),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            DB::commit();
 
            return $this->sendResponse($data, 'Pengaturan GPS berhasil diperbarui.');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal memperbarui pengaturan GPS: ' . $e->getMessage());
        }
    }

    /**
     * Get the global daily entry attendance mode setting (scan vs click)
     */
    public function getEntryMode(Request $request)
    {
        try {
            $mode = DB::table('settings')->where('key', 'school_entry_attendance_mode')->value('value') ?? 'scan';
            return $this->sendResponse(['mode' => $mode], 'Mode absensi masuk berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil mode absensi masuk: ' . $e->getMessage());
        }
    }

    /**
     * Update the global daily entry attendance mode setting (scan vs click)
     */
    public function updateEntryMode(Request $request)
    {
        try {
            $user = $request->user();
            
            // Strictly check for write permission (only Admin and Super Admin)
            if (!$user->hasRole(['super_admin', 'admin'])) {
                return $this->sendError('Anda tidak memiliki izin untuk mengubah mode absensi masuk.', [], 403);
            }

            $data = $request->validate([
                'mode' => 'required|in:scan,click',
            ]);

            DB::table('settings')
                ->where('key', 'school_entry_attendance_mode')
                ->update([
                    'value' => $data['mode'],
                    'updated_at' => now(),
                ]);

            // Audit Log the change
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Updated school entry attendance mode to: " . $data['mode'],
                'model_type' => 'App\\Models\\Setting',
                'model_id' => 0,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode($data),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->sendResponse($data, 'Mode absensi masuk berhasil diperbarui.');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui mode absensi masuk: ' . $e->getMessage());
        }
    }
}
