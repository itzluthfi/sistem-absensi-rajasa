<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Major extends Model
{
    use HasFactory;

    protected $fillable = ['major_name', 'major_code'];

    public function classes()
    {
        return $this->hasMany(SchoolClass::class, 'major_id');
    }
}
