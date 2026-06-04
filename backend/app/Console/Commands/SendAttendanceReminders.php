<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Models\User;
use App\Notifications\GenericNotification;

class SendAttendanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-attendance-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send morning attendance reminder notification to students who have not checked in yet';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $todayEnglish = now()->format('l');
        if ($todayEnglish === 'Sunday') {
            $this->info('Today is Sunday. Skipping reminders.');
            return;
        }

        $today = now()->toDateString();
        
        // Find students who do not have a daily check-in (schedule_id is null) for today
        $students = DB::table('students')
            ->leftJoin('attendances', function ($join) use ($today) {
                $join->on('students.id', '=', 'attendances.student_id')
                    ->where('attendances.date', '=', $today)
                    ->whereNull('attendances.schedule_id')
                    ->where('attendances.status', '!=', 'ditolak');
            })
            ->whereNull('attendances.id')
            ->select('students.user_id', 'students.full_name')
            ->get();

        $userIds = $students->pluck('user_id')->filter()->toArray();

        if (empty($userIds)) {
            $this->info('All students have already checked in today.');
            return;
        }

        $this->info('Sending morning check-in reminders to ' . count($userIds) . ' students...');

        // Chunk process sending to avoid memory overflow for large user sets
        User::whereIn('id', $userIds)->chunk(100, function ($users) {
            Notification::send(
                $users,
                new GenericNotification('Peringatan: Anda terdeteksi belum melakukan absen masuk sekolah hari ini. Silakan segera absen masuk via Petugas Piket atau Klik Mandiri!')
            );
        });

        $this->info('Reminders sent successfully.');
    }
}
