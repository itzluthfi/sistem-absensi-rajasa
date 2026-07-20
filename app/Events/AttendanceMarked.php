<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class AttendanceMarked implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $attendance;

    public function __construct($attendance)
    {
        $this->attendance = $attendance;
    }

    public function broadcastOn()
    {
        return new Channel('attendance');
    }

    public function broadcastWith()
    {
        return ['attendance' => $this->attendance];
    }
}
