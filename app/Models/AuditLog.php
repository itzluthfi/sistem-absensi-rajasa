<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id',
        'action',
        'description',
        'model_type',
        'model_id',
        'ip_address',
        'user_agent',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    /**
     * Action constants
     */
    const ACTION_CREATE = 'create';
    const ACTION_READ = 'read';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';
    const ACTION_LOGIN = 'login';
    const ACTION_LOGOUT = 'logout';
    const ACTION_EXPORT = 'export';
    const ACTION_APPROVE = 'approve';
    const ACTION_REJECT = 'reject';

    /**
     * Get the user that owns the audit log
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the model that was affected
     */
    public function auditable()
    {
        return $this->morphTo();
    }

    /**
     * Scope for filtering by action
     */
    public function scopeAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope for filtering by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for filtering by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope for filtering by model type
     */
    public function scopeModelType($query, $modelType)
    {
        return $query->where('model_type', $modelType);
    }
}