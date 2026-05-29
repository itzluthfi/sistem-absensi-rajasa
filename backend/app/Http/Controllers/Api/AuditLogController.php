<?php

namespace App\Http\Controllers\Api;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends BaseController
{
    /**
     * Display a listing of audit logs
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $search = $request->input('search');

            $query = AuditLog::with('user')->orderBy('created_at', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('ip_address', 'like', "%{$search}%");
                });
            }

            // Filter by action type
            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
            }

            $logs = $query->paginate($perPage);

            return $this->sendResponse($logs, 'Audit log retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve audit logs: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified audit log
     */
    public function show($id)
    {
        try {
            $log = AuditLog::with('user')->findOrFail($id);
            return $this->sendResponse($log, 'Audit log retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Audit log not found', [], 404);
        }
    }

    /**
     * Get audit logs by user
     */
    public function byUser(Request $request, $userId)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $logs = AuditLog::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return $this->sendResponse($logs, 'Audit log by user retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve audit logs');
        }
    }

    /**
     * Get audit logs by action type
     */
    public function byAction(Request $request, $action)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $logs = AuditLog::where('action', $action)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return $this->sendResponse($logs, 'Audit log by action retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve audit logs');
        }
    }
}