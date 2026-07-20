<?php
 
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasFactory;

    protected $table = 'notification_logs';

    protected $fillable = [
        'user_id',
        'title',
        'message',
        'channel',
        'status',
        'error_message',
    ];

    /**
     * Get the user that was the recipient of this notification
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
