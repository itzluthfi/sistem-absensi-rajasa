<?php

namespace App\Http\Controllers\Api;

use App\Models\NotificationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationLogController extends BaseController
{
    /**
     * Display a listing of notification logs
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $search = $request->input('search');
            $status = $request->input('status');
            $channel = $request->input('channel');

            $query = DB::table('notification_logs as n')
                ->leftJoin('users as u', 'n.user_id', '=', 'u.id')
                ->select(
                    'n.id',
                    'n.user_id',
                    'n.title',
                    'n.message',
                    'n.channel',
                    'n.status',
                    'n.error_message',
                    'n.created_at',
                    'n.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                );

            // Filter search (by recipient name or message)
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('u.name', 'like', "%{$search}%")
                      ->orWhere('n.message', 'like', "%{$search}%")
                      ->orWhere('n.title', 'like', "%{$search}%");
                });
            }

            // Filter by status
            if ($status && $status !== 'all') {
                $query->where('n.status', $status);
            }

            // Filter by channel
            if ($channel && $channel !== 'all') {
                $query->where('n.channel', $channel);
            }

            $paginator = $query->orderBy('n.created_at', 'desc')->paginate($perPage);

            // Mapped to return a structured response with user relations
            $paginator->getCollection()->transform(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->user_id = $item->user_id;
                $mapped->title = $item->title;
                $mapped->message = $item->message;
                $mapped->channel = $item->channel;
                $mapped->status = $item->status;
                $mapped->error_message = $item->error_message;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;

                $mapped->user = null;
                if ($item->user_id) {
                    $mapped->user = new \stdClass();
                    $mapped->user->id = $item->user_id;
                    $mapped->user->name = $item->user_name;
                    $mapped->user->email = $item->user_email;
                    
                    // Fetch user roles
                    $userModel = \App\Models\User::find($item->user_id);
                    $mapped->user->roles = $userModel ? $userModel->roles->pluck('name')->toArray() : [];
                }

                return $mapped;
            });

            return $this->sendResponse($paginator, 'Log notifikasi berhasil dimuat.');
        } catch (\Exception $e) {
            return $this->sendError('Gagal memuat log notifikasi: ' . $e->getMessage());
        }
    }

    /**
     * Clear notification logs with filters (Admin only)
     */
    public function clear(Request $request)
    {
        try {
            $filter = $request->input('filter', 'all');
            $query = DB::table('notification_logs');

            if ($filter === '1_week') {
                // Delete logs older than 1 week
                $query->where('created_at', '<', now()->subWeek());
                $message = 'Log notifikasi berusia lebih dari 1 minggu berhasil dihapus.';
            } elseif ($filter === '1_month') {
                // Delete logs older than 1 month
                $query->where('created_at', '<', now()->subMonth());
                $message = 'Log notifikasi berusia lebih dari 1 bulan berhasil dihapus.';
            } elseif ($filter === 'custom') {
                $startDate = $request->input('start_date');
                $endDate = $request->input('end_date');
                if ($startDate && $endDate) {
                    $query->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
                    $message = "Log notifikasi dari tanggal {$startDate} hingga {$endDate} berhasil dihapus.";
                } else {
                    return $this->sendError('Tanggal mulai dan selesai wajib diisi untuk filter kustom.');
                }
            } else {
                // Delete all logs
                $message = 'Semua log notifikasi berhasil dihapus.';
            }

            $query->delete();
            return $this->sendResponse([], $message);
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus log notifikasi: ' . $e->getMessage());
        }
    }
}
