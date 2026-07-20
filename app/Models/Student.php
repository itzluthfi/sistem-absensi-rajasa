<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['user_id', 'class_id', 'nisn', 'nis', 'full_name', 'gender', 'birth_place', 'birth_date', 'address', 'parent_name', 'parent_phone', 'photo', 'qr_code', 'status', 'device_uuid'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}