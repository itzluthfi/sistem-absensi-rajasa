<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    use HasFactory, Auditable;

    protected $table = 'classes';
    protected $fillable = ['major_id', 'homeroom_teacher_id', 'academic_period_id', 'class_name', 'academic_year'];

    public function major()
    {
        return $this->belongsTo(Major::class);
    }

    public function homeroomTeacher()
    {
        return $this->belongsTo(Teacher::class, 'homeroom_teacher_id');
    }

    public function academicPeriod()
    {
        return $this->belongsTo(AcademicPeriod::class, 'academic_period_id');
    }

    public function students()
    {
        return $this->hasMany(Student::class, 'class_id');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}