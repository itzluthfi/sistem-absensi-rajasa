<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiSignature
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip validation for public QR code endpoints (no auth required)
        // Handle both /qr/* and /api/qr/* paths (depends on Laravel version)
        $path = $request->path();
        $normalizedPath = ltrim($path, '/');
        if (
            str_starts_with($normalizedPath, 'qr/') ||
            str_starts_with($normalizedPath, 'api/qr') ||
            $normalizedPath === 'qr' ||
            $request->is('api/qr/*') ||
            $request->is('qr/*') ||
            $request->is('api/qr') ||
            $request->is('qr')
        ) {
            return $next($request);
        }

        // Allowed API client credentials mapping from .env with secure fallbacks
        $clientIdEnv = env('API_CLIENT_ID', 'smks-rajasa-app');
        $clientSecretEnv = env('API_CLIENT_SECRET', 'rajasa_secure_secret_key_2026');

        $clients = [
            $clientIdEnv => $clientSecretEnv
        ];

        $clientId = $request->header('X-Client-ID');
        $timestamp = $request->header('X-Timestamp');
        $signature = $request->header('X-Signature');

        if (!$clientId || !$timestamp || !$signature) {
            return response()->json([
                'success' => false,
                'message' => 'Missing security headers (X-Client-ID, X-Timestamp, X-Signature)'
            ], 401);
        }

        if (!array_key_exists($clientId, $clients)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Client ID'
            ], 401);
        }

        // Replay attack prevention: max 5 minutes (300 seconds) clock drift
        $currentTime = time();
        if (abs($currentTime - (int)$timestamp) > 300) {
            return response()->json([
                'success' => false,
                'message' => 'Request expired / timestamp drift too large'
            ], 401);
        }

        $secretKey = $clients[$clientId];
        $expectedSignature = hash('sha256', $clientId . '.' . $timestamp . '.' . $secretKey);

        if (!hash_equals($expectedSignature, $signature)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid request signature'
            ], 401);
        }

        return $next($request);
    }
}
