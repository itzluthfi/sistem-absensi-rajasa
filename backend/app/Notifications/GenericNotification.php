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
