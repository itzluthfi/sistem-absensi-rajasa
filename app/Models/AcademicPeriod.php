<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicPeriod extends Model
{
    protected $fillable = [
        'name',
        'academic_year',
        'semester',
        'is_active',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'academic_period_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'academic_period_id');
    }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class, 'academic_period_id');
    }
}
