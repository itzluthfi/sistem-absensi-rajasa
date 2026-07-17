<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Developer Portal - SMKS Rajasa Surabaya</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --bg-color: #080b11;
            --card-bg: rgba(17, 24, 39, 0.6);
            --border-color: rgba(59, 130, 246, 0.15);
            --border-hover: rgba(59, 130, 246, 0.4);
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --primary-glow: rgba(37, 99, 235, 0.5);
            --accent-glow: rgba(147, 51, 234, 0.4);
            --accent-color: #3b82f6;
            --success-color: #10b981;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            overflow-x: hidden;
            line-height: 1.6;
        }

        /* Ambient Glow Backgrounds */
        .ambient-glow-1 {
            position: absolute;
            top: -10%;
            left: -10%;
            width: 50vw;
            height: 50vw;
            background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
            z-index: -1;
            filter: blur(80px);
            pointer-events: none;
        }

        .ambient-glow-2 {
            position: absolute;
            bottom: -10%;
            right: -10%;
            width: 45vw;
            height: 45vw;
            background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
            z-index: -1;
            filter: blur(80px);
            pointer-events: none;
        }

        /* Grid Background Pattern */
        .grid-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: -1;
            pointer-events: none;
        }

        /* Container & Layout */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            position: relative;
        }

        /* Header Navigation */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 3.5rem;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
            color: white;
            box-shadow: 0 0 20px var(--primary-glow);
        }

        .logo-text {
            font-weight: 700;
            font-size: 1.25rem;
            letter-spacing: -0.5px;
            background: linear-gradient(to right, #ffffff, #9ca3af);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header-links {
            display: flex;
            gap: 1.5rem;
            align-items: center;
        }

        .header-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .header-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--border-hover);
        }

        /* Hero Section */
        .hero {
            text-align: center;
            margin-bottom: 5rem;
        }

        .version-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: var(--success-color);
            padding: 0.35rem 0.85rem;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .version-badge i {
            font-size: 0.5rem;
            animation: pulse-glow 1.5s infinite;
        }

        .hero h1 {
            font-size: 3.5rem;
            font-weight: 800;
            letter-spacing: -1.5px;
            margin-bottom: 1.2rem;
            line-height: 1.1;
            background: linear-gradient(to right, #ffffff, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero p {
            font-size: 1.15rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto 2.5rem auto;
        }

        .hero-actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .btn-primary {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 0.85rem 1.75rem;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 20px var(--primary-glow);
            transition: all 0.3s ease;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(37, 99, 235, 0.7);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
            padding: 0.85rem 1.75rem;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--border-hover);
        }

        /* Status Grid Section */
        .status-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 5rem;
        }

        .status-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.3s ease;
        }

        .status-card:hover {
            border-color: var(--border-hover);
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .status-icon {
            width: 48px;
            height: 48px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            color: var(--accent-color);
        }

        .status-details h3 {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .status-val {
            font-size: 1.15rem;
            font-weight: 700;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--success-color);
            font-size: 0.9rem;
        }

        /* Main Workspace: split docs & code console */
        .workspace {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 2.5rem;
            align-items: start;
            margin-bottom: 5rem;
        }

        @media (max-width: 968px) {
            .workspace {
                grid-template-columns: 1fr;
            }
        }

        .section-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            letter-spacing: -0.5px;
            position: relative;
            display: inline-block;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 0;
            width: 40px;
            height: 3px;
            background: linear-gradient(to right, #2563eb, #7c3aed);
            border-radius: 99px;
        }

        /* API Grid Cards */
        .api-grid {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .api-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.25rem 1.5rem;
            backdrop-filter: blur(12px);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }

        .api-card:hover {
            border-color: var(--border-hover);
        }

        .api-card.active {
            border-color: var(--accent-color);
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.15);
        }

        .api-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .api-method-badge {
            font-size: 0.75rem;
            font-weight: 800;
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            letter-spacing: 0.5px;
        }

        .method-post {
            background: rgba(147, 51, 234, 0.15);
            border: 1px solid rgba(147, 51, 234, 0.3);
            color: #c084fc;
        }

        .method-get {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
        }

        .api-endpoint {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .api-desc {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        /* Console Terminal Mockup */
        .console-container {
            position: sticky;
            top: 2rem;
        }

        .terminal {
            background: #0b0f17;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .terminal-header {
            background: #111827;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .terminal-actions {
            display: flex;
            gap: 6px;
        }

        .action-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .dot-red { background-color: #ef4444; }
        .dot-yellow { background-color: #f59e0b; }
        .dot-green { background-color: #10b981; }

        .terminal-tabs {
            display: flex;
            gap: 8px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 0.8rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .tab-btn.active {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-primary);
        }

        .terminal-body {
            padding: 1.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.825rem;
            line-height: 1.5;
            color: #38bdf8;
            min-height: 280px;
            position: relative;
        }

        .code-block {
            display: none;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .code-block.active {
            display: block;
        }

        .btn-copy {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-copy:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }

        /* Footer */
        footer {
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 3rem 0;
            margin-top: 5rem;
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .footer-tech {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            margin-top: 1rem;
            font-size: 1.15rem;
        }

        .footer-tech i {
            transition: color 0.3s ease;
        }

        .footer-tech i:hover {
            color: var(--text-primary);
        }

        /* Keyframes */
        @keyframes pulse-glow {
            0%, 100% {
                opacity: 0.4;
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
        }
    </style>
</head>
<body>

    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>
    <div class="grid-overlay"></div>

    <div class="container">
        
        <!-- Header -->
        <header>
            <a href="#" class="logo-area">
                <div class="logo-icon"><i class="fa-solid fa-server"></i></div>
                <div class="logo-text">SMKS RAJASA API</div>
            </a>
            <div class="header-links">
                <a href="https://smks-rajasa.sir-l.web.id/assets/images/logo.png" target="_blank" class="header-btn">Profil Sekolah</a>
            </div>
        </header>

        <!-- Hero -->
        <section class="hero">
            <div class="version-badge">
                <i class="fa-solid fa-circle"></i> API Production v1.0.0
            </div>
            <h1>Gateway Otentikasi & Absensi Terpadu</h1>
            <p>Developer portal resmi untuk integrasi sistem absensi presisi, manajemen database siswa & guru, serta validasi lokasi terenkripsi SMKS Rajasa Surabaya.</p>
            <div class="hero-actions">
                <a href="/app.apk" class="btn-primary">
                    <i class="fa-brands fa-android"></i> Unduh Aplikasi Android (APK)
                </a>
                <a href="#endpoints" class="btn-secondary">
                    <i class="fa-solid fa-code"></i> Jelajahi Endpoint
                </a>
            </div>
        </section>

        <!-- Status Grid -->
        <section class="status-section">
            <div class="status-card">
                <div class="status-icon"><i class="fa-solid fa-cloud-bolt"></i></div>
                <div class="status-details">
                    <h3>API Gateway</h3>
                    <div class="status-badge"><i class="fa-solid fa-circle"></i> Online</div>
                </div>
            </div>
            <div class="status-card">
                <div class="status-icon"><i class="fa-solid fa-database"></i></div>
                <div class="status-details">
                    <h3>Database MariaDB</h3>
                    <div class="status-val" style="color: #60a5fa;">Terhubung</div>
                </div>
            </div>
            <div class="status-card">
                <div class="status-icon"><i class="fa-solid fa-wave-square"></i></div>
                <div class="status-details">
                    <h3>Websocket Reverb</h3>
                    <div class="status-badge" style="color: #a78bfa;"><i class="fa-solid fa-circle"></i> Active</div>
                </div>
            </div>
        </section>

        <!-- Main Workspace (Docs + Mockup) -->
        <div class="workspace" id="endpoints">
            
            <!-- Left Side: API Documentation List -->
            <div>
                <h2 class="section-title">Dokumentasi API</h2>
                <div class="api-grid">
                    
                    <div class="api-card active" onclick="switchEndpoint('auth')">
                        <div class="api-meta">
                            <span class="api-method-badge method-post">POST</span>
                            <span class="api-endpoint">/api/auth/login</span>
                        </div>
                        <p class="api-desc">Melakukan otentikasi login pengguna (Guru, Murid, Admin) dan mengembalikan token otorisasi Bearer JWT.</p>
                    </div>

                    <div class="api-card" onclick="switchEndpoint('sessions')">
                        <div class="api-meta">
                            <span class="api-method-badge method-get">GET</span>
                            <span class="api-endpoint">/api/attendance/session/active</span>
                        </div>
                        <p class="api-desc">Mendapatkan info sesi absensi harian yang sedang dibuka/aktif berdasarkan koordinat kelas.</p>
                    </div>

                    <div class="api-card" onclick="switchEndpoint('present')">
                        <div class="api-meta">
                            <span class="api-method-badge method-post">POST</span>
                            <span class="api-endpoint">/api/attendance/present</span>
                        </div>
                        <p class="api-desc">Melakukan submit absensi kehadiran pengguna dengan mengirim koordinat GPS dan data swafoto.</p>
                    </div>

                    <div class="api-card" onclick="switchEndpoint('profile')">
                        <div class="api-meta">
                            <span class="api-method-badge method-get">GET</span>
                            <span class="api-endpoint">/api/profile</span>
                        </div>
                        <p class="api-desc">Mengambil profile detail data guru atau murid yang saat ini terautentikasi oleh sistem token.</p>
                    </div>

                </div>
            </div>

            <!-- Right Side: Code Console Terminal -->
            <div class="console-container">
                <h2 class="section-title">Request Console</h2>
                <div class="terminal">
                    <div class="terminal-header">
                        <div class="terminal-actions">
                            <div class="action-dot dot-red"></div>
                            <div class="action-dot dot-yellow"></div>
                            <div class="action-dot dot-green"></div>
                        </div>
                        <div class="terminal-tabs">
                            <button class="tab-btn active" onclick="switchTab('curl')">cURL</button>
                            <button class="tab-btn" onclick="switchTab('js')">JS Fetch</button>
                            <button class="tab-btn" onclick="switchTab('php')">PHP</button>
                        </div>
                    </div>
                    <div class="terminal-body">
                        <button class="btn-copy" onclick="copyCode()"><i class="fa-regular fa-copy"></i> Salin</button>
                        
                        <div id="code-content">
                            <!-- Code injected by JS -->
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <footer>
            <p>© 2026 Tim IT & Sistem Absensi SMKS Rajasa Surabaya. Semua Hak Dilindungi.</p>
            <div class="footer-tech">
                <i class="fa-brands fa-laravel" style="color: #ff2d20;"></i>
                <i class="fa-brands fa-react" style="color: #61dafb;"></i>
                <i class="fa-brands fa-android" style="color: #3ddc84;"></i>
            </div>
        </footer>

    </div>

    <script>
        // Code mock database
        const codeDatabase = {
            auth: {
                curl: `curl -X POST https://api-smks-rajasa.sir-l.web.id/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "identifier": "241103445",\n    "password": "PasswordSiswa"\n  }'`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/auth/login', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    identifier: '241103445',\n    password: 'PasswordSiswa'\n  })\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/auth/login');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    'identifier' => '241103445',\n    'password' => 'PasswordSiswa'\n]));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);\n$response = curl_exec($ch);\ncurl_close($ch);`
            },
            sessions: {
                curl: `curl -X GET https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active \\\n  -H "Authorization: Bearer <your_jwt_token>" \\\n  -H "Accept: application/json"`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer ' + token,\n    'Accept': 'application/json'\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/attendance/session/active');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token,\n    'Accept: application/json'\n]);\n$response = curl_exec($ch);\ncurl_close($ch);`
            },
            present: {
                curl: `curl -X POST https://api-smks-rajasa.sir-l.web.id/api/attendance/present \\\n  -H "Authorization: Bearer <your_jwt_token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "session_id": 4,\n    "latitude": -7.243543,\n    "longitude": 112.738474,\n    "selfie_photo": "data:image/jpeg;base64,..."\n  }'`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/attendance/present', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ' + token,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    session_id: 4,\n    latitude: -7.243543,\n    longitude: 112.738474,\n    selfie_photo: 'data:image/jpeg;base64,...'\n  })\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/attendance/present');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    'session_id' => 4,\n    'latitude' => -7.243543,\n    'longitude' => 112.738474,\n    'selfie_photo' => 'data:image/jpeg;base64,...'\n]));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token,\n    'Content-Type: application/json'\n]);\n$response = curl_exec($ch);\ncurl_close($ch);`
            },
            profile: {
                curl: `curl -X GET https://api-smks-rajasa.sir-l.web.id/api/profile \\\n  -H "Authorization: Bearer <your_jwt_token>"`,
                js: `fetch('https://api-smks-rajasa.sir-l.web.id/api/profile', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer ' + token\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
                php: `<?php\n$ch = curl_init('https://api-smks-rajasa.sir-l.web.id/api/profile');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $token\n]);\n$response = curl_exec($ch);\ncurl_close($ch);`
            }
        };

        let selectedEndpoint = 'auth';
        let selectedTab = 'curl';

        function updateConsole() {
            const codeContent = document.getElementById('code-content');
            let rawCode = codeDatabase[selectedEndpoint][selectedTab];
            
            // Syntax coloring for rendering (extremely simple presentation)
            let escapedCode = rawCode
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
                
            codeContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapedCode}</pre>`;
        }

        function switchEndpoint(endpoint) {
            selectedEndpoint = endpoint;
            
            // Remove active classes
            const cards = document.querySelectorAll('.api-card');
            cards.forEach(card => card.classList.remove('active'));
            
            // Find clicked card and make active
            event.currentTarget.classList.add('active');
            
            updateConsole();
        }

        function switchTab(tab) {
            selectedTab = tab;
            
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(btn => btn.classList.remove('active'));
            
            event.target.classList.add('active');
            
            updateConsole();
        }

        function copyCode() {
            const textToCopy = codeDatabase[selectedEndpoint][selectedTab];
            navigator.clipboard.writeText(textToCopy).then(() => {
                const btn = document.querySelector('.btn-copy');
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Tersalin!`;
                btn.style.color = '#10b981';
                btn.style.borderColor = '#10b981';
                
                setTimeout(() => {
                    btn.innerHTML = `<i class="fa-regular fa-copy"></i> Salin`;
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }, 2000);
            });
        }

        // Initialize Console
        updateConsole();
    </script>
</body>
</html>
