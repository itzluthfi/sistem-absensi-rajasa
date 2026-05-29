<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['class_id', 'teacher_id', 'subject_id', 'academic_period_id', 'day_name', 'start_time', 'end_time'];

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function academicPeriod()
    {
        return $this->belongsTo(AcademicPeriod::class, 'academic_period_id');
    }
}