<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Exports\GenericExport;
use App\Imports\GenericImport;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\SchoolClass;
use App\Models\Schedule;
use App\Models\AcademicPeriod;
use App\Models\User;
use App\Models\Major;
use App\Models\Subject;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;

class ImportExportController extends BaseController
{
    /**
     * Get dynamic config based on entity type
     */
    private function getConfig($type)
    {
        switch ($type) {
            case 'students':
                return [
                    'model' => Student::class,
                    'headings' => [
                        'ID', 'Class ID', 'NIS', 'NISN', 'Nama Lengkap', 'Email', 
                        'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 
                        'Nama Orang Tua', 'No HP Orang Tua', 'Status'
                    ],
                    'template_headings' => [
                        'Class ID', 'NIS', 'NISN', 'Nama Lengkap', 'Email', 
                        'Jenis Kelamin (L/P)', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 
                        'Alamat', 'Nama Orang Tua', 'No HP Orang Tua'
                    ]
                ];
            case 'teachers':
                return [
                    'model' => Teacher::class,
                    'headings' => [
                        'ID', 'NIP', 'Nama Lengkap', 'Email', 'Jenis Kelamin', 'No HP', 'Alamat'
                    ],
                    'template_headings' => [
                        'NIP', 'Nama Lengkap', 'Email', 'Jenis Kelamin (L/P)', 'No HP', 'Alamat'
                    ]
                ];
            case 'classes':
                return [
                    'model' => SchoolClass::class,
                    'headings' => [
                        'ID', 'Major ID', 'Nama Kelas', 'Tahun Ajaran', 'Homeroom Teacher ID', 'Academic Period ID'
                    ],
                    'template_headings' => [
                        'Major ID', 'Nama Kelas', 'Tahun Ajaran (e.g. 2025/2026)', 'Homeroom Teacher ID', 'Academic Period ID'
                    ]
                ];
            case 'schedules':
                return [
                    'model' => Schedule::class,
                    'headings' => [
                        'ID', 'Subject ID', 'Class ID', 'Teacher ID', 'Academic Period ID', 'Hari Ke (1-7)', 'Jam Mulai', 'Jam Selesai', 'Ruangan'
                    ],
                    'template_headings' => [
                        'Subject ID', 'Class ID', 'Teacher ID', 'Academic Period ID', 'Hari Ke (1 = Senin, 2 = Selasa, dst)', 'Jam Mulai (HH:MM)', 'Jam Selesai (HH:MM)', 'Ruangan'
                    ]
                ];
            case 'academic-periods':
                return [
                    'model' => AcademicPeriod::class,
                    'headings' => [
                        'ID', 'Nama Periode', 'Tahun Ajaran', 'Semester', 'Tanggal Mulai', 'Tanggal Selesai', 'Status Aktif (1/0)'
                    ],
                    'template_headings' => [
                        'Nama Periode', 'Tahun Ajaran (e.g. 2025/2026)', 'Semester (ganjil/genap)', 'Tanggal Mulai (YYYY-MM-DD)', 'Tanggal Selesai (YYYY-MM-DD)', 'Status Aktif (1/0)'
                    ]
                ];
            default:
                return null;
        }
    }

    /**
     * Export master data to Excel
     */
    public function export(Request $request, $type)
    {
        try {
            $config = $this->getConfig($type);
            if (!$config) {
                return $this->sendError('Tipe data ekspor tidak valid.', [], 404);
            }

            $user = $request->user();
            $query = $config['model']::query();

            // Perform specific mapping based on type
            $data = collect();
            if ($type === 'students') {
                $rows = $query->with(['class', 'user'])->get();
                foreach ($rows as $r) {
                    $data->push([
                        $r->id, $r->class_id, $r->nis, $r->nisn, $r->full_name, $r->user?->email,
                        $r->gender === 'female' ? 'P' : ($r->gender === 'male' ? 'L' : ''), 
                        $r->birth_place, $r->birth_date ? $r->birth_date->format('Y-m-d') : '',
                        $r->address, $r->parent_name, $r->parent_phone, $r->status
                    ]);
                }
            } else if ($type === 'teachers') {
                $rows = $query->with(['user'])->get();
                foreach ($rows as $r) {
                    $data->push([
                        $r->id, $r->nip, $r->full_name, $r->user?->email,
                        $r->gender === 'female' ? 'P' : ($r->gender === 'male' ? 'L' : ''), 
                        $r->phone, $r->address
                    ]);
                }
            } else if ($type === 'classes') {
                $rows = $query->get();
                foreach ($rows as $r) {
                    $data->push([
                        $r->id, $r->major_id, $r->class_name, $r->academic_year, $r->homeroom_teacher_id, $r->academic_period_id
                    ]);
                }
            } else if ($type === 'schedules') {
                $rows = $query->get();
                foreach ($rows as $r) {
                    $data->push([
                        $r->id, $r->subject_id, $r->class_id, $r->teacher_id, $r->academic_period_id,
                        $r->day_of_week, $r->start_time, $r->end_time, $r->room
                    ]);
                }
            } else if ($type === 'academic-periods') {
                $rows = $query->get();
                foreach ($rows as $r) {
                    $data->push([
                        $r->id, $r->name, $r->academic_year, $r->semester,
                        $r->start_date ? $r->start_date->format('Y-m-d') : '',
                        $r->end_date ? $r->end_date->format('Y-m-d') : '',
                        $r->is_active ? 1 : 0
                    ]);
                }
            }

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_EXPORT,
                'description' => "Mengekspor Master Data {$type} (jumlah: {$data->count()})",
                'model_type' => $config['model'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            $filename = "ekspor_{$type}_" . now()->format('Ymd_His') . '.xlsx';
            return Excel::download(new GenericExport($data, $config['headings']), $filename);
        } catch (\Exception $e) {
            return $this->sendError('Gagal melakukan ekspor data: ' . $e->getMessage());
        }
    }

    /**
     * Download Excel Import Template
     */
    public function template(Request $request, $type)
    {
        try {
            $config = $this->getConfig($type);
            if (!$config) {
                return $this->sendError('Tipe data templat tidak valid.', [], 404);
            }

            // Fill one sample row to help guide the user
            $sampleRow = [];
            if ($type === 'students') {
                $sampleRow = [1, '12345', '0098765432', 'Budi Santoso', 'budi@example.com', 'L', 'Surabaya', '2010-08-15', 'Jl. Dharmahusada No. 12', 'Slamet Santoso', '08123456789'];
            } else if ($type === 'teachers') {
                $sampleRow = ['198705122010121002', 'Drs. Hermawan', 'hermawan@example.com', 'L', '08122334455', 'Jl. Gubeng Kertajaya V/10'];
            } else if ($type === 'classes') {
                $sampleRow = [1, 'X-RPL-1', '2025/2026', 1, 1];
            } else if ($type === 'schedules') {
                $sampleRow = [1, 1, 1, 1, 1, '07:00', '08:30', 'R. LAB RPL 1'];
            } else if ($type === 'academic-periods') {
                $sampleRow = ['Semester Ganjil 2025/2026', '2025/2026', 'ganjil', '2025-07-15', '2025-12-20', 1];
            }

            $data = collect([$sampleRow]);
            $filename = "templat_impor_{$type}.xlsx";

            return Excel::download(new GenericExport($data, $config['template_headings']), $filename);
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat templat impor: ' . $e->getMessage());
        }
    }

    /**
     * Import master data from uploaded Excel
     */
    public function import(Request $request, $type)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240'
        ]);

        $config = $this->getConfig($type);
        if (!$config) {
            return $this->sendError('Tipe data impor tidak valid.', [], 404);
        }

        try {
            $file = $request->file('file');
            $rawRows = Excel::toArray(new GenericImport, $file);
            
            if (empty($rawRows) || empty($rawRows[0])) {
                return $this->sendError('Berkas Excel kosong atau tidak terbaca.');
            }

            $rows = $rawRows[0];
            $headings = array_shift($rows); // Remove header row

            $importCount = 0;
            $errors = [];
            $line = 2; // Rows in Excel are 1-indexed, headers are row 1, data starts at row 2

            DB::beginTransaction();

            foreach ($rows as $row) {
                // Skip completely empty rows
                if (empty(array_filter($row, function($val) { return $val !== null && $val !== ''; }))) {
                    $line++;
                    continue;
                }

                if ($type === 'students') {
                    if (count($row) < 4) {
                        $errors[] = "Baris {$line}: Kolom data kurang lengkap.";
                        $line++;
                        continue;
                    }

                    $class_id = $row[0] ? (int)$row[0] : null;
                    $nis = $row[1] ? trim((string)$row[1]) : null;
                    $nisn = $row[2] ? trim((string)$row[2]) : null;
                    $full_name = $row[3] ? trim((string)$row[3]) : '';
                    $email = isset($row[4]) ? trim((string)$row[4]) : null;
                    $genderRaw = isset($row[5]) ? trim(strtoupper((string)$row[5])) : 'L';
                    $birth_place = isset($row[6]) ? trim((string)$row[6]) : null;
                    $birth_date = isset($row[7]) ? $row[7] : null;
                    $address = isset($row[8]) ? trim((string)$row[8]) : null;
                    $parent_name = isset($row[9]) ? trim((string)$row[9]) : null;
                    $parent_phone = isset($row[10]) ? (string)$row[10] : null;

                    // Generate default email if not provided
                    if (!$email) {
                        if (!$nis) {
                            $errors[] = "Baris {$line}: NIS wajib diisi jika email tidak ditentukan.";
                            $line++;
                            continue;
                        }
                        $email = $nis . '@siswa.smksrajasa.sch.id';
                    }

                    // Map gender
                    $gender = ($genderRaw === 'P' || $genderRaw === 'FEMALE') ? 'female' : 'male';

                    // Validate student fields
                    $validator = Validator::make([
                        'class_id' => $class_id,
                        'nis' => $nis,
                        'nisn' => $nisn,
                        'full_name' => $full_name,
                        'email' => $email,
                        'birth_date' => $birth_date
                    ], [
                        'class_id' => 'nullable|exists:classes,id',
                        'nis' => 'required|string|unique:students,nis',
                        'nisn' => 'nullable|string|unique:students,nisn',
                        'full_name' => 'required|string|max:255',
                        'email' => 'required|email',
                        'birth_date' => 'nullable|date_format:Y-m-d'
                    ]);

                    if ($validator->fails()) {
                        $errors[] = "Baris {$line} (Nama: " . ($full_name ?: 'Tanpa Nama') . "): " . implode(', ', $validator->errors()->all());
                        $line++;
                        continue;
                    }

                    // Check if user already exists
                    $user = User::where('email', $email)->first();
                    if (!$user) {
                        $password = $nis ? $nis : '12345678';
                        $user = User::create([
                            'name' => $full_name,
                            'email' => $email,
                            'password' => Hash::make($password),
                            'is_active' => true
                        ]);
                        $user->assignRole('siswa');
                    } else {
                        // Check if student user is already tied
                        if (Student::where('user_id', $user->id)->exists()) {
                            $errors[] = "Baris {$line}: User email '{$email}' sudah dikaitkan dengan siswa lain.";
                            $line++;
                            continue;
                        }
                    }

                    Student::create([
                        'user_id' => $user->id,
                        'class_id' => $class_id,
                        'nis' => $nis,
                        'nisn' => $nisn,
                        'full_name' => $full_name,
                        'gender' => $gender,
                        'birth_place' => $birth_place,
                        'birth_date' => $birth_date,
                        'address' => $address,
                        'parent_name' => $parent_name,
                        'parent_phone' => $parent_phone,
                        'status' => 'active'
                    ]);
                    $importCount++;

                } else if ($type === 'teachers') {
                    if (count($row) < 2) {
                        $errors[] = "Baris {$line}: Kolom data kurang lengkap.";
                        $line++;
                        continue;
                    }

                    $nip = $row[0] ? trim((string)$row[0]) : null;
                    $full_name = $row[1] ? trim((string)$row[1]) : '';
                    $email = isset($row[2]) ? trim((string)$row[2]) : null;
                    $genderRaw = isset($row[3]) ? trim(strtoupper((string)$row[3])) : 'L';
                    $phone = isset($row[4]) ? (string)$row[4] : null;
                    $address = isset($row[5]) ? trim((string)$row[5]) : null;

                    // Generate default email if not provided
                    if (!$email) {
                        if (!$nip) {
                            $errors[] = "Baris {$line}: NIP wajib diisi jika email tidak ditentukan.";
                            $line++;
                            continue;
                        }
                        $email = $nip . '@guru.smksrajasa.sch.id';
                    }

                    // Map gender
                    $gender = ($genderRaw === 'P' || $genderRaw === 'FEMALE') ? 'female' : 'male';

                    // Validate teacher fields
                    $validator = Validator::make([
                        'nip' => $nip,
                        'full_name' => $full_name,
                        'email' => $email
                    ], [
                        'nip' => 'nullable|string|unique:teachers,nip',
                        'full_name' => 'required|string|max:255',
                        'email' => 'required|email'
                    ]);

                    if ($validator->fails()) {
                        $errors[] = "Baris {$line} (Nama: " . ($full_name ?: 'Tanpa Nama') . "): " . implode(', ', $validator->errors()->all());
                        $line++;
                        continue;
                    }

                    // Check if user already exists
                    $user = User::where('email', $email)->first();
                    if (!$user) {
                        $password = $nip ? $nip : '12345678';
                        $user = User::create([
                            'name' => $full_name,
                            'email' => $email,
                            'password' => Hash::make($password),
                            'is_active' => true
                        ]);
                        $user->assignRole('guru');
                    } else {
                        // Check if teacher user is already tied
                        if (Teacher::where('user_id', $user->id)->exists()) {
                            $errors[] = "Baris {$line}: User email '{$email}' sudah dikaitkan dengan guru lain.";
                            $line++;
                            continue;
                        }
                    }

                    Teacher::create([
                        'user_id' => $user->id,
                        'nip' => $nip,
                        'full_name' => $full_name,
                        'gender' => $gender,
                        'phone' => $phone,
                        'address' => $address
                    ]);
                    $importCount++;

                } else if ($type === 'classes') {
                    $data = [
                        'major_id' => $row[0] ? (int)$row[0] : null,
                        'class_name' => $row[1] ? trim((string)$row[1]) : '',
                        'academic_year' => $row[2] ? trim((string)$row[2]) : '',
                        'homeroom_teacher_id' => $row[3] ? (int)$row[3] : null,
                        'academic_period_id' => $row[4] ? (int)$row[4] : null,
                    ];

                    $validator = Validator::make($data, [
                        'major_id' => 'required|exists:majors,id',
                        'class_name' => 'required|string|max:255',
                        'academic_year' => 'required|string',
                        'homeroom_teacher_id' => 'nullable|exists:teachers,id',
                        'academic_period_id' => 'nullable|exists:academic_periods,id'
                    ]);

                    if ($validator->fails()) {
                        $errors[] = "Baris {$line} (Kelas: " . ($data['class_name'] ?: 'Tanpa Nama') . "): " . implode(', ', $validator->errors()->all());
                        $line++;
                        continue;
                    }

                    SchoolClass::create($data);
                    $importCount++;

                } else if ($type === 'schedules') {
                    $data = [
                        'subject_id' => $row[0] ? (int)$row[0] : null,
                        'class_id' => $row[1] ? (int)$row[1] : null,
                        'teacher_id' => $row[2] ? (int)$row[2] : null,
                        'academic_period_id' => $row[3] ? (int)$row[3] : null,
                        'day_of_week' => $row[4] ? (int)$row[4] : null,
                        'start_time' => $row[5] ? trim((string)$row[5]) : null,
                        'end_time' => $row[6] ? trim((string)$row[6]) : null,
                        'room' => isset($row[7]) ? trim((string)$row[7]) : null,
                    ];

                    $validator = Validator::make($data, [
                        'subject_id' => 'required|exists:subjects,id',
                        'class_id' => 'required|exists:classes,id',
                        'teacher_id' => 'required|exists:teachers,id',
                        'academic_period_id' => 'required|exists:academic_periods,id',
                        'day_of_week' => 'required|integer|between:1,7',
                        'start_time' => 'required',
                        'end_time' => 'required',
                    ]);

                    if ($validator->fails()) {
                        $errors[] = "Baris {$line} (Mata Pelajaran ID: {$data['subject_id']}): " . implode(', ', $validator->errors()->all());
                        $line++;
                        continue;
                    }

                    Schedule::create($data);
                    $importCount++;

                } else if ($type === 'academic-periods') {
                    $data = [
                        'name' => $row[0] ? trim((string)$row[0]) : '',
                        'academic_year' => $row[1] ? trim((string)$row[1]) : '',
                        'semester' => $row[2] ? trim(strtolower((string)$row[2])) : 'ganjil',
                        'start_date' => $row[3] ? $row[3] : null,
                        'end_date' => $row[4] ? $row[4] : null,
                        'is_active' => isset($row[5]) ? (bool)$row[5] : false,
                    ];

                    $validator = Validator::make($data, [
                        'name' => 'required|string|max:255',
                        'academic_year' => 'required|string|max:50',
                        'semester' => 'required|in:ganjil,genap',
                        'start_date' => 'required|date_format:Y-m-d',
                        'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
                        'is_active' => 'required|boolean'
                    ]);

                    if ($validator->fails()) {
                        $errors[] = "Baris {$line} (Periode: " . ($data['name'] ?: 'Tanpa Nama') . "): " . implode(', ', $validator->errors()->all());
                        $line++;
                        continue;
                    }

                    // If active, deactivate other periods
                    if ($data['is_active']) {
                        AcademicPeriod::where('is_active', true)->update(['is_active' => false]);
                    }

                    AcademicPeriod::create($data);
                    $importCount++;
                }

                $line++;
            }

            if (!empty($errors)) {
                DB::rollBack();
                return $this->sendError('Gagal mengimpor berkas Excel karena beberapa baris tidak valid.', $errors, 422);
            }

            DB::commit();

            // Audit log
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Mengimpor Master Data {$type} (jumlah berhasil: {$importCount})",
                'model_type' => $config['model'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return $this->sendResponse(
                ['imported_count' => $importCount], 
                "Berhasil mengimpor {$importCount} data ke Master Data {$type}."
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal memproses unggahan Excel: ' . $e->getMessage());
        }
    }
}
