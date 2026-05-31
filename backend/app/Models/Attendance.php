<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory, Auditable;

    protected $fillable = [
        'attendance_session_id', 
        'schedule_id', 
        'student_id', 
        'class_id', 
        'date', 
        'time', 
        'status', 
        'late_minutes', 
        'checkout_time',
        'location', 
        'device_info', 
        'notes'
    ];

    protected $casts = [
        'location' => 'array',
        'date' => 'date',
        'time' => 'datetime:H:i:s',
        'checkout_time' => 'datetime:H:i:s',
        'late_minutes' => 'integer',
    ];

    // Status constants
    const STATUS_HADIR = 'hadir';
    const STATUS_TELAT = 'telat';
    const STATUS_IZIN = 'izin';
    const STATUS_SAKIT = 'sakit';
    const STATUS_ALPHA = 'alpha';

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function attendanceSession()
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }
}