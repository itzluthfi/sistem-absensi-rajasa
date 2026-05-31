<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $fillable = [
        'schedule_id',
        'academic_period_id',
        'qr_token',
        'attendance_date',
        'open_time',
        'close_time',
        'is_active',
        'require_qr',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'require_qr' => 'boolean',
        'attendance_date' => 'date',
        'open_time' => 'datetime',
        'close_time' => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }

    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class, 'academic_period_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'attendance_session_id');
    }
}
