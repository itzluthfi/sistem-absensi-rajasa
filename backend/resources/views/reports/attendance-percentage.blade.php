<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rekap Persentase Absensi SMKS Rajasa</title>
    <style>
        @page {
            margin: 50px 45px 60px 45px;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            color: #000;
            line-height: 1.4;
        }
        .header-box {
            border: 2px solid #000;
            padding: 15px;
            text-align: center;
            margin-bottom: 10px;
        }
        .header-title-main {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .header-address {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .header-title-sub {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .header-academic-year {
            font-size: 11px;
        }
        .divider {
            border-top: 1.5px dotted #000;
            margin: 12px 0;
            height: 0;
            width: 100%;
        }
        .metadata {
            margin: 10px 0;
            font-size: 11px;
            line-height: 1.6;
        }
        .metadata p {
            margin-bottom: 4px;
        }
        .metadata strong {
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 10px;
            page-break-inside: auto;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th, td {
            border: 1.5px solid #000;
            padding: 8px 4px;
            vertical-align: middle;
        }
        th {
            font-weight: bold;
            text-transform: uppercase;
            background-color: transparent;
            color: #000;
            text-align: center;
        }
        td {
            color: #000;
        }
        .text-center {
            text-align: center;
        }
        .text-left {
            text-align: left;
        }
        .percentage-badge {
            font-weight: bold;
        }
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            border: none !important;
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-table td {
            border: none !important;
            text-align: center;
            font-size: 11px;
            line-height: 1.5;
            padding: 0 20px;
        }
        .footer-page-number {
            position: fixed;
            bottom: -35px;
            left: 0;
            right: 0;
            height: 20px;
            text-align: center;
            font-size: 9px;
            color: #555;
        }
        .footer-page-number::after {
            content: "Halaman " counter(page) " dari " counter(pages);
        }
    </style>
</head>
<body>
    @php
        $currentYear = date('Y');
        $currentMonth = date('n');
        if ($currentMonth >= 7) {
            $academicYear = $currentYear . '/' . ($currentYear + 1);
        } else {
            $academicYear = ($currentYear - 1) . '/' . $currentYear;
        }

        $months = [
            1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        $now = \Carbon\Carbon::now()->setTimezone('Asia/Jakarta');
        $formattedPrintDate = $now->day . ' ' . $months[$now->month] . ' ' . $now->year;
        $printTime = $now->format('H:i');
    @endphp

    <div class="footer-page-number"></div>

    <div class="header-box">
        <div class="header-title-main">SMKS RAJASA SURABAYA</div>
        <div class="header-address">JL. Genteng Kali No. 27, Surabaya</div>
        <div class="header-title-sub">LAPORAN PERSENTASE ABSENSI</div>
        <div class="header-academic-year"><strong>Tahun Ajaran:</strong> {{ $academicYear }}</div>
    </div>

    <div class="divider"></div>
    <div class="metadata">
        <p><strong>Nama Kelas:</strong> {{ $className }}</p>
        <p><strong>Jenis Absensi:</strong> 
            @if($reportType === 'daily')
                Absen Masuk Harian Gerbang
            @else
                Sesi Pelajaran: {{ $subjectName ?? 'Semua Mapel' }}
            @endif
        </p>
        <p><strong>Dicetak:</strong> {{ $formattedPrintDate }} | {{ $printTime }} WIB</p>
        <p><strong>Total Siswa:</strong> {{ count($rows) }} Siswa</p>
    </div>
    <div class="divider"></div>

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">No</th>
                <th style="width: 22%;">NISN</th>
                <th style="width: 18%;">NIS</th>
                <th style="width: 35%; text-align: left; padding-left: 10px;">Nama Siswa</th>
                <th style="width: 17%;">Persentase Kehadiran</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $index => $row)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="text-center">{{ $row->nisn ?? '-' }}</td>
                <td class="text-center">{{ $row->nis ?? '-' }}</td>
                <td class="text-left" style="padding-left: 10px;">{{ strtoupper($row->full_name) }}</td>
                <td class="text-center percentage-badge">
                    {{ number_format($row->percentage, 1, ',', '.') }}%
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="5" class="text-center" style="padding: 20px;">
                    Tidak ada data siswa
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <table class="signature-table">
        <tr>
            <td style="width: 50%;">
                <p>Mengetahui,</p>
                <p><strong>Kepala Sekolah</strong></p>
                <br><br><br><br>
                <p>__________________________________</p>
                <p style="margin-top: 5px;">NIP. ___________________________</p>
            </td>
            <td style="width: 50%;">
                <p>Surabaya, {{ $formattedPrintDate }}</p>
                <p><strong>Wali Kelas / Guru</strong></p>
                <br><br><br><br>
                <p>__________________________________</p>
                <p style="margin-top: 5px;">NIP. ___________________________</p>
            </td>
        </tr>
    </table>
</body>
</html>
