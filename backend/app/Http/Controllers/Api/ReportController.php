<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\DB;
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
 
            $studentId = null;
            if ($user->hasRole('siswa')) {
                $student = DB::table('students')->where('user_id', $user->id)->first();
                if ($student) {
                    $studentId = $student->id;
                }
            }
 
            $query = DB::table('attendances as a')
                ->leftJoin('students as s', 'a.student_id', '=', 's.id')
                ->leftJoin('classes as c', 'a.class_id', '=', 'c.id')
                ->select(
                    'a.date',
                    'a.time',
                    'a.status',
                    's.full_name as student_full_name',
                    's.nis as student_nis',
                    'c.class_name as class_name'
                );
 
            if ($request->start_date) {
                $query->where('a.date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('a.date', '<=', $request->end_date);
            }
            if ($request->class_id) {
                $query->where('a.class_id', $request->class_id);
            }
            if ($studentId) {
                $query->where('a.student_id', $studentId);
            }
 
            $rows = $query->orderBy('a.date', 'desc')->get();
 
            // Audit log
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported attendance CSV (count: {$rows->count()})",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode([
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_records' => $rows->count(),
                    'format' => 'CSV',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
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
                    $r->student_full_name ?? '-',
                    $r->student_nis ?? '-',
                    $r->class_name ?? '-',
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
 
            $studentId = null;
            if ($user->hasRole('siswa')) {
                $student = DB::table('students')->where('user_id', $user->id)->first();
                if ($student) {
                    $studentId = $student->id;
                }
            }
 
            $query = DB::table('attendances as a')
                ->leftJoin('students as s', 'a.student_id', '=', 's.id')
                ->leftJoin('classes as c', 'a.class_id', '=', 'c.id')
                ->select(
                    'a.id',
                    'a.date',
                    'a.time',
                    'a.status',
                    'a.late_minutes',
                    'a.notes',
                    's.full_name as student_full_name',
                    's.nis as student_nis',
                    's.nisn as student_nisn',
                    'c.class_name as class_name'
                );
 
            if ($request->start_date) {
                $query->where('a.date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('a.date', '<=', $request->end_date);
            }
            if ($request->class_id) {
                $query->where('a.class_id', $request->class_id);
            }
            if ($studentId) {
                $query->where('a.student_id', $studentId);
            }
 
            $rawRows = $query->orderBy('a.date', 'desc')->get();
 
            // Transform rows to match nesting expected by the PDF blade view
            $rows = $rawRows->map(function ($r) {
                $mapped = new \stdClass();
                $mapped->id = $r->id;
                $mapped->date = $r->date;
                $mapped->time = $r->time;
                $mapped->status = $r->status;
                $mapped->late_minutes = $r->late_minutes;
                $mapped->notes = $r->notes;
 
                $mapped->student = new \stdClass();
                $mapped->student->full_name = $r->student_full_name;
                $mapped->student->nis = $r->student_nis;
                $mapped->student->nisn = $r->student_nisn;
 
                $mapped->class = new \stdClass();
                $mapped->class->class_name = $r->class_name;
 
                return $mapped;
            });
 
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
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported attendance PDF (count: {$rows->count()})",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode([
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_records' => $rows->count(),
                    'format' => 'PDF',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            $from = $request->start_date ?? '-';
            $to = $request->end_date ?? '-';
 
            $pdf = PDF::loadView('reports.attendance', compact('rows', 'from', 'to', 'stats'));
            $pdf->setPaper('A4', 'portrait');
 
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
 
            $query = DB::table('attendances');
 
            if ($request->start_date) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->end_date) {
                $query->where('date', '<=', $request->end_date);
            }
 
            // Role-based filtering
            if ($user->hasRole('siswa')) {
                $student = DB::table('students')->where('user_id', $user->id)->first();
                if ($student) {
                    $query->where('student_id', $student->id);
                }
            }
 
            // Execute a SINGLE query with conditional aggregation instead of 6 queries!
            $statsRaw = $query->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'telat' THEN 1 ELSE 0 END) as telat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'alpha' THEN 1 ELSE 0 END) as alpha
            ")->first();
 
            $stats = [
                'total' => (int) ($statsRaw->total ?? 0),
                'hadir' => (int) ($statsRaw->hadir ?? 0),
                'telat' => (int) ($statsRaw->telat ?? 0),
                'izin' => (int) ($statsRaw->izin ?? 0),
                'sakit' => (int) ($statsRaw->sakit ?? 0),
                'alpha' => (int) ($statsRaw->alpha ?? 0),
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

    /**
     * Helper to compute attendance percentages for a class.
     */
    private function computeClassPercentages(Request $request)
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'type' => 'required|in:daily,subject',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $classId = (int) $request->class_id;
        $type = $request->type;
        $subjectId = $request->has('subject_id') ? (int) $request->subject_id : null;

        $class = DB::table('classes')->where('id', $classId)->first();
        $className = $class ? $class->class_name : 'N/A';

        // Get all students in this class
        $students = DB::table('students')
            ->where('class_id', $classId)
            ->orderBy('full_name', 'asc')
            ->get();

        $rows = [];
        $subjectName = null;

        if ($type === 'daily') {
            // Daily check-in percentage:
            // Total school entry check-in days recorded for this class
            $totalDays = DB::table('attendances')
                ->where('class_id', $classId)
                ->whereNull('schedule_id')
                ->where('status', '!=', 'ditolak')
                ->distinct()
                ->count('date');

            if ($totalDays === 0) {
                $totalDays = 1; // avoid division by zero
            }

            foreach ($students as $student) {
                $presentCount = DB::table('attendances')
                    ->where('student_id', $student->id)
                    ->whereNull('schedule_id')
                    ->whereIn('status', ['hadir', 'telat'])
                    ->count();

                $percentage = round(($presentCount / $totalDays) * 100, 1);
                if ($percentage > 100) $percentage = 100.0;

                $rows[] = (object) [
                    'nisn' => $student->nisn,
                    'nis' => $student->nis,
                    'full_name' => $student->full_name,
                    'percentage' => $percentage,
                ];
            }
        } else {
            // Subject attendance sessions percentage:
            $sessionsQuery = DB::table('attendance_sessions as ats')
                ->join('schedules as sc', 'ats.schedule_id', '=', 'sc.id')
                ->where('sc.class_id', $classId);

            if ($subjectId) {
                $sessionsQuery->where('sc.subject_id', $subjectId);
                $subjectName = DB::table('subjects')->where('id', $subjectId)->value('subject_name');
            }

            $sessionIds = $sessionsQuery->pluck('ats.id')->toArray();
            $totalSessions = count($sessionIds);

            $hasSessions = $totalSessions > 0;
            $denominator = $hasSessions ? $totalSessions : 1;

            // Fetch attendances for all relevant sessionIds in one query to optimize
            $attendancesGrouped = collect();
            if ($hasSessions) {
                $attendancesGrouped = DB::table('attendances')
                    ->whereIn('attendance_session_id', $sessionIds)
                    ->whereIn('status', ['hadir', 'telat'])
                    ->get()
                    ->groupBy('student_id');
            }

            foreach ($students as $student) {
                $presentCount = isset($attendancesGrouped[$student->id]) ? count($attendancesGrouped[$student->id]) : 0;
                $percentage = $hasSessions ? round(($presentCount / $denominator) * 100, 1) : 100.0;
                
                $rows[] = (object) [
                    'nisn' => $student->nisn,
                    'nis' => $student->nis,
                    'full_name' => $student->full_name,
                    'percentage' => $percentage,
                ];
            }
        }

        return [
            'rows' => $rows,
            'class' => $class,
            'className' => $className,
            'reportType' => $type,
            'subjectName' => $subjectName,
        ];
    }

    /**
     * Export attendance percentage report to Excel
     */
    public function attendancePercentExcel(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user->hasRole(['super_admin', 'admin', 'guru'])) {
                return (new BaseController)->sendError('Akses ditolak. Anda tidak memiliki izin untuk melihat laporan.', [], 403);
            }

            $resData = $this->computeClassPercentages($request);
            $rows = $resData['rows'];
            $className = $resData['className'];

            // Format data for Excel
            $exportData = collect($rows)->map(function ($r) {
                return [
                    'NISN' => $r->nisn ?? '-',
                    'NIS' => $r->nis ?? '-',
                    'Nama Siswa' => $r->full_name,
                    'Persentase Kehadiran' => $r->percentage . '%',
                ];
            });

            // Log export action
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported class percentage Excel for class ID {$request->class_id}",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode(['class_id' => $request->class_id, 'format' => 'Excel']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $filename = 'rekap_kehadiran_' . str_replace(' ', '_', $className) . '_' . now()->format('Ymd_His') . '.xlsx';
            
            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\GenericExport($exportData, ['NISN', 'NIS', 'Nama Siswa', 'Persentase Kehadiran']),
                $filename
            );
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengunduh Excel: ' . $e->getMessage());
        }
    }

    /**
     * Export attendance percentage report to PDF
     */
    public function attendancePercentPdf(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user->hasRole(['super_admin', 'admin', 'guru'])) {
                return (new BaseController)->sendError('Akses ditolak. Anda tidak memiliki izin untuk melihat laporan.', [], 403);
            }

            $resData = $this->computeClassPercentages($request);
            $rows = $resData['rows'];
            $className = $resData['className'];
            $reportType = $resData['reportType'];
            $subjectName = $resData['subjectName'];

            // Log export action
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Exported class percentage PDF for class ID {$request->class_id}",
                'model_type' => Attendance::class,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => json_encode(['class_id' => $request->class_id, 'format' => 'PDF']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $pdf = PDF::loadView('reports.attendance-percentage', compact('rows', 'className', 'reportType', 'subjectName'));
            $pdf->setPaper('A4', 'portrait');

            return $pdf->download('rekap_kehadiran_' . str_replace(' ', '_', $className) . '_' . now()->format('Ymd_His') . '.pdf');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengunduh PDF: ' . $e->getMessage());
        }
    }
}