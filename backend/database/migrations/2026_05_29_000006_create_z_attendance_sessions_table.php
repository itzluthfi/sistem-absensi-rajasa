<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('schedules')->onDelete('cascade');
            $table->foreignId('academic_period_id')->nullable()->constrained('academic_periods')->onDelete('cascade');
            $table->string('qr_token')->unique();
            $table->date('attendance_date');
            $table->timestamp('open_time')->nullable();
            $table->timestamp('close_time')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
