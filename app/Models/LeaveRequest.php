<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'permission_type', 'start_date', 'end_date', 'reason', 'attachment', 'approval_status', 'approved_by', 'approved_at'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
