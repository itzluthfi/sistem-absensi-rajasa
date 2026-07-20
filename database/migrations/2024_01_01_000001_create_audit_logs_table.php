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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action', 50); // create, read, update, delete, login, logout, export, approve, reject
            $table->string('description', 500);
            $table->string('model_type', 255)->nullable(); // Polymorphic relation
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('ip_address', 45)->nullable(); // IPv6 support
            $table->text('user_agent')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();

            // Indexes for faster queries
            $table->index(['user_id', 'action']);
            $table->index(['model_type', 'model_id']);
            $table->index('created_at');
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};