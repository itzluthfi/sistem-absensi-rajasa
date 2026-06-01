<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    /**
     * Send direct Push Notification via Google Firebase FCM v1 API
     *
     * @param string|array $tokens Device FCM token(s)
     * @param string $title Notification title
     * @param string $body Notification body content
     * @param array $data Optional custom data payload (keys & values must be strings)
     */
    public static function sendNotification($tokens, $title, $body, $data = [])
    {
        $recipients = is_array($tokens) ? $tokens : [$tokens];
        $recipients = array_filter($recipients); // Remove empty values

        if (empty($recipients)) {
            return;
        }

        // Get Service Account credentials
        $credentials = self::getCredentials();
        if (!$credentials) {
            Log::error('FCM Error: Service account credentials not found or invalid.');
            return;
        }

        // Get Google OAuth2 access token
        $accessToken = self::getGoogleAccessToken($credentials);
        if (!$accessToken) {
            Log::error('FCM Error: Failed to obtain Google OAuth2 Access Token.');
            return;
        }

        $projectId = env('FIREBASE_PROJECT_ID', $credentials['project_id'] ?? null);
        if (!$projectId) {
            Log::error('FCM Error: Firebase Project ID is not configured.');
            return;
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        // Format data values as strings (Google FCM V1 requires all data values to be strings)
        $formattedData = [];
        if (!empty($data)) {
            foreach ($data as $key => $value) {
                $formattedData[(string)$key] = (string)$value;
            }
        }

        foreach ($recipients as $token) {
            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => $formattedData,
                    'android' => [
                        'notification' => [
                            'sound' => 'default',
                            'priority' => 'high',
                        ],
                    ],
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                                'badge' => 1,
                            ],
                        ],
                    ],
                ]
            ];

            try {
                $response = Http::withToken($accessToken)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, $payload);

                if (!$response->successful()) {
                    Log::error("FCM Send Failed for token: {$token}. Error: " . $response->body());
                }
            } catch (\Exception $e) {
                Log::error("FCM Send Exception: " . $e->getMessage());
            }
        }
    }

    /**
     * Read and decode service account credentials from storage
     */
    private static function getCredentials()
    {
        $credentialsPath = storage_path('app/firebase-service-account.json');
        if (!file_exists($credentialsPath)) {
            return null;
        }

        try {
            return json_decode(file_get_contents($credentialsPath), true);
        } catch (\Exception $e) {
            Log::error('FCM Error: Failed to parse firebase-service-account.json: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Generate Google OAuth2 access token using OAuth JWT Assertion flow (RS256)
     */
    private static function getGoogleAccessToken($credentials)
    {
        if (!isset($credentials['client_email']) || !isset($credentials['private_key'])) {
            return null;
        }

        $now = time();
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $claim = json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlClaim = self::base64UrlEncode($claim);

        $signature = '';
        $success = openssl_sign(
            $base64UrlHeader . "." . $base64UrlClaim,
            $signature,
            $credentials['private_key'],
            'SHA256'
        );

        if (!$success) {
            Log::error('FCM Error: OpenSSL signing assertion failed.');
            return null;
        }

        $base64UrlSignature = self::base64UrlEncode($signature);
        $jwt = $base64UrlHeader . "." . $base64UrlClaim . "." . $base64UrlSignature;

        try {
            // Exchange JWT Assertion for access token
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if ($response->successful()) {
                return $response->json()['access_token'] ?? null;
            }

            Log::error('FCM Error Token Exchange response: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('FCM Exception during token exchange: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Encode data to Base64 URL Safe format
     */
    private static function base64UrlEncode($data)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
