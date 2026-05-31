<?php
 
namespace App\Http\Controllers\Api;
 
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
 
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
 
            $query = DB::table('audit_logs as a')
                ->leftJoin('users as u', 'a.user_id', '=', 'u.id')
                ->select(
                    'a.id',
                    'a.user_id',
                    'a.action',
                    'a.description',
                    'a.model_type',
                    'a.model_id',
                    'a.old_values',
                    'a.new_values',
                    'a.ip_address',
                    'a.user_agent',
                    'a.created_at',
                    'a.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                );
 
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('a.action', 'like', "%{$search}%")
                      ->orWhere('a.description', 'like', "%{$search}%")
                      ->orWhere('a.ip_address', 'like', "%{$search}%");
                });
            }
 
            // Filter by action type
            if ($request->has('action')) {
                $query->where('a.action', $request->action);
            }
 
            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->whereBetween('a.created_at', [$request->start_date, $request->end_date]);
            }
 
            $paginator = $query->orderBy('a.created_at', 'desc')->paginate($perPage);
 
            $paginator->getCollection()->transform(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->user_id = $item->user_id;
                $mapped->action = $item->action;
                $mapped->description = $item->description;
                $mapped->model_type = $item->model_type;
                $mapped->model_id = $item->model_id;
                $mapped->old_values = $item->old_values ? json_decode($item->old_values) : null;
                $mapped->new_values = $item->new_values ? json_decode($item->new_values) : null;
                $mapped->ip_address = $item->ip_address;
                $mapped->user_agent = $item->user_agent;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;
 
                $mapped->user = null;
                if ($item->user_id) {
                    $mapped->user = new \stdClass();
                    $mapped->user->id = $item->user_id;
                    $mapped->user->name = $item->user_name;
                    $mapped->user->email = $item->user_email;
                }
 
                return $mapped;
            });
 
            return $this->sendResponse($paginator, 'Audit log retrieved successfully');
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
            $log = DB::table('audit_logs as a')
                ->leftJoin('users as u', 'a.user_id', '=', 'u.id')
                ->select(
                    'a.id',
                    'a.user_id',
                    'a.action',
                    'a.description',
                    'a.model_type',
                    'a.model_id',
                    'a.old_values',
                    'a.new_values',
                    'a.ip_address',
                    'a.user_agent',
                    'a.created_at',
                    'a.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                )
                ->where('a.id', $id)
                ->first();
 
            if (!$log) {
                return $this->sendError('Audit log not found', [], 404);
            }
 
            $mapped = new \stdClass();
            $mapped->id = $log->id;
            $mapped->user_id = $log->user_id;
            $mapped->action = $log->action;
            $mapped->description = $log->description;
            $mapped->model_type = $log->model_type;
            $mapped->model_id = $log->model_id;
            $mapped->old_values = $log->old_values ? json_decode($log->old_values) : null;
            $mapped->new_values = $log->new_values ? json_decode($log->new_values) : null;
            $mapped->ip_address = $log->ip_address;
            $mapped->user_agent = $log->user_agent;
            $mapped->created_at = $log->created_at;
            $mapped->updated_at = $log->updated_at;
 
            $mapped->user = null;
            if ($log->user_id) {
                $mapped->user = new \stdClass();
                $mapped->user->id = $log->user_id;
                $mapped->user->name = $log->user_name;
                $mapped->user->email = $log->user_email;
            }
 
            return $this->sendResponse($mapped, 'Audit log retrieved successfully');
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
            $paginator = DB::table('audit_logs as a')
                ->leftJoin('users as u', 'a.user_id', '=', 'u.id')
                ->select(
                    'a.id',
                    'a.user_id',
                    'a.action',
                    'a.description',
                    'a.model_type',
                    'a.model_id',
                    'a.old_values',
                    'a.new_values',
                    'a.ip_address',
                    'a.user_agent',
                    'a.created_at',
                    'a.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                )
                ->where('a.user_id', $userId)
                ->orderBy('a.created_at', 'desc')
                ->paginate($perPage);
 
            $paginator->getCollection()->transform(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->user_id = $item->user_id;
                $mapped->action = $item->action;
                $mapped->description = $item->description;
                $mapped->model_type = $item->model_type;
                $mapped->model_id = $item->model_id;
                $mapped->old_values = $item->old_values ? json_decode($item->old_values) : null;
                $mapped->new_values = $item->new_values ? json_decode($item->new_values) : null;
                $mapped->ip_address = $item->ip_address;
                $mapped->user_agent = $item->user_agent;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;
 
                $mapped->user = null;
                if ($item->user_id) {
                    $mapped->user = new \stdClass();
                    $mapped->user->id = $item->user_id;
                    $mapped->user->name = $item->user_name;
                    $mapped->user->email = $item->user_email;
                }
 
                return $mapped;
            });
 
            return $this->sendResponse($paginator, 'Audit log by user retrieved successfully');
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
            $paginator = DB::table('audit_logs as a')
                ->leftJoin('users as u', 'a.user_id', '=', 'u.id')
                ->select(
                    'a.id',
                    'a.user_id',
                    'a.action',
                    'a.description',
                    'a.model_type',
                    'a.model_id',
                    'a.old_values',
                    'a.new_values',
                    'a.ip_address',
                    'a.user_agent',
                    'a.created_at',
                    'a.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                )
                ->where('a.action', $action)
                ->orderBy('a.created_at', 'desc')
                ->paginate($perPage);
 
            $paginator->getCollection()->transform(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->user_id = $item->user_id;
                $mapped->action = $item->action;
                $mapped->description = $item->description;
                $mapped->model_type = $item->model_type;
                $mapped->model_id = $item->model_id;
                $mapped->old_values = $item->old_values ? json_decode($item->old_values) : null;
                $mapped->new_values = $item->new_values ? json_decode($item->new_values) : null;
                $mapped->ip_address = $item->ip_address;
                $mapped->user_agent = $item->user_agent;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;
 
                $mapped->user = null;
                if ($item->user_id) {
                    $mapped->user = new \stdClass();
                    $mapped->user->id = $item->user_id;
                    $mapped->user->name = $item->user_name;
                    $mapped->user->email = $item->user_email;
                }
 
                return $mapped;
            });
 
            return $this->sendResponse($paginator, 'Audit log by action retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve audit logs');
        }
    }
}