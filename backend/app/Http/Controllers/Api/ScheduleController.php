<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScheduleController extends BaseController
{
    /**
     * Get schedules for today (Jadwal Mengajar Guru / Jadwal Pelajaran Siswa Hari Ini)
     */
    public function today(Request $request)
    {
        try {
            $user = $request->user();
            // Force Asia/Jakarta timezone (school locale) and allow client overrides for timezone robustness
            $todayEnglish = $request->input('day') ?: now()->setTimezone('Asia/Jakarta')->format('l');
            $today = $request->input('date') ?: now()->setTimezone('Asia/Jakarta')->toDateString();
            
            $query = DB::table('schedules')
                ->leftJoin('subjects', 'schedules.subject_id', '=', 'subjects.id')
                ->leftJoin('classes', 'schedules.class_id', '=', 'classes.id')
                ->leftJoin('teachers', 'schedules.teacher_id', '=', 'teachers.id')
                ->where('schedules.day_name', $todayEnglish);

            // Apply role-based filters
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('schedules.class_id', $user->student->class_id);
            } elseif ($user->hasRole('guru') && $user->teacher) {
                $query->where('schedules.teacher_id', $user->teacher->id);
            } else {
                if ($request->has('class_id')) {
                    $query->where('schedules.class_id', $request->class_id);
                }
                if ($request->has('teacher_id')) {
                    $query->where('schedules.teacher_id', $request->teacher_id);
                }
            }

            $rawSchedules = $query->orderBy('schedules.start_time')
                ->select([
                    'schedules.*',
                    'subjects.subject_name as subject_name',
                    'subjects.subject_code as subject_code',
                    'subjects.description as subject_description',
                    'classes.class_name as class_name',
                    'classes.major_id as class_major_id',
                    'classes.academic_period_id as class_academic_period_id',
                    'teachers.user_id as teacher_user_id',
                    'teachers.full_name as teacher_full_name',
                    'teachers.nip as teacher_nip'
                ])
                ->get();

            if ($rawSchedules->isEmpty()) {
                return $this->sendResponse([], 'Jadwal hari ini kosong.');
            }

            $scheduleIds = $rawSchedules->pluck('id')->toArray();

            // Fetch active sessions for today at once (Batching N+1)
            $activeSessions = DB::table('attendance_sessions')
                ->whereIn('schedule_id', $scheduleIds)
                ->where('attendance_date', $today)
                ->where('is_active', true)
                ->get()
                ->keyBy('schedule_id');

            // Fetch student attendances for today at once if siswa (Batching N+1)
            $attendances = collect();
            if ($user->hasRole('siswa') && $user->student) {
                $attendances = DB::table('attendances')
                    ->where('student_id', $user->student->id)
                    ->where('date', $today)
                    ->get();
            }

            // Map and format results into the exact nested JSON schema
            $formattedSchedules = $rawSchedules->map(function ($sch) use ($activeSessions, $attendances, $user, $today) {
                $schId = $sch->id;
                
                // Get active session from memory
                $activeSession = $activeSessions->get($schId);
                
                // Determine attendance status & time
                $attendanceStatus = 'belum_absen';
                $attendanceTime = null;

                if ($user->hasRole('siswa') && $user->student) {
                    $attendance = $attendances->first(function ($att) use ($activeSession, $schId) {
                        if ($activeSession) {
                            return $att->attendance_session_id === $activeSession->id;
                        }
                        return $att->schedule_id === $schId;
                    });

                    if ($attendance) {
                        $attendanceStatus = $attendance->status;
                        $attendanceTime = $attendance->time ? substr($attendance->time, 0, 5) : null;
                    }
                }

                return [
                    'id' => $sch->id,
                    'class_id' => $sch->class_id,
                    'teacher_id' => $sch->teacher_id,
                    'subject_id' => $sch->subject_id,
                    'academic_period_id' => $sch->academic_period_id,
                    'day_name' => $sch->day_name,
                    'start_time' => $sch->start_time,
                    'end_time' => $sch->end_time,
                    'room' => $sch->room,
                    'created_at' => $sch->created_at,
                    'updated_at' => $sch->updated_at,
                    'subject' => $sch->subject_id ? [
                        'id' => $sch->subject_id,
                        'subject_name' => $sch->subject_name,
                        'subject_code' => $sch->subject_code,
                        'description' => $sch->subject_description,
                    ] : null,
                    'class' => $sch->class_id ? [
                        'id' => $sch->class_id,
                        'class_name' => $sch->class_name,
                        'major_id' => $sch->class_major_id,
                        'academic_period_id' => $sch->class_academic_period_id,
                    ] : null,
                    'teacher' => $sch->teacher_id ? [
                        'id' => $sch->teacher_id,
                        'user_id' => $sch->teacher_user_id,
                        'full_name' => $sch->teacher_full_name,
                        'nip' => $sch->teacher_nip,
                    ] : null,
                    'active_session' => $activeSession ? [
                        'id' => $activeSession->id,
                        'schedule_id' => $activeSession->schedule_id,
                        'academic_period_id' => $activeSession->academic_period_id,
                        'qr_token' => $activeSession->qr_token,
                        'attendance_date' => $activeSession->attendance_date,
                        'open_time' => $activeSession->open_time,
                        'close_time' => $activeSession->close_time,
                        'is_active' => (bool)$activeSession->is_active,
                        'require_qr' => (bool)$activeSession->require_qr,
                    ] : null,
                    'attendance_status' => $attendanceStatus,
                    'attendance_time' => $attendanceTime,
                ];
            });

            return $this->sendResponse($formattedSchedules, 'Jadwal hari ini berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil jadwal hari ini: ' . $e->getMessage());
        }
    }

    /**
     * Display a listing of schedules (Jadwal Pelajaran)
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $dayName = $request->input('day_name') ?? $request->input('day_of_week'); // Fallback for safety
            $classId = $request->input('class_id');
            $teacherId = $request->input('teacher_id');
            $academicPeriodId = $request->input('academic_period_id');

            $query = DB::table('schedules')
                ->leftJoin('subjects', 'schedules.subject_id', '=', 'subjects.id')
                ->leftJoin('classes', 'schedules.class_id', '=', 'classes.id')
                ->leftJoin('teachers', 'schedules.teacher_id', '=', 'teachers.id');

            if ($dayName) {
                // If it is numeric day number, map it to English day name for robustness
                if (is_numeric($dayName)) {
                    $daysMap = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];
                    $dayName = $daysMap[(int)$dayName] ?? 'Monday';
                }
                $query->where('schedules.day_name', $dayName);
            }

            if ($classId) {
                $query->where('schedules.class_id', $classId);
            }

            if ($teacherId) {
                $query->where('schedules.teacher_id', $teacherId);
            }

            if ($academicPeriodId) {
                $query->where('schedules.academic_period_id', $academicPeriodId);
            }

            if ($request->boolean('all') || $request->input('paginate') === 'false') {
                $rawSchedules = $query->orderBy('schedules.day_name')
                    ->orderBy('schedules.start_time')
                    ->select([
                        'schedules.*',
                        'subjects.subject_name', 'subjects.subject_code', 'subjects.description as subject_description',
                        'classes.class_name', 'classes.major_id as class_major_id', 'classes.academic_period_id as class_academic_period_id',
                        'teachers.user_id as teacher_user_id', 'teachers.full_name as teacher_full_name', 'teachers.nip as teacher_nip'
                    ])
                    ->get();

                $formattedSchedules = $rawSchedules->map(function ($sch) {
                    return [
                        'id' => $sch->id,
                        'class_id' => $sch->class_id,
                        'teacher_id' => $sch->teacher_id,
                        'subject_id' => $sch->subject_id,
                        'academic_period_id' => $sch->academic_period_id,
                        'day_name' => $sch->day_name,
                        'start_time' => $sch->start_time,
                        'end_time' => $sch->end_time,
                        'room' => $sch->room,
                        'created_at' => $sch->created_at,
                        'updated_at' => $sch->updated_at,
                        'subject' => $sch->subject_id ? [
                            'id' => $sch->subject_id,
                            'subject_name' => $sch->subject_name,
                            'subject_code' => $sch->subject_code,
                            'description' => $sch->subject_description,
                        ] : null,
                        'class' => $sch->class_id ? [
                            'id' => $sch->class_id,
                            'class_name' => $sch->class_name,
                            'major_id' => $sch->class_major_id,
                            'academic_period_id' => $sch->class_academic_period_id,
                        ] : null,
                        'teacher' => $sch->teacher_id ? [
                            'id' => $sch->teacher_id,
                            'user_id' => $sch->teacher_user_id,
                            'full_name' => $sch->teacher_full_name,
                            'nip' => $sch->teacher_nip,
                        ] : null,
                    ];
                });

                return $this->sendResponse($formattedSchedules, 'Jadwal pelajaran berhasil diambil.');
            }

            $schedules = $query->orderBy('schedules.day_name')
                ->orderBy('schedules.start_time')
                ->select([
                    'schedules.*',
                    'subjects.subject_name', 'subjects.subject_code', 'subjects.description as subject_description',
                    'classes.class_name', 'classes.major_id as class_major_id', 'classes.academic_period_id as class_academic_period_id',
                    'teachers.user_id as teacher_user_id', 'teachers.full_name as teacher_full_name', 'teachers.nip as teacher_nip'
                ])
                ->paginate($perPage);

            // Format relation objects in pagination collection
            $schedules->getCollection()->transform(function ($sch) {
                return [
                    'id' => $sch->id,
                    'class_id' => $sch->class_id,
                    'teacher_id' => $sch->teacher_id,
                    'subject_id' => $sch->subject_id,
                    'academic_period_id' => $sch->academic_period_id,
                    'day_name' => $sch->day_name,
                    'start_time' => $sch->start_time,
                    'end_time' => $sch->end_time,
                    'room' => $sch->room,
                    'created_at' => $sch->created_at,
                    'updated_at' => $sch->updated_at,
                    'subject' => $sch->subject_id ? [
                        'id' => $sch->subject_id,
                        'subject_name' => $sch->subject_name,
                        'subject_code' => $sch->subject_code,
                        'description' => $sch->subject_description,
                    ] : null,
                    'class' => $sch->class_id ? [
                        'id' => $sch->class_id,
                        'class_name' => $sch->class_name,
                        'major_id' => $sch->class_major_id,
                        'academic_period_id' => $sch->class_academic_period_id,
                    ] : null,
                    'teacher' => $sch->teacher_id ? [
                        'id' => $sch->teacher_id,
                        'user_id' => $sch->teacher_user_id,
                        'full_name' => $sch->teacher_full_name,
                        'nip' => $sch->teacher_nip,
                    ] : null,
                ];
            });

            return $this->sendResponse($schedules, 'Jadwal pelajaran berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil jadwal pelajaran: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created schedule
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'subject_id' => 'required|exists:subjects,id',
                'class_id' => 'required|exists:classes,id',
                'teacher_id' => 'required|exists:teachers,id',
                'day_name' => 'required|string|max:20',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'room' => 'nullable|string|max:100',
            ]);

            $classId = $validated['class_id'];
            $teacherId = $validated['teacher_id'];
            $dayName = $validated['day_name'];
            $startTime = $validated['start_time'];
            $endTime = $validated['end_time'];

            // Check class overlap
            $classConflict = DB::table('schedules')
                ->where('day_name', $dayName)
                ->where('class_id', $classId)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->exists();

            if ($classConflict) {
                return $this->sendError('Jadwal bentrok: Kelas ini sudah memiliki jadwal lain pada jam tersebut.', [], 422);
            }

            // Check teacher overlap
            $teacherConflict = DB::table('schedules')
                ->where('day_name', $dayName)
                ->where('teacher_id', $teacherId)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->exists();

            if ($teacherConflict) {
                return $this->sendError('Jadwal bentrok: Guru ini sudah memiliki jadwal mengajar lain pada jam tersebut.', [], 422);
            }

            $activePeriod = DB::table('academic_periods')->where('is_active', true)->first();
            $validated['academic_period_id'] = $activePeriod ? $activePeriod->id : null;

            $now = now()->toDateTimeString();
            $validated['created_at'] = $now;
            $validated['updated_at'] = $now;

            $id = DB::table('schedules')->insertGetId($validated);

            return $this->show($id);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Failed to create schedule: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified schedule
     */
    public function show($id)
    {
        try {
            $sch = DB::table('schedules')
                ->leftJoin('subjects', 'schedules.subject_id', '=', 'subjects.id')
                ->leftJoin('classes', 'schedules.class_id', '=', 'classes.id')
                ->leftJoin('teachers', 'schedules.teacher_id', '=', 'teachers.id')
                ->where('schedules.id', $id)
                ->select([
                    'schedules.*',
                    'subjects.subject_name', 'subjects.subject_code', 'subjects.description as subject_description',
                    'classes.class_name', 'classes.major_id as class_major_id', 'classes.academic_period_id as class_academic_period_id',
                    'teachers.user_id as teacher_user_id', 'teachers.full_name as teacher_full_name', 'teachers.nip as teacher_nip'
                ])
                ->first();

            if (!$sch) {
                return $this->sendError('Jadwal tidak ditemukan.', [], 404);
            }

            $formatted = [
                'id' => $sch->id,
                'class_id' => $sch->class_id,
                'teacher_id' => $sch->teacher_id,
                'subject_id' => $sch->subject_id,
                'academic_period_id' => $sch->academic_period_id,
                'day_name' => $sch->day_name,
                'start_time' => $sch->start_time,
                'end_time' => $sch->end_time,
                'room' => $sch->room,
                'created_at' => $sch->created_at,
                'updated_at' => $sch->updated_at,
                'subject' => $sch->subject_id ? [
                    'id' => $sch->subject_id,
                    'subject_name' => $sch->subject_name,
                    'subject_code' => $sch->subject_code,
                    'description' => $sch->subject_description,
                ] : null,
                'class' => $sch->class_id ? [
                    'id' => $sch->class_id,
                    'class_name' => $sch->class_name,
                    'major_id' => $sch->class_major_id,
                    'academic_period_id' => $sch->class_academic_period_id,
                ] : null,
                'teacher' => $sch->teacher_id ? [
                    'id' => $sch->teacher_id,
                    'user_id' => $sch->teacher_user_id,
                    'full_name' => $sch->teacher_full_name,
                    'nip' => $sch->teacher_nip,
                ] : null,
            ];

            return $this->sendResponse($formatted, 'Jadwal pelajaran berhasil diambil.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve schedule: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified schedule
     */
    public function update(Request $request, $id)
    {
        try {
            $current = DB::table('schedules')->where('id', $id)->first();
            if (!$current) {
                return $this->sendError('Jadwal tidak ditemukan.', [], 404);
            }

            $validated = $request->validate([
                'subject_id' => 'sometimes|required|exists:subjects,id',
                'class_id' => 'sometimes|required|exists:classes,id',
                'teacher_id' => 'sometimes|required|exists:teachers,id',
                'day_name' => 'sometimes|required|string|max:20',
                'start_time' => 'sometimes|required|date_format:H:i',
                'end_time' => 'sometimes|required|date_format:H:i|after:start_time',
                'room' => 'nullable|string|max:100',
            ]);

            $classId = $validated['class_id'] ?? $current->class_id;
            $teacherId = $validated['teacher_id'] ?? $current->teacher_id;
            $dayName = $validated['day_name'] ?? $current->day_name;
            $startTime = $validated['start_time'] ?? $current->start_time;
            $endTime = $validated['end_time'] ?? $current->end_time;

            // Check class overlap
            $classConflict = DB::table('schedules')
                ->where('day_name', $dayName)
                ->where('class_id', $classId)
                ->where('id', '!=', $id)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->exists();

            if ($classConflict) {
                return $this->sendError('Jadwal bentrok: Kelas ini sudah memiliki jadwal lain pada jam tersebut.', [], 422);
            }

            // Check teacher overlap
            $teacherConflict = DB::table('schedules')
                ->where('day_name', $dayName)
                ->where('teacher_id', $teacherId)
                ->where('id', '!=', $id)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->exists();

            if ($teacherConflict) {
                return $this->sendError('Jadwal bentrok: Guru ini sudah memiliki jadwal mengajar lain pada jam tersebut.', [], 422);
            }

            $validated['updated_at'] = now()->toDateTimeString();

            DB::table('schedules')->where('id', $id)->update($validated);

            return $this->show($id);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Failed to update schedule: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified schedule
     */
    public function destroy($id)
    {
        try {
            $deleted = DB::table('schedules')->where('id', $id)->delete();
            if (!$deleted) {
                return $this->sendError('Jadwal tidak ditemukan.', [], 404);
            }
            return $this->sendResponse(null, 'Jadwal berhasil dihapus.');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete schedule: ' . $e->getMessage());
        }
    }
}