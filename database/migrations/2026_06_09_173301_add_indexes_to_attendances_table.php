<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['student_id', 'date', 'status']);
            $table->index(['class_id', 'date', 'status']);
            $table->index(['schedule_id', 'date', 'status']);
            $table->index(['attendance_session_id', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'date', 'status']);
            $table->dropIndex(['class_id', 'date', 'status']);
            $table->dropIndex(['schedule_id', 'date', 'status']);
            $table->dropIndex(['attendance_session_id', 'student_id']);
        });
    }
};
