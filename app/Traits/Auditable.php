<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    /**
     * Boot the Auditable trait
     */
    public static function bootAuditable()
    {
        // Automatically log creation
        static::created(function ($model) {
            static::audit(
                AuditLog::ACTION_CREATE,
                "Created " . class_basename($model),
                $model,
                null,
                $model->toArray()
            );
        });

        // Automatically log updates
        static::updated(function ($model) {
            $changes = $model->getChanges();
            $original = [];

            // Get original values that changed
            foreach ($changes as $key => $value) {
                if ($key !== 'updated_at') {
                    $original[$key] = $model->getOriginal($key);
                }
            }

            if (!empty($original)) {
                static::audit(
                    AuditLog::ACTION_UPDATE,
                    "Updated " . class_basename($model) . " #{$model->getKey()}",
                    $model,
                    $original,
                    $changes
                );
            }
        });

        // Automatically log deletion
        static::deleted(function ($model) {
            static::audit(
                AuditLog::ACTION_DELETE,
                "Deleted " . class_basename($model) . " #{$model->getKey()}",
                $model,
                $model->toArray(),
                null
            );
        });
    }

    /**
     * Create an audit log entry
     */
    public static function audit(
        string $action,
        string $description,
        $model = null,
        $oldValues = null,
        $newValues = null
    ) {
        $user = auth()->user();

        return AuditLog::create([
            'user_id' => $user ? $user->id : null,
            'action' => $action,
            'description' => $description,
            'model_type' => $model ? get_class($model) : null,
            'model_id' => $model ? $model->getKey() : null,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);
    }

    /**
     * Log a custom action (not tied to model events)
     */
    public static function logAction(
        string $action,
        string $description,
        $model = null,
        $oldValues = null,
        $newValues = null
    ) {
        return static::audit($action, $description, $model, $oldValues, $newValues);
    }
}