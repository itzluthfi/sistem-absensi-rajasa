<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Absensi SMKS Rajasa</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3B82F6;
        }
        .header h1 {
            font-size: 18px;
            color: #1F2937;
            margin-bottom: 5px;
        }
        .header h2 {
            font-size: 14px;
            color: #6B7280;
            font-weight: normal;
        }
        .header p {
            font-size: 10px;
            color: #9CA3AF;
            margin-top: 5px;
        }
        .info-box {
            background-color: #F3F4F6;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .info-label {
            color: #6B7280;
        }
        .info-value {
            color: #1F2937;
            font-weight: bold;
        }
        .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
        }
        .stat-card {
            flex: 1;
            min-width: 80px;
            background-color: #fff;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
        }
        .stat-number {
            font-size: 20px;
            font-weight: bold;
            color: #1F2937;
        }
        .stat-label {
            font-size: 9px;
            color: #6B7280;
            margin-top: 3px;
        }
        .stat-card.hadir { border-left: 3px solid #10B981; }
        .stat-card.telat { border-left: 3px solid #F59E0B; }
        .stat-card.izin { border-left: 3px solid #3B82F6; }
        .stat-card.sakit { border-left: 3px solid #EF4444; }
        .stat-card.alpha { border-left: 3px solid #6B7280; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        thead {
            background-color: #3B82F6;
        }
        th {
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 9px;
        }
        tbody tr:nth-child(even) {
            background-color: #F9FAFB;
        }
        tbody tr:hover {
            background-color: #EFF6FF;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-hadir { background-color: #D1FAE5; color: #065F46; }
        .status-telat { background-color: #FEF3C7; color: #92400E; }
        .status-izin { background-color: #DBEAFE; color: #1E40AF; }
        .status-sakit { background-color: #FEE2E2; color: #991B1B; }
        .status-alpha { background-color: #F3F4F6; color: #374151; }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 8px;
            color: #9CA3AF;
        }
        .signature-box {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
        }
        .signature-item {
            text-align: center;
            width: 200px;
        }
        .signature-line {
            margin-top: 60px;
            border-top: 1px solid #333;
            padding-top: 5px;
        }
        .page-number {
            position: fixed;
            bottom: 10px;
            right: 20px;
            font-size: 8px;
            color: #9CA3AF;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN ABSENSI DIGITAL</h1>
        <h2>SMKS RAJASA</h2>
        <p>Jl. Pendidikan No. 123, Kota - Telp: (021) 123-4567</p>
    </div>

    <div class="info-box">
        <div class="info-row">
            <span class="info-label">Periode Laporan:</span>
            <span class="info-value">
                @if(isset($from) && isset($to))
                    {{ \Carbon\Carbon::parse($from)->format('d/m/Y') }} - {{ \Carbon\Carbon::parse($to)->format('d/m/Y') }}
                @else
                    Semua Data
                @endif
            </span>
        </div>
        <div class="info-row">
            <span class="info-label">Tanggal Cetak:</span>
            <span class="info-value">{{ \Carbon\Carbon::now()->format('d/m/Y H:i') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total Record:</span>
            <span class="info-value">{{ count($rows) }} Data</span>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card hadir">
            <div class="stat-number">{{ $rows->where('status', 'hadir')->count() }}</div>
            <div class="stat-label">Hadir</div>
        </div>
        <div class="stat-card telat">
            <div class="stat-number">{{ $rows->where('status', 'telat')->count() }}</div>
            <div class="stat-label">Telat</div>
        </div>
        <div class="stat-card izin">
            <div class="stat-number">{{ $rows->where('status', 'izin')->count() }}</div>
            <div class="stat-label">Izin</div>
        </div>
        <div class="stat-card sakit">
            <div class="stat-number">{{ $rows->where('status', 'sakit')->count() }}</div>
            <div class="stat-label">Sakit</div>
        </div>
        <div class="stat-card alpha">
            <div class="stat-number">{{ $rows->where('status', 'alpha')->count() }}</div>
            <div class="stat-label">Alpha</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Status</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $index => $row)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $row->id }}</td>
                <td>{{ \Carbon\Carbon::parse($row->date)->format('d/m/Y') }}</td>
                <td>{{ $row->time }}</td>
                <td>{{ optional($row->student)->full_name ?? 'N/A' }}</td>
                <td>{{ optional($row->class)->class_name ?? 'N/A' }}</td>
                <td>
                    <span class="status-badge status-{{ $row->status }}">
                        {{ ucfirst($row->status) }}
                    </span>
                </td>
                <td>
                    @if($row->late_minutes)
                        Terlambat {{ $row->late_minutes }} menit
                    @else
                        -
                    @endif
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px;">
                    Tidak ada data absensi
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="signature-box">
        <div class="signature-item">
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div class="signature-line">
                <p>(_______________________)</p>
            </div>
        </div>
        <div class="signature-item">
            <p>Jakarta, {{ \Carbon\Carbon::now()->format('d F Y') }}</p>
            <p>Penyusun Laporan</p>
            <div class="signature-line">
                <p>(_______________________)</p>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Dokumen ini dicetak dari Sistem Absensi Digital SMKS Rajasa</p>
        <p>Halaman ini dihasilkan secara otomatis dan tidak memerlukan tanda tangan basah</p>
    </div>
</body>
</html>