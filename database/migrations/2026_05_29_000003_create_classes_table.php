<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('major_id')->constrained('majors')->onDelete('cascade');
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('teachers')->onDelete('set null');
            $table->foreignId('academic_period_id')->nullable()->constrained('academic_periods')->onDelete('set null');
            $table->string('class_name');
            $table->string('academic_year')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
