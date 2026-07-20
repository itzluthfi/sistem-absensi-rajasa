<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Absensi SMKS Rajasa</title>
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
        .legend-box {
            margin-top: 12px;
            font-size: 8.5px;
            font-weight: bold;
            font-style: italic;
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

        if (isset($from) && $from !== '-' && isset($to) && $to !== '-') {
            $fromDate = \Carbon\Carbon::parse($from);
            $toDate = \Carbon\Carbon::parse($to);
            
            $fromStr = $fromDate->day . ' ' . $months[$fromDate->month] . ' ' . $fromDate->year;
            $toStr = $toDate->day . ' ' . $months[$toDate->month] . ' ' . $toDate->year;
            
            if ($from === $to) {
                $dateRange = $fromStr;
            } else {
                $dateRange = $fromStr . ' - ' . $toStr;
            }
        } else {
            $dateRange = 'Semua Data';
        }
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
        <div class="report-title">LAPORAN KEHADIRAN ABSENSI DETAIL</div>
        <div class="report-subtitle">Tahun Ajaran: {{ $academicYear }}</div>
    </div>
    <div class="metadata">
        <p><strong>Tanggal:</strong> {{ $dateRange }}</p>
        <p><strong>Dicetak:</strong> {{ $formattedPrintDate }} | {{ $printTime }} WIB</p>
        <p><strong>Guru Pengampu:</strong> ____________________________________</p>
    </div>

    <table>
        <thead>
            <tr>
                <th rowspan="2" style="width: 4%;">NO</th>
                <th rowspan="2" style="width: 13%;">NISN</th>
                <th rowspan="2" style="width: 32%; text-align: left; padding-left: 10px;">NAMA SISWA</th>
                <th rowspan="2" style="width: 8%;">KELAS</th>
                <th colspan="4" style="width: 14%;">STATUS KEHADIRAN</th>
                <th rowspan="2" style="width: 29%;">KETERANGAN</th>
            </tr>
            <tr>
                <th style="width: 3.5%;">H</th>
                <th style="width: 3.5%;">S</th>
                <th style="width: 3.5%;">I</th>
                <th style="width: 3.5%;">A</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $index => $row)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="text-center">{{ $row->student->nisn ?? '-' }}</td>
                <td class="text-left" style="padding-left: 10px;">{{ strtoupper(optional($row->student)->full_name ?? 'N/A') }}</td>
                <td class="text-center">{{ optional($row->class)->class_name ?? 'N/A' }}</td>
                <td class="text-center">{{ ($row->status == 'hadir' || $row->status == 'telat') ? '✓' : '' }}</td>
                <td class="text-center">{{ ($row->status == 'sakit') ? '✓' : '' }}</td>
                <td class="text-center">{{ ($row->status == 'izin') ? '✓' : '' }}</td>
                <td class="text-center">{{ ($row->status == 'alpha') ? '✓' : '' }}</td>
                <td class="text-center">
                    @if($row->status == 'telat')
                        Terlambat {{ $row->late_minutes }} menit
                    @elseif($row->notes)
                        {{ $row->notes }}
                    @else
                        -
                    @endif
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="9" class="text-center" style="padding: 20px;">
                    Tidak ada data absensi
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="legend-box">
        Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alfa
    </div>

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
                <p><strong>Guru Pengampu</strong></p>
                <br><br><br><br>
                <p>__________________________________</p>
                <p style="margin-top: 5px;">NIP. ___________________________</p>
            </td>
        </tr>
    </table>
</body>
</html>