<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:archive-attendances {--before-date= : Tanggal cut-off (YYYY-MM-DD)} {--older-than-months= : Batas usia record dalam bulan}')]
#[Description('Arsip data log kehadiran siswa yang sudah lama ke tabel attendance_archives')]
class ArchiveAttendances extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $beforeDate = $this->option('before-date');
        $olderThanMonths = $this->option('older-than-months');

        if ($beforeDate) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $beforeDate)) {
                $this->error('Format tanggal --before-date harus YYYY-MM-DD.');
                return 1;
            }
            $cutoffDate = $beforeDate;
        } elseif ($olderThanMonths !== null) {
            $months = intval($olderThanMonths);
            if ($months <= 0) {
                $this->error('Opsi --older-than-months harus berupa angka positif.');
                return 1;
            }
            $cutoffDate = now()->subMonths($months)->toDateString();
        } else {
            // Default: 6 months ago
            $cutoffDate = now()->subMonths(6)->toDateString();
        }

        $this->info("Memulai proses pengarsipan absensi sebelum tanggal: {$cutoffDate}");

        // Count total rows to process
        $totalToArchive = \DB::table('attendances')->where('date', '<', $cutoffDate)->count();

        if ($totalToArchive === 0) {
            $this->info('Tidak ada data kehadiran yang perlu diarsipkan.');
            return 0;
        }

        $this->info("Menemukan {$totalToArchive} baris data untuk diarsipkan.");

        $chunkSize = 500;
        $archivedCount = 0;

        $this->withProgressBar($totalToArchive, function ($progressBar) use ($cutoffDate, $chunkSize, &$archivedCount) {
            while (true) {
                // Fetch a chunk of records
                $records = \DB::table('attendances')
                    ->where('date', '<', $cutoffDate)
                    ->limit($chunkSize)
                    ->get();

                if ($records->isEmpty()) {
                    break;
                }

                \DB::transaction(function () use ($records) {
                    $insertData = [];
                    $idsToDelete = [];

                    foreach ($records as $record) {
                        $insertData[] = [
                            'attendance_session_id' => $record->attendance_session_id,
                            'schedule_id' => $record->schedule_id,
                            'student_id' => $record->student_id,
                            'class_id' => $record->class_id,
                            'date' => $record->date,
                            'time' => $record->time,
                            'status' => $record->status,
                            'late_minutes' => $record->late_minutes,
                            'checkout_time' => $record->checkout_time,
                            'location' => $record->location,
                            'device_info' => $record->device_info,
                            'notes' => $record->notes,
                            'recorded_by' => $record->recorded_by,
                            'created_at' => $record->created_at,
                            'updated_at' => $record->updated_at,
                        ];
                        $idsToDelete[] = $record->id;
                    }

                    // Insert to archives
                    \DB::table('attendance_archives')->insert($insertData);

                    // Delete from active attendances
                    \DB::table('attendances')->whereIn('id', $idsToDelete)->delete();
                });

                $count = $records->count();
                $archivedCount += $count;
                $progressBar->advance($count);
            }
        });

        $this->newLine();
        $this->info("Proses selesai. Berhasil mengarsipkan {$archivedCount} data kehadiran ke tabel attendance_archives.");

        return 0;
    }
}
