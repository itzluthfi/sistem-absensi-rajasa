<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rekap Persentase Absensi SMKS Rajasa</title>
    <style>
        @page {
            margin: 0;
        }
        html, body, p, table, tr, th, td {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: 45pt 40pt 50pt 40pt;
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9px;
            color: #000;
            line-height: 1.4;
        }
        .kop-surat {
            width: 100%;
            border-collapse: collapse;
            border: none !important;
            margin-bottom: 5px;
        }
        .kop-surat td {
            border: none !important;
            padding: 0 !important;
            vertical-align: middle;
        }
        .kop-logo-td {
            width: 12%;
            text-align: center;
        }
        .logo-emblem {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid #000;
            line-height: 46px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            font-family: 'DejaVu Sans', Arial, sans-serif;
            margin: 0 auto;
        }
        .kop-text-td {
            width: 88%;
            text-align: center;
            padding-right: 50px !important;
        }
        .kop-title-main {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            text-transform: uppercase;
        }
        .kop-title-school {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            text-transform: uppercase;
        }
        .kop-title-status {
            font-size: 8.5px;
            font-weight: bold;
            margin-bottom: 3px;
            text-transform: uppercase;
        }
        .kop-address {
            font-size: 8px;
            font-style: italic;
            color: #333;
        }
        .kop-divider {
            border-top: 2px solid #000;
            border-bottom: 0.5px solid #000;
            height: 2px;
            margin-top: 5px;
            margin-bottom: 12px;
        }
        .report-title-container {
            text-align: center;
            margin-bottom: 12px;
        }
        .report-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            text-decoration: underline;
            margin-bottom: 3px;
        }
        .report-subtitle {
            font-size: 9.5px;
        }
        .divider {
            border-top: 1px dotted #000;
            margin: 8px 0;
            height: 0;
            width: 100%;
        }
        .metadata {
            margin: 8px 0;
            font-size: 9.5px;
            line-height: 1.5;
        }
        .metadata p {
            margin-bottom: 3px;
        }
        .metadata strong {
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 8.5px;
            page-break-inside: auto;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th, td {
            border: 1px solid #000;
            padding: 5px 3px;
            vertical-align: middle;
        }
        th {
            font-weight: bold;
            text-transform: uppercase;
            background-color: #f2f2f2;
            color: #000;
            text-align: center;
        }
        td {
            color: #000;
        }
        tbody tr:nth-child(even) {
            background-color: #fafafa;
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
            margin-top: 35px;
            page-break-inside: avoid;
        }
        .signature-table td {
            border: none !important;
            text-align: center;
            font-size: 10px;
            line-height: 1.5;
            padding: 0 20px;
        }
        .footer-page-number {
            position: fixed;
            bottom: 20pt;
            left: 40pt;
            right: 40pt;
            height: 20pt;
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

    <table class="kop-surat">
        <tr>
            <td class="kop-logo-td">
                @php
                    $logoPath = null;
                    if (file_exists(public_path('assets/logo.png'))) {
                        $logoPath = public_path('assets/logo.png');
                    } elseif (file_exists(base_path('public/assets/logo.png'))) {
                        $logoPath = base_path('public/assets/logo.png');
                    } elseif (file_exists(base_path('public_html/assets/logo.png'))) {
                        $logoPath = base_path('public_html/assets/logo.png');
                    }

                    $logoBase64 = null;
                    if ($logoPath) {
                        $logoBase64 = base64_encode(file_get_contents($logoPath));
                    }
                @endphp

                @if($logoBase64)
                    <img src="data:image/png;base64,{{ $logoBase64 }}" style="width: 55px; height: auto; display: block; margin: 0 auto;">
                @else
                    <div class="logo-emblem">SR</div>
                @endif
            </td>
            <td class="kop-text-td">
                <div class="kop-title-main">YAYASAN KARYA PEMBANGUNAN RAJASA</div>
                <div class="kop-title-school">SMKS RAJASA SURABAYA</div>
                <div class="kop-address">Jl. Genteng Kali No. 27, Surabaya • Telp: (031) 5344840 • Pos: 60275</div>
            </td>
        </tr>
    </table>
    <div class="kop-divider"></div>

    <div class="report-title-container">
        <div class="report-title">LAPORAN PERSENTASE ABSENSI KEHADIRAN</div>
        <div class="report-subtitle">Tahun Ajaran: {{ $academicYear }}</div>
    </div>
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
                <th style="width: 6%;">No</th>
                <th style="width: @if($className === 'Semua Kelas') 16% @else 22% @endif;">NISN</th>
                <th style="width: @if($className === 'Semua Kelas') 14% @else 18% @endif;">NIS</th>
                <th style="width: @if($className === 'Semua Kelas') 28% @else 37% @endif; text-align: left; padding-left: 10px;">Nama Siswa</th>
                @if($className === 'Semua Kelas')
                <th style="width: 18%;">Kelas</th>
                @endif
                <th style="width: 18%;">Persentase Kehadiran</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $index => $row)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="text-center">{{ $row->nisn ?? '-' }}</td>
                <td class="text-center">{{ $row->nis ?? '-' }}</td>
                <td class="text-left" style="padding-left: 10px;">{{ strtoupper($row->full_name) }}</td>
                @if($className === 'Semua Kelas')
                <td class="text-center">{{ $row->class_name ?? '-' }}</td>
                @endif
                <td class="text-center percentage-badge">
                    {{ number_format($row->percentage, 1, ',', '.') }}%
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="@if($className === 'Semua Kelas') 6 @else 5 @endif" class="text-center" style="padding: 20px;">
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
