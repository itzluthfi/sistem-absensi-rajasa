<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['subject_name', 'subject_code', 'description'];

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}