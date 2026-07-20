<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMKS Rajasa API - Developer Portal & Console</title>

    <!-- Primary SEO Meta Tags -->
    <meta name="title" content="SMKS Rajasa API - Developer Portal & Console">
    <meta name="description" content="Portal Pengembang & Dokumentasi API resmi Sistem Absensi Digital SMKS Rajasa Surabaya. Dokumentasi rute otentikasi JWT, GPS, dan unduhan APK.">
    <meta name="keywords" content="API SMKS Rajasa, Presensi Rajasa, Absensi SMKS Rajasa, Developer Console Rajasa, Dokumentasi API Absensi">
    <meta name="author" content="SMKS Rajasa Surabaya">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://api-smks-rajasa.sir-l.web.id">
    <meta name="theme-color" content="#1e40af">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://api-smks-rajasa.sir-l.web.id">
    <meta property="og:title" content="SMKS Rajasa API - Developer Portal & Console">
    <meta property="og:description" content="Portal Pengembang & Dokumentasi API resmi Sistem Absensi Digital SMKS Rajasa Surabaya.">
    <meta property="og:site_name" content="SMKS Rajasa Surabaya">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="SMKS Rajasa API - Developer Portal & Console">
    <meta name="twitter:description" content="Dokumentasi API & Portal Pengembang resmi Sistem Absensi Digital SMKS Rajasa Surabaya.">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1e3a8a;
            --primary-light: #eff6ff;
            --sidebar-bg: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%);
            --bg-color: #f1f5f9;
            --window-bg: #ffffff;
            --border-color: #e2e8f0;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --success: #10b981;
            --warning: #f59e0b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            overflow-x: hidden;
        }

        /* Desktop Application Outer Frame */
        .app-window {
            width: 100%;
            max-width: 1280px;
            height: 85vh;
            min-height: 700px;
            background-color: var(--window-bg);
            border-radius: 12px;
            border: 1px solid #cbd5e1;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: app-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 1024px) {
            body {
                padding: 0;
                background-color: var(--window-bg);
            }
            .app-window {
                height: 100vh;
                min-height: 100vh;
                border-radius: 0;
                border: none;
            }
        }

        /* Window Header / Titlebar */
        .titlebar {
            background-color: #f8fafc;
            height: 48px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            padding: 0 16px;
            justify-content: space-between;
            user-select: none;
        }

        .window-controls {
            display: flex;
            gap: 8px;
            width: 100px;
        }

        .control-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }

        .dot-close { background-color: #ef4444; }
        .dot-minimize { background-color: #eab308; }
        .dot-maximize { background-color: #22c55e; }

        .window-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .window-title i {
            color: var(--primary);
        }

        .window-status {
            width: 100px;
            display: flex;
            justify-content: flex-end;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--success);
            background-color: rgba(16, 185, 129, 0.1);
            padding: 4px 10px;
            border-radius: 99px;
        }

        .status-indicator i {
            font-size: 0.5rem;
            animation: pulse-dot 1.5s infinite;
        }

        /* Main Workspace Container */
        .workspace {
            display: flex;
            flex: 1;
            overflow: hidden;
            position: relative;
        }

        @media (max-width: 968px) {
            .workspace {
                flex-direction: column;
                overflow-y: auto;
            }
        }

        /* Column 1: Sidebar */
        .sidebar {
            width: 250px;
            background: var(--sidebar-bg);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 1.5rem 1rem;
            flex-shrink: 0;
        }

        @media (max-width: 968px) {
            .sidebar {
                width: 100%;
                height: auto;
            }
        }

        .brand-section {
            margin-bottom: 2rem;
        }

        .brand-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
        }

        .brand-logo {
            width: 32px;
            height: 32px;
            background-color: white;
            color: var(--primary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 1.1rem;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .brand-name {
            font-weight: 700;
            font-size: 1.05rem;
            letter-spacing: -0.5px;
        }

        .brand-desc {
            font-size: 0.7rem;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .nav-menu {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.85);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .nav-item:hover {
            background-color: rgba(255, 255, 255, 0.08);
            color: white;
        }

        .nav-item.active {
            background-color: rgba(255, 255, 255, 0.15);
            color: white;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .nav-item i {
            width: 16px;
            text-align: center;
        }

        .sidebar-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 1rem;
            margin-top: 1.5rem;
        }

        .apk-download-btn {
            background-color: white;
            color: var(--primary-dark);
            border-radius: 8px;
            padding: 10px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .apk-download-btn:hover {
            background-color: #f8fafc;
            transform: translateY(-1px);
        }

        /* Column 2: Documentation Detail */
        .doc-panel {
            flex: 1.2;
            padding: 2rem;
            overflow-y: auto;
            border-right: 1px solid var(--border-color);
        }

        .doc-section {
            display: none;
        }

        .doc-section.active {
            display: block;
        }

        .doc-title {
            font-size: 1.6rem;
            font-weight: 800;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
        }

        .doc-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 1.5rem;
        }

        .method-badge {
            font-size: 0.7rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }

        .method-post {
            background-color: #f3e8ff;
            color: #7e22ce;
            border: 1px solid #e9d5ff;
        }

        .method-get {
            background-color: #d1fae5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }

        .endpoint-url {
            font-family: 'Fira Code', monospace;
            font-size: 0.85rem;
            color: var(--text-secondary);
            background-color: #f8fafc;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
        }

        .doc-desc {
            font-size: 0.925rem;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        .section-subtitle {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border-color);
        }

        .params-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            font-size: 0.85rem;
        }

        .params-table th, .params-table td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .params-table th {
            background-color: #f8fafc;
            color: var(--text-secondary);
            font-weight: 600;
        }

        .param-name {
            font-family: 'Fira Code', monospace;
            font-weight: 600;
            color: var(--primary-dark);
        }

        .param-type {
            font-style: italic;
            color: var(--text-secondary);
        }

        .param-req {
            font-weight: 700;
            color: #ef4444;
        }

        /* Column 3: Console Pane */
        .console-panel {
            flex: 0.8;
            background-color: #0b0f17;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        @media (max-width: 968px) {
            .console-panel {
                width: 100%;
                height: 400px;
                flex: none;
            }
        }

        .console-header {
            background-color: #111827;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .console-tabs {
            display: flex;
            gap: 4px;
        }

        .console-tab {
            background: transparent;
            border: none;
            color: #9ca3af;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .console-tab.active {
            background-color: rgba(255, 255, 255, 0.08);
            color: white;
        }

        .btn-action {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #9ca3af;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-action:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .code-box {
            flex: 1.2;
            padding: 1.25rem;
            overflow-y: auto;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .code-box pre {
            font-family: 'Fira Code', monospace;
            font-size: 0.775rem;
            color: #38bdf8;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        .response-box {
            flex: 0.8;
            display: flex;
            flex-direction: column;
            background-color: #070a10;
        }

        .response-header {
            background-color: #0b0f17;
            padding: 6px 16px;
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .response-body {
            flex: 1;
            padding: 1.25rem;
            overflow-y: auto;
        }

        .response-body pre {
            font-family: 'Fira Code', monospace;
            font-size: 0.75rem;
            color: #a7f3d0;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        /* Overview Specific Cards */
        .overview-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }

        @media (max-width: 640px) {
            .overview-grid {
                grid-template-columns: 1fr;
            }
        }

        .overview-card {
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 1rem;
            background-color: #f8fafc;
        }

        .overview-card h4 {
            font-size: 0.9rem;
            font-weight: 700;
            margin-bottom: 6px;
            color: var(--primary-dark);
        }

        .overview-card p {
            font-size: 0.8rem;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        /* Keyframes */
        @keyframes app-appear {
            from {
                opacity: 0;
                transform: scale(0.98) translateY(10px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        @keyframes pulse-dot {
            0%, 100% {
                opacity: 0.5;
            }
            50% {
                opacity: 1;
            }
        }
    </style>
</head>
<body>

    <!-- Desktop Application Window -->
    <div class="app-window">
        
        <!-- Window Title Bar -->
        <div class="titlebar">
            <div class="window-controls">
                <span class="control-dot dot-close"></span>
                <span class="control-dot dot-minimize"></span>
                <span class="control-dot dot-maximize"></span>
            </div>
            <div class="window-title">
                <i class="fa-solid fa-square-terminal"></i>
                <span>SMKS Rajasa Developer Console v1.0.0</span>
            </div>
            <div class="window-status">
                <span class="status-indicator">
                    <i class="fa-solid fa-circle"></i> Connected
                </span>
            </div>
        </div>

        <!-- App Body (Workspace) -->
        <div class="workspace">
            
            <!-- Column 1: Navigation Sidebar -->
            <div class="sidebar">
                <div class="brand-section">
                    <div class="brand-header">
                        <div class="brand-logo"><i class="fa-solid fa-server"></i></div>
                        <div class="brand-name">SMKS Rajasa</div>
                    </div>
                    <div class="brand-desc">API Gateway & Presensi</div>
                </div>

                <div class="nav-menu">
                    <div class="nav-item active" onclick="switchTab('overview', this)">
                        <i class="fa-solid fa-circle-info"></i> Ringkasan Sistem
                    </div>
                    <div class="nav-item" onclick="switchTab('auth', this)">
                        <i class="fa-solid fa-key"></i> Otentikasi (/login)
                    </div>
                    <div class="nav-item" onclick="switchTab('sessions', this)">
                        <i class="fa-solid fa-clock"></i> Sesi Aktif (/session)
                    </div>
                    <div class="nav-item" onclick="switchTab('present', this)">
                        <i class="fa-solid fa-camera"></i> Absen Masuk (/present)
                    </div>
                    <div class="nav-item" onclick="switchTab('profile', this)">
                        <i class="fa-solid fa-user-gear"></i> Profil User (/profile)
                    </div>
                </div>

                <div class="sidebar-footer">
                    <a href="/app.apk" class="apk-download-btn">
                        <i class="fa-brands fa-android"></i> Unduh APK Mobile
                    </a>
                </div>
            </div>

            <!-- Column 2: Documentation panel -->
            <div class="doc-panel">
                
                <!-- Overview Documentation Section -->
                <div id="section-overview" class="doc-section active">
                    <h2 class="doc-title">Sistem Absensi Digital SMKS Rajasa</h2>
                    <div class="doc-meta">
                        <span class="endpoint-url">v1.0.0 (Production)</span>
                    </div>
                    <p class="doc-desc">
                        Selamat datang di Developer Console resmi SMKS Rajasa Surabaya. Dokumentasi ini merangkum layanan API yang digunakan untuk mengintegrasikan proses validasi presensi siswa dan guru berdasarkan koordinat lokasi (GPS), foto swafoto, serta token otentikasi JWT yang aman.
                    </p>
                    
                    <h3 class="section-subtitle">Komponen & Tech Stack Utama</h3>
                    <div class="overview-grid">
                        <div class="overview-card">
                            <h4>Laravel Backend</h4>
                            <p>Reverse proxy handal dan arsitektur REST API terstruktur untuk pengolahan data presensi cepat.</p>
                        </div>
                        <div class="overview-card">
                            <h4>Expo Mobile Client</h4>
                            <p>Aplikasi Android native (.APK) yang menyambung langsung dengan sensor lokasi GPS dan kamera smartphone.</p>
                        </div>
                        <div class="overview-card">
                            <h4>Websocket Reverb</h4>
                            <p>Protokol websocket berkecepatan tinggi untuk pembaruan status kehadiran guru/siswa secara real-time.</p>
                        </div>
                        <div class="overview-card">
                            <h4>Lokasi Terenkripsi</h4>
                            <p>Sistem validasi presisi dengan jangkauan toleransi radius GPS yang terverifikasi di server.</p>
                        </div>
                    </div>
                </div>

                <!-- Auth Documentation Section -->
                <div id="section-auth" class="doc-section">
                    <h2 class="doc-title">Otentikasi Login Pengguna</h2>
                    <div class="doc-meta">
                        <span class="method-badge method-post">POST</span>
                        <span class="endpoint-url">/api/auth/login</span>
                    </div>
                    <p class="doc-desc">
                        Mengirimkan kredensial login (Email, NIP, atau NIS) dan kata sandi. Jika berhasil, server akan mengembalikan data profil beserta token Bearer JWT yang wajib dilampirkan pada request-request API berikutnya.
                    </p>
                    
                    <h3 class="section-subtitle">Parameter Request (Body JSON)</h3>
                    <table class="params-table">
                        <thead>
                            <tr>
                                <th>Nama Parameter</th>
                                <th>Tipe</th>
                                <th>Wajib</th>
                                <th>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="param-name">identifier</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td>Alamat email terdaftar, NIS (Siswa), atau NIP (Guru).</td>
                            </tr>
                            <tr>
                                <td class="param-name">password</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td>Kata sandi pengguna.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Sessions Documentation Section -->
                <div id="section-sessions" class="doc-section">
                    <h2 class="doc-title">Ambil Info Sesi Absensi Aktif</h2>
                    <div class="doc-meta">
                        <span class="method-badge method-get">GET</span>
                        <span class="endpoint-url">/api/attendance/session/active</span>
                    </div>
                    <p class="doc-desc">
                        Digunakan oleh klien untuk mendeteksi apakah ada sesi presensi mengajar/belajar yang sedang dibuka secara aktif saat ini. Endpoint ini memerlukan header otentikasi token Bearer JWT.
                    </p>
                    
                    <h3 class="section-subtitle">Header Parameter</h3>
                    <table class="params-table">
                        <thead>
                            <tr>
                                <th>Nama Header</th>
                                <th>Tipe</th>
                                <th>Wajib</th>
                                <th>Nilai / Format</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="param-name">Authorization</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td><code>Bearer &lt;token_jwt_anda&gt;</code></td>
                            </tr>
                            <tr>
                                <td class="param-name">Accept</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td><code>application/json</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Present Documentation Section -->
                <div id="section-present" class="doc-section">
                    <h2 class="doc-title">Submit Presensi Kehadiran</h2>
                    <div class="doc-meta">
                        <span class="method-badge method-post">POST</span>
                        <span class="endpoint-url">/api/attendance/present</span>
                    </div>
                    <p class="doc-desc">
                        Merekam waktu masuk kehadiran guru atau siswa. Endpoint ini memverifikasi posisi koordinat pengguna agar sesuai dengan radius koordinat sekolah dan mencocokkan wajah via swafoto.
                    </p>
                    
                    <h3 class="section-subtitle">Parameter Request (Body JSON)</h3>
                    <table class="params-table">
                        <thead>
                            <tr>
                                <th>Nama Parameter</th>
                                <th>Tipe</th>
                                <th>Wajib</th>
                                <th>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="param-name">session_id</td>
                                <td class="param-type">Integer</td>
                                <td class="param-req">Ya</td>
                                <td>ID Sesi absensi yang sedang dibuka.</td>
                            </tr>
                            <tr>
                                <td class="param-name">latitude</td>
                                <td class="param-type">Float</td>
                                <td class="param-req">Ya</td>
                                <td>Garis lintang lokasi GPS saat ini (contoh: <code>-7.24354</code>).</td>
                            </tr>
                            <tr>
                                <td class="param-name">longitude</td>
                                <td class="param-type">Float</td>
                                <td class="param-req">Ya</td>
                                <td>Garis bujur lokasi GPS saat ini (contoh: <code>112.7384</code>).</td>
                            </tr>
                            <tr>
                                <td class="param-name">selfie_photo</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td>Berkas foto swafoto berformat base64 string.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Profile Documentation Section -->
                <div id="section-profile" class="doc-section">
                    <h2 class="doc-title">Ambil Profile Pengguna</h2>
                    <div class="doc-meta">
                        <span class="method-badge method-get">GET</span>
                        <span class="endpoint-url">/api/profile</span>
                    </div>
                    <p class="doc-desc">
                        Mengambil informasi lengkap profil guru atau siswa yang sedang aktif, termasuk detail kelas, NIS/NIP, nama lengkap, dan status akun. Membutuhkan header otentikasi JWT yang valid.
                    </p>
                    
                    <h3 class="section-subtitle">Header Parameter</h3>
                    <table class="params-table">
                        <thead>
                            <tr>
                                <th>Nama Header</th>
                                <th>Tipe</th>
                                <th>Wajib</th>
                                <th>Nilai / Format</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="param-name">Authorization</td>
                                <td class="param-type">String</td>
                                <td class="param-req">Ya</td>
                                <td><code>Bearer &lt;token_jwt_anda&gt;</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>

            <!-- Column 3: Request & Response Console -->
            <div class="console-panel">
                <div class="console-header">
                    <div class="console-tabs">
                        <button class="console-tab active" id="tab-curl" onclick="switchLanguage('curl')">cURL</button>
                        <button class="console-tab" id="tab-js" onclick="switchLanguage('js')">Javascript</button>
                        <button class="console-tab" id="tab-php" onclick="switchLanguage('php')">PHP</button>
                    </div>
                    <button class="btn-action" onclick="copyConsoleCode()"><i class="fa-regular fa-copy"></i> Salin</button>
                </div>
                
                <div class="code-box">
                    <pre><code id="console-code">// Code will be injected here</code></pre>
                </div>

                <div class="response-box">
                    <div class="response-header">
                        <span>Expected Response (JSON)</span>
                        <span style="color: var(--success);"><i class="fa-solid fa-circle"></i> 200 OK</span>
                    </div>
                    <div class="response-body">
                        <pre><code id="console-response">// JSON Response will be injected here</code></pre>
                    </div>
                </div>
            </div>

        </div>

    </div>

    <!-- Interactive Logic Script -->
    <script>
        const codeDatabase = {
            overview: {
                curl: `# Selamat Datang di Presensi Console SMKS Rajasa\n# Di sebelah kiri, pilih salah satu endpoint API\n# untuk melihat struktur code request & response secara langsung.`,
                js: `// Selamat Datang di Presensi Console SMKS Rajasa\n// Silakan pilih salah satu endpoint di bilah kiri.`,
                php: `<?php\n// Selamat Datang di Presensi Console SMKS Rajasa\n// Pilih salah satu menu API di sebelah kiri.`,
                response: `{\n  "status": "success",\n  "message": "Welcome to SMKS Rajasapresensi API Services",\n  "version": "1.0.0",\n  "environment": "production"\n}`
            },
            auth: {
                curl: `curl -X POST https://api-smks-rajasa.sir-l.web.id/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "identifier": "241103445",\n    "password": "password_siswa"\n  }'`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/auth/login', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    identifier: '241103445',\n    password: 'password_siswa'\n  })\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/auth/login');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    'identifier' => '241103445',\n    'password' => 'password_siswa'\n]));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);\n$response = json_decode(curl_exec($ch), true);\ncurl_close($ch);`,
                response: `{\n  "status": "success",\n  "message": "Login berhasil",\n  "data": {\n    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n    "user": {\n      "id": 15,\n      "name": "Muhammad Luthfi",\n      "email": "luthfi@smks-rajasa.sch.id",\n      "role": "siswa",\n      "nis": "241103445"\n    }\n  }\n}`
            },
            sessions: {
                curl: `curl -X GET https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active \\\n  -H "Authorization: Bearer <token_jwt_anda>" \\\n  -H "Accept: application/json"`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer ' + token,\n    'Accept': 'application/json'\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token,\n    'Accept: application/json'\n]);\n$response = json_decode(curl_exec($ch), true);\ncurl_close($ch);`,
                response: `{\n  "status": "success",\n  "data": {\n    "session_id": 4,\n    "subject": "Matematika Rekayasa",\n    "teacher": "Drs. Budi Santoso",\n    "start_time": "07:30:00",\n    "close_time": "09:00:00",\n    "radius_meters": 50,\n    "classroom_latitude": -7.24354,\n    "classroom_longitude": 112.7384\n  }\n}`
            },
            present: {
                curl: `curl -X POST https://api-smks-rajasa.sir-l.web.id/api/attendance/present \\\n  -H "Authorization: Bearer <token_jwt_anda>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "session_id": 4,\n    "latitude": -7.243543,\n    "longitude": 112.738474,\n    "selfie_photo": "data:image/jpeg;base64,..."\n  }'`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/attendance/present', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ' + token,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    session_id: 4,\n    latitude: -7.243543,\n    longitude: 112.738474,\n    selfie_photo: 'data:image/jpeg;base64,...'\n  })\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/attendance/present');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    'session_id' => 4,\n    'latitude' => -7.243543,\n    'longitude' => 112.738474,\n    'selfie_photo' => 'data:image/jpeg;base64,...'\n]));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token,\n    'Content-Type: application/json'\n]);\n$response = json_decode(curl_exec($ch), true);\ncurl_close($ch);`,
                response: `{\n  "status": "success",\n  "message": "Absensi berhasil dicatat tepat waktu",\n  "data": {\n    "student_id": 15,\n    "time_present": "07:42:15",\n    "distance_from_center_meters": 12.5,\n    "status": "Hadir"\n  }\n}`
            },
            profile: {
                curl: `curl -X GET https://api-smks-rajasa.sir-l.web.id/api/profile \\\n  -H "Authorization: Bearer <token_jwt_anda>"`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/profile', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer ' + token\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/profile');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token\n]);\n$response = json_decode(curl_exec($ch), true);\ncurl_close($ch);`,
                response: `{\n  "status": "success",\n  "data": {\n    "id": 15,\n    "nis": "241103445",\n    "name": "Muhammad Luthfi",\n    "class": "XII RPL 1",\n    "email": "luthfi@smks-rajasa.sch.id",\n    "joined_at": "2024-07-15"\n  }\n}`
            }
        };

        let currentActiveSection = 'overview';
        let currentActiveLanguage = 'curl';

        function updateConsoleView() {
            const codeEl = document.getElementById('console-code');
            const responseEl = document.getElementById('console-response');
            
            // Inject Request Code
            const requestCode = codeDatabase[currentActiveSection][currentActiveLanguage];
            codeEl.textContent = requestCode;
            
            // Inject Expected JSON response
            const jsonResponse = codeDatabase[currentActiveSection]['response'];
            responseEl.textContent = jsonResponse;
        }

        function switchTab(section, element) {
            currentActiveSection = section;

            // Update Navigation Menu Active classes
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => item.classList.remove('active'));
            element.classList.add('active');

            // Update Doc Panel visibility
            const docSections = document.querySelectorAll('.doc-section');
            docSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');

            // Update code view
            updateConsoleView();
        }

        function switchLanguage(lang) {
            currentActiveLanguage = lang;

            // Update tab UI active classes
            const tabs = document.querySelectorAll('.console-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            document.getElementById(`tab-${lang}`).classList.add('active');

            // Update code view
            updateConsoleView();
        }

        function copyConsoleCode() {
            const textToCopy = codeDatabase[currentActiveSection][currentActiveLanguage];
            navigator.clipboard.writeText(textToCopy).then(() => {
                const btn = document.querySelector('.btn-action');
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
                btn.style.color = '#10b981';
                btn.style.borderColor = '#10b981';
                
                setTimeout(() => {
                    btn.innerHTML = `<i class="fa-regular fa-copy"></i> Salin`;
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }, 2000);
            });
        }

        // Run Initial Load
        updateConsoleView();
    </script>
</body>
</html>
