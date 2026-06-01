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
        // Kirim Push Notification ke Firebase FCM jika ada token terdaftar
        try {
            if (method_exists($notifiable, 'deviceTokens')) {
                $tokens = $notifiable->deviceTokens()->pluck('token')->toArray();
                if (!empty($tokens)) {
                    \App\Services\FcmService::sendNotification(
                        $tokens,
                        'Sistem Absensi Rajasa',
                        $this->message
                    );
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('FCM Send in via failed: ' . $e->getMessage());
        }

        return ['database', 'broadcast', 'log'];
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
