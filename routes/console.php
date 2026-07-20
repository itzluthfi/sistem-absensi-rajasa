<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send morning check-in reminders at 07:15 WIB daily
Schedule::command('app:send-attendance-reminders')
    ->timezone('Asia/Jakarta')
    ->dailyAt('07:15');

// Archive old attendance records older than 6 months on the 1st of every month
Schedule::command('app:archive-attendances --older-than-months=6')
    ->timezone('Asia/Jakarta')
    ->monthly();
