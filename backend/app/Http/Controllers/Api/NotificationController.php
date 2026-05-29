<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use App\Notifications\GenericNotification;

class NotificationController extends Controller
{
    public function sendTest(Request $request)
    {
        $request->validate(['user_id' => 'required|exists:users,id', 'message' => 'required|string']);
        try {
            $user = User::find($request->user_id);
            Notification::send($user, new GenericNotification($request->message));
            return (new BaseController)->sendResponse([], 'Notifikasi dikirim');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengirim notifikasi.');
        }
    }
}
