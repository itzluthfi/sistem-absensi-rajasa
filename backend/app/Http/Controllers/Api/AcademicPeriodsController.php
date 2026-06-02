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

    /**
     * Sync transition/migration from source period to target period (Semester Shift / Kenaikan Kelas otomatis)
     */
    public function syncTransition(Request $request, $id)
    {
        try {
            $targetPeriod = AcademicPeriod::findOrFail($id);

            $validated = $request->validate([
                'source_period_id' => 'required|exists:academic_periods,id',
                'transition_type' => 'required|in:same_year,new_year',
            ]);

            $sourcePeriodId = $validated['source_period_id'];
            $transitionType = $validated['transition_type'];

            if ($sourcePeriodId == $id) {
                return $this->sendError('Periode asal dan tujuan tidak boleh sama.', [], 400);
            }

            // 1. Dapatkan semua kelas dari periode asal
            $sourceClasses = \App\Models\SchoolClass::where('academic_period_id', $sourcePeriodId)->get();
            if ($sourceClasses->isEmpty()) {
                return $this->sendError('Periode asal tidak memiliki data kelas.', [], 400);
            }

            \DB::beginTransaction();

            $classMap = []; // Mapping dari source_class_id ke target_class_id
            
            if ($transitionType === 'same_year') {
                // Skenario A: Ganjil -> Genap (Tahun ajaran sama, rombel sama, hanya ganti periode)
                foreach ($sourceClasses as $sourceClass) {
                    $targetClass = \App\Models\SchoolClass::updateOrCreate([
                        'class_name' => $sourceClass->class_name,
                        'academic_period_id' => $targetPeriod->id,
                    ], [
                        'major_id' => $sourceClass->major_id,
                        'homeroom_teacher_id' => $sourceClass->homeroom_teacher_id,
                        'academic_year' => $targetPeriod->academic_year,
                    ]);
                    $classMap[$sourceClass->id] = $targetClass->id;
                }

                // Update class_id siswa yang aktif dari kelas asal ke kelas tujuan
                foreach ($classMap as $sourceClassId => $targetClassId) {
                    \App\Models\Student::where('class_id', $sourceClassId)
                        ->where('status', 'active')
                        ->update(['class_id' => $targetClassId]);
                }

                // Copy jadwal (schedules) dari periode asal ke periode tujuan
                $sourceSchedules = \App\Models\Schedule::where('academic_period_id', $sourcePeriodId)->get();
                foreach ($sourceSchedules as $sch) {
                    $targetClassId = $classMap[$sch->class_id] ?? null;
                    if ($targetClassId) {
                        \App\Models\Schedule::updateOrCreate([
                            'class_id' => $targetClassId,
                            'day_name' => $sch->day_name,
                            'start_time' => $sch->start_time,
                            'academic_period_id' => $targetPeriod->id,
                        ], [
                            'subject_id' => $sch->subject_id,
                            'teacher_id' => $sch->teacher_id,
                            'end_time' => $sch->end_time,
                            'room' => $sch->room,
                        ]);
                    }
                }

            } else {
                // Skenario B: Genap -> Ganjil (Kenaikan Kelas otomatis!)
                // 1. Buat dulu kelas X, XI, XII di periode tujuan
                foreach ($sourceClasses as $sourceClass) {
                    $name = $sourceClass->class_name;
                    $parts = explode(' ', $name, 2);
                    $level = $parts[0] ?? '';
                    $suffix = $parts[1] ?? '';

                    // Kelas X Baru (salin kelas X lama untuk menampung angkatan baru)
                    if ($level === 'X') {
                        \App\Models\SchoolClass::updateOrCreate([
                            'class_name' => "X {$suffix}",
                            'academic_period_id' => $targetPeriod->id,
                        ], [
                            'major_id' => $sourceClass->major_id,
                            'homeroom_teacher_id' => $sourceClass->homeroom_teacher_id,
                            'academic_year' => $targetPeriod->academic_year,
                        ]);
                    }

                    // Tentukan kelas lanjutan
                    $targetClassName = null;
                    if ($level === 'X') {
                        $targetClassName = "XI {$suffix}";
                    } elseif ($level === 'XI') {
                        $targetClassName = "XII {$suffix}";
                    }

                    if ($targetClassName) {
                        $targetClass = \App\Models\SchoolClass::updateOrCreate([
                            'class_name' => $targetClassName,
                            'academic_period_id' => $targetPeriod->id,
                        ], [
                            'major_id' => $sourceClass->major_id,
                            'homeroom_teacher_id' => $sourceClass->homeroom_teacher_id,
                            'academic_year' => $targetPeriod->academic_year,
                        ]);
                        $classMap[$sourceClass->id] = $targetClass->id;
                    } else {
                        // Level XII -> Lulus (Tidak ada kelas lanjutan)
                        $classMap[$sourceClass->id] = 'graduated';
                    }
                }

                // 2. Naikkan kelas siswa
                foreach ($classMap as $sourceClassId => $targetClassId) {
                    if ($targetClassId === 'graduated') {
                        // Siswa kelas XII -> Set status jadi tidak aktif (lulus)
                        \App\Models\Student::where('class_id', $sourceClassId)
                            ->where('status', 'active')
                            ->update(['status' => 'inactive', 'class_id' => null]);
                    } else {
                        // Siswa kelas X -> XI, XI -> XII
                        \App\Models\Student::where('class_id', $sourceClassId)
                            ->where('status', 'active')
                            ->update(['class_id' => $targetClassId]);
                    }
                }

                // 3. Salin jadwal sebagai draft ke kelas XI dan XII
                $sourceSchedules = \App\Models\Schedule::where('academic_period_id', $sourcePeriodId)->get();
                foreach ($sourceSchedules as $sch) {
                    $targetClassId = $classMap[$sch->class_id] ?? null;
                    if ($targetClassId && $targetClassId !== 'graduated') {
                        \App\Models\Schedule::updateOrCreate([
                            'class_id' => $targetClassId,
                            'day_name' => $sch->day_name,
                            'start_time' => $sch->start_time,
                            'academic_period_id' => $targetPeriod->id,
                        ], [
                            'subject_id' => $sch->subject_id,
                            'teacher_id' => $sch->teacher_id,
                            'end_time' => $sch->end_time,
                            'room' => $sch->room,
                        ]);
                    }
                }
            }

            \DB::commit();

            return $this->sendResponse(null, 'Sinkronisasi transisi semester baru berhasil diselesaikan.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            \DB::rollBack();
            return $this->sendError('Gagal melakukan sinkronisasi transisi semester: ' . $e->getMessage());
        }
    }
}
