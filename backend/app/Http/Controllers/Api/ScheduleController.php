<?php

namespace App\Http\Controllers\Api;

use App\Models\Schedule;
use Illuminate\Http\Request;

class ScheduleController extends BaseController
{
    /**
     * Get schedules for today (Jadwal Mengajar Guru / Jadwal Pelajaran Siswa Hari Ini)
     */
    public function today(Request $request)
    {
        try {
            $user = $request->user();
            $todayEnglish = now()->format('l'); // e.g. 'Monday', 'Tuesday'
            $today = now()->toDateString();
            
            $query = Schedule::with(['subject', 'class', 'teacher'])
                ->where('day_name', $todayEnglish);

            // Apply role-based filters
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('class_id', $user->student->class_id);
            } elseif ($user->hasRole('guru') && $user->teacher) {
                $query->where('teacher_id', $user->teacher->id);
            } else {
                if ($request->has('class_id')) {
                    $query->where('class_id', $request->class_id);
                }
                if ($request->has('teacher_id')) {
                    $query->where('teacher_id', $request->teacher_id);
                }
            }

            $schedules = $query->orderBy('start_time')->get();

            // Map each schedule to see if it has an active attendance session today,
            // and see if the student has already checked in!
            $schedules->each(function ($sch) use ($today, $user) {
                $activeSession = \App\Models\AttendanceSession::where('schedule_id', $sch->id)
                    ->where('attendance_date', $today)
                    ->where('is_active', true)
                    ->first();
                
                $sch->active_session = $activeSession;
                
                // If student, check if they have checked in for this session or schedule today
                if ($user->hasRole('siswa') && $user->student) {
                    $attendance = \App\Models\Attendance::where('student_id', $user->student->id)
                        ->where('date', $today)
                        ->where(function ($q) use ($activeSession, $sch) {
                            if ($activeSession) {
                                $q->where('attendance_session_id', $activeSession->id);
                            } else {
                                $q->where('schedule_id', $sch->id);
                            }
                        })
                        ->first();
                    
                    $sch->attendance_status = $attendance ? $attendance->status : 'belum_absen';
                    $sch->attendance_time = $attendance ? $attendance->time->format('H:i') : null;
                }
            });

            return $this->sendResponse($schedules, 'Jadwal hari ini berhasil diambil.');
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
            $dayOfWeek = $request->input('day_of_week');
            $classId = $request->input('class_id');
            $teacherId = $request->input('teacher_id');
            $academicPeriodId = $request->input('academic_period_id');

            $query = Schedule::with(['subject', 'class', 'teacher']);

            if ($dayOfWeek) {
                $query->where('day_of_week', $dayOfWeek);
            }

            if ($classId) {
                $query->where('class_id', $classId);
            }

            if ($teacherId) {
                $query->where('teacher_id', $teacherId);
            }

            if ($academicPeriodId) {
                $query->where('academic_period_id', $academicPeriodId);
            }

            $query->orderBy('day_of_week')->orderBy('start_time');

            $schedules = $query->paginate($perPage);

            return $this->sendResponse($schedules, 'Schedules retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve schedules');
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
                'class_id' => 'required|exists:school_classes,id',
                'teacher_id' => 'required|exists:teachers,id',
                'day_of_week' => 'required|integer|between:1,7',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'room' => 'nullable|string|max:100',
            ]);

            $schedule = Schedule::create($validated);

            return $this->sendResponse($schedule->load(['subject', 'class', 'teacher']), 'Schedule created successfully', 201);
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
            $schedule = Schedule::with(['subject', 'class', 'teacher'])->findOrFail($id);
            return $this->sendResponse($schedule, 'Schedule retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Schedule not found', [], 404);
        }
    }

    /**
     * Update the specified schedule
     */
    public function update(Request $request, $id)
    {
        try {
            $schedule = Schedule::findOrFail($id);

            $validated = $request->validate([
                'subject_id' => 'sometimes|required|exists:subjects,id',
                'class_id' => 'sometimes|required|exists:school_classes,id',
                'teacher_id' => 'sometimes|required|exists:teachers,id',
                'day_of_week' => 'sometimes|required|integer|between:1,7',
                'start_time' => 'sometimes|required|date_format:H:i',
                'end_time' => 'sometimes|required|date_format:H:i|after:start_time',
                'room' => 'nullable|string|max:100',
            ]);

            $schedule->update($validated);

            return $this->sendResponse($schedule->load(['subject', 'class', 'teacher']), 'Schedule updated successfully');
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
            $schedule = Schedule::findOrFail($id);
            $schedule->delete();

            return $this->sendResponse(null, 'Schedule deleted successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete schedule');
        }
    }
}