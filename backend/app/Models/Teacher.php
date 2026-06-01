<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['user_id', 'nip', 'full_name', 'gender', 'phone', 'address', 'photo'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classes()
    {
        return $this->hasMany(SchoolClass::class, 'homeroom_teacher_id');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}