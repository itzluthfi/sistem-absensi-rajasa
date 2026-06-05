<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\DatabaseMessage;

class GenericNotification extends Notification
{
    use Queueable;

    protected $message;

    public function __construct($message)
    {
        $this->message = $message;
    }

    public function via($notifiable)
    {
        // 1. Log Database Notification (always succeeds since it's stored in local DB)
        try {
            \App\Models\NotificationLog::create([
                'user_id' => $notifiable->id ?? null,
                'title' => 'Sistem Absensi Rajasa',
                'message' => $this->message,
                'channel' => 'database',
                'status' => 'success',
            ]);
        } catch (\Exception $dbLogEx) {
            \Illuminate\Support\Facades\Log::error('Failed to log database notification to notification_logs: ' . $dbLogEx->getMessage());
        }

        // 2. Kirim Push Notification ke Firebase FCM jika ada token terdaftar
        try {
            if (method_exists($notifiable, 'deviceTokens')) {
                $tokens = $notifiable->deviceTokens()->pluck('token')->toArray();
                if (!empty($tokens)) {
                    \App\Services\FcmService::sendNotification(
                        $tokens,
                        'Sistem Absensi Rajasa',
                        $this->message,
                        [],
                        $notifiable
                    );
                } else {
                    // Log failure because no device tokens are registered for this user
                    \App\Models\NotificationLog::create([
                        'user_id' => $notifiable->id ?? null,
                        'title' => 'Sistem Absensi Rajasa',
                        'message' => $this->message,
                        'channel' => 'fcm',
                        'status' => 'failed',
                        'error_message' => 'Siswa tidak memiliki token perangkat (Device Token) yang terdaftar. Pastikan siswa sudah login di aplikasi HP.'
                    ]);
                }
            } else {
                // Notifiable has no deviceTokens relationship capability
                \App\Models\NotificationLog::create([
                    'user_id' => $notifiable->id ?? null,
                    'title' => 'Sistem Absensi Rajasa',
                    'message' => $this->message,
                    'channel' => 'fcm',
                    'status' => 'failed',
                    'error_message' => 'Tipe user tidak mendukung penerimaan device token FCM.'
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('FCM Send in via failed: ' . $e->getMessage());
            try {
                \App\Models\NotificationLog::create([
                    'user_id' => $notifiable->id ?? null,
                    'title' => 'Sistem Absensi Rajasa',
                    'message' => $this->message,
                    'channel' => 'fcm',
                    'status' => 'failed',
                    'error_message' => 'Exception in via method: ' . $e->getMessage()
                ]);
            } catch (\Exception $logEx) {
                // Ignore nested log errors
            }
        }

        \Illuminate\Support\Facades\Log::info('GenericNotification via channels for user #' . ($notifiable->id ?? '?') . ': ' . $this->message);
        return ['database', 'broadcast'];
    }

    public function toDatabase($notifiable)
    {
        return ['message' => $this->message];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage(['message' => $this->message]);
    }
}
