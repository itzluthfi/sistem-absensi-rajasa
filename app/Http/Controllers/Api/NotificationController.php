<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use App\Notifications\GenericNotification;
use Illuminate\Support\Facades\DB;

class NotificationController extends BaseController
{
    /**
     * Get all notifications for the authenticated user
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $notifications = $user->notifications()
                ->latest()
                ->take(50)
                ->get()
                ->map(function ($notif) {
                    return [
                        'id'         => $notif->id,
                        'message'    => $notif->data['message'] ?? '',
                        'read_at'    => $notif->read_at,
                        'is_read'    => !is_null($notif->read_at),
                        'created_at' => $notif->created_at,
                    ];
                });

            $unread_count = $user->unreadNotifications()->count();

            return $this->sendResponse([
                'notifications' => $notifications,
                'unread_count'  => $unread_count,
            ]);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil notifikasi: ' . $e->getMessage());
        }
    }

    /**
     * Mark a specific notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $user = $request->user();
            $notification = $user->notifications()->where('id', $id)->first();
            if (!$notification) {
                return $this->sendError('Notifikasi tidak ditemukan.', [], 404);
            }
            $notification->markAsRead();
            return $this->sendResponse([], 'Notifikasi ditandai sebagai telah dibaca.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menandai notifikasi: ' . $e->getMessage());
        }
    }

    /**
     * Mark all notifications as read for the authenticated user
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = $request->user();
            $user->unreadNotifications->markAsRead();
            return $this->sendResponse([], 'Semua notifikasi telah ditandai dibaca.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menandai semua notifikasi: ' . $e->getMessage());
        }
    }

    /**
     * Send a test notification (admin only)
     */
    public function sendTest(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'message' => 'required|string',
        ]);
        try {
            $user = User::find($request->user_id);
            Notification::send($user, new GenericNotification($request->message));
            return $this->sendResponse([], 'Notifikasi dikirim');
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengirim notifikasi: ' . $e->getMessage());
        }
    }

    /**
     * Broadcast notification to all users or a specific role (admin only)
     */
    public function broadcast(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'role'    => 'nullable|string',
        ]);
        try {
            $query = User::query();
            if ($request->filled('role')) {
                $query->whereHas('roles', function ($q) use ($request) {
                    $q->where('name', $request->role);
                });
            }
            $users = $query->get();
            Notification::send($users, new GenericNotification($request->message));
            return $this->sendResponse([], "Notifikasi berhasil dikirim ke {$users->count()} pengguna.");
        } catch (\Exception $e) {
            return $this->sendError('Gagal broadcast notifikasi: ' . $e->getMessage());
        }
    }
}
