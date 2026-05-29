<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;
use PDF;

class ReportController extends Controller
{
    /**
     * Generate attendance CSV report
     */
    public function attendanceCsv(Request $request)
    {
        try {
            $user = $request->user();

            $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'class_id' => 'nullable|exists:classes,id',
            ]);

            $query = Attendance::with(['student:id,full_name', 'class:id,class_name']);

            if ($request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }
            if ($request->class_id) {
                $query->where('class_id', $request->class_id);
            }

            // Role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('student_id', $user->student->id);
            }

            $rows = $query->orderBy('date', 'desc')->get();

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported attendance CSV (count: {$rows->count()})",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => [
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_records' => $rows->count(),
                    'format' => 'CSV',
                ],
            ]);

            $filename = 'laporan_absensi_' . now()->format('Ymd_His') . '.csv';
            $handle = fopen('php://temp', 'r+');

            // CSV Header
            fputcsv($handle, ['No', 'Tanggal', 'Waktu', 'Nama Siswa', 'NIS', 'Kelas', 'Status']);

            $no = 1;
            foreach ($rows as $r) {
                fputcsv($handle, [
                    $no++,
                    $r->date,
                    $r->time,
                    optional($r->student)->full_name ?? '-',
                    optional($r->student)->nis ?? '-',
                    optional($r->class)->class_name ?? '-',
                    $r->status,
                ]);
            }

            rewind($handle);
            $contents = stream_get_contents($handle);
            fclose($handle);

            return Response::make($contents, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"$filename\"",
            ]);
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat laporan CSV.');
        }
    }

    /**
     * Generate attendance PDF report
     */
    public function attendancePdf(Request $request)
    {
        try {
            $user = $request->user();

            $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'class_id' => 'nullable|exists:classes,id',
            ]);

            $query = Attendance::with(['student:id,full_name,nis', 'class:id,class_name']);

            if ($request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }
            if ($request->class_id) {
                $query->where('class_id', $request->class_id);
            }

            // Role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('student_id', $user->student->id);
            }

            $rows = $query->orderBy('date', 'desc')->get();

            // Calculate statistics
            $stats = [
                'total' => $rows->count(),
                'hadir' => $rows->where('status', 'hadir')->count(),
                'telat' => $rows->where('status', 'telat')->count(),
                'izin' => $rows->where('status', 'izin')->count(),
                'sakit' => $rows->where('status', 'sakit')->count(),
                'alpha' => $rows->where('status', 'alpha')->count(),
            ];

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported attendance PDF (count: {$rows->count()})",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => [
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_records' => $rows->count(),
                    'format' => 'PDF',
                ],
            ]);

            $from = $request->start_date ?? '-';
            $to = $request->end_date ?? '-';

            $pdf = PDF::loadView('reports.attendance', compact('rows', 'from', 'to', 'stats'));
            $pdf->setPaper('A4', 'landscape');

            return $pdf->download('laporan_absensi_' . now()->format('Ymd_His') . '.pdf');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat laporan PDF.');
        }
    }

    /**
     * Get attendance summary statistics
     */
    public function attendanceSummary(Request $request)
    {
        try {
            $user = $request->user();

            $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
            ]);

            $query = Attendance::query();

            if ($request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }

            // Role-based filtering
            if ($user->hasRole('siswa') && $user->student) {
                $query->where('student_id', $user->student->id);
            }

            $stats = [
                'total' => $query->count(),
                'hadir' => (clone $query)->where('status', 'hadir')->count(),
                'telat' => (clone $query)->where('status', 'telat')->count(),
                'izin' => (clone $query)->where('status', 'izin')->count(),
                'sakit' => (clone $query)->where('status', 'sakit')->count(),
                'alpha' => (clone $query)->where('status', 'alpha')->count(),
            ];

            // Calculate percentages
            $total = $stats['total'];
            $stats['percentages'] = [
                'hadir' => $total > 0 ? round(($stats['hadir'] / $total) * 100, 1) : 0,
                'telat' => $total > 0 ? round(($stats['telat'] / $total) * 100, 1) : 0,
                'izin' => $total > 0 ? round(($stats['izin'] / $total) * 100, 1) : 0,
                'sakit' => $total > 0 ? round(($stats['sakit'] / $total) * 100, 1) : 0,
                'alpha' => $total > 0 ? round(($stats['alpha'] / $total) * 100, 1) : 0,
            ];

            return (new BaseController)->sendResponse($stats, 'Ringkasan absensi');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengambil ringkasan.');
        }
    }
}