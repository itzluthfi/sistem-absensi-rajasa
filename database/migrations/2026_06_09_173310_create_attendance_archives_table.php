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
        Schema::create('attendance_archives', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attendance_session_id')->nullable();
            $table->unsignedBigInteger('schedule_id')->nullable();
            $table->unsignedBigInteger('student_id')->nullable();
            $table->unsignedBigInteger('class_id')->nullable();
            $table->date('date');
            $table->time('time');
            $table->string('status', 20); // Using standard string to avoid future enum limitations in archive table
            $table->integer('late_minutes')->default(0);
            $table->time('checkout_time')->nullable();
            $table->json('location')->nullable();
            $table->text('device_info')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            // Indexing archives for queries
            $table->index(['student_id', 'date']);
            $table->index(['class_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_archives');
    }
};
