<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsAudit
{
    /**
     * Log an audit entry.
     *
     * @param string      $action      e.g. 'senior_update', 'account_create'
     * @param string|null $targetType  e.g. 'senior_citizens', 'users'
     * @param int|null    $targetId    ID of the affected record
     * @param string|null $description Human-readable description
     * @param array|null  $oldValues   Previous values (for updates)
     * @param array|null  $newValues   New values (for updates/creates)
     */
    protected function logAudit(
        string  $action,
        ?string $targetType = null,
        ?int    $targetId = null,
        ?string $description = null,
        ?array  $oldValues = null,
        ?array  $newValues = null,
        ?string $targetName = null,
    ): AuditLog {
        return AuditLog::create([
            'user_id'     => Auth::id(),
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'target_name' => $targetName,
            'description' => $description,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'ip_address'  => Request::ip(),
            'created_at'  => now(),
        ]);
    }

    /**
     * Build a change diff between old model values and new values.
     * Only returns fields that actually changed.
     */
    protected function buildChangeDiff($model, array $newValues, array $trackFields = []): array
    {
        $old = [];
        $new = [];

        $fields = !empty($trackFields) ? $trackFields : array_keys($newValues);

        foreach ($fields as $field) {
            if (!array_key_exists($field, $newValues)) continue;

            $oldVal = $model->{$field};
            $newVal = $newValues[$field];

            if ($oldVal != $newVal) {
                $old[$field] = $oldVal;
                $new[$field] = $newVal;
            }
        }

        return ['old' => $old, 'new' => $new, 'changed' => array_keys($old)];
    }
}
