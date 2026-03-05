<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id',
        'action',
        'target_type',
        'target_id',
        'target_name',
        'old_values',
        'new_values',
        'ip_address',
        'description',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // ─── Scopes ───────────────────────────────────────

    public function scopeForTarget($query, $type, $id = null)
    {
        $query->where('target_type', $type);
        if ($id) {
            $query->where('target_id', $id);
        }
        return $query;
    }

    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeDateRange($query, $from, $to)
    {
        if ($from) $query->where('created_at', '>=', $from);
        if ($to) $query->where('created_at', '<=', $to . ' 23:59:59');
        return $query;
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('action', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhereHas('user', function ($uq) use ($search) {
                  $uq->where('first_name', 'like', "%{$search}%")
                     ->orWhere('last_name', 'like', "%{$search}%")
                     ->orWhere('username', 'like', "%{$search}%");
              });
        });
    }

    // ─── Helpers ──────────────────────────────────────


    public function getActionLabelAttribute(): string
    {
        $labels = [
            'login'                 => 'Logged In',
            'logout'                => 'Logged Out',
            'account_create'        => 'Account Created',
            'account_update'        => 'Account Updated',
            'account_delete'        => 'Account Deleted',
            'account_toggle_status' => 'Account Status Toggled',
            'account_reset_password'=> 'Password Reset',
            'senior_update'         => 'Senior Updated',
            'senior_mark_deceased'  => 'Marked Deceased',
            'senior_deactivated'    => 'Senior Deactivated',
            'senior_activated'      => 'Senior Activated',
            'senior_transfer'       => 'Senior Transferred',
            'senior_name_change'    => 'Name Changed',
            'senior_personal_info'  => 'Personal Info Updated',
            'senior_address_update' => 'Address Updated',
            'senior_archive'        => 'Senior Archived',
            'registration_submit'   => 'Registration Submitted',
            'registration_approve'  => 'Registration Approved',
            'registration_reject'   => 'Registration Rejected',
            'benefit_create'        => 'Benefit Created',
            'benefit_update'        => 'Benefit Updated',
            'benefit_claim'         => 'Claim Created',
            'claim_approved'        => 'Claim Approved',
            'claim_rejected'        => 'Claim Rejected',
            'claim_released'        => 'Claim Released',
            'complaint_create'      => 'Complaint Filed',
            'complaint_in_review'   => 'Complaint In Review',
            'complaint_resolved'    => 'Complaint Resolved',
            'complaint_closed'      => 'Complaint Closed',
            'announcement_create'   => 'Announcement Created',
            'announcement_update'   => 'Announcement Updated',
            'announcement_publish'  => 'Announcement Published',
            'announcement_delete'   => 'Announcement Deleted',
            'branch_create'         => 'Field Office Created',
            'branch_delete'         => 'Field Office Deleted',
            'barangay_assign'       => 'Barangay Assigned',
            'barangay_bulk_assign'  => 'Barangays Bulk Assigned',
            'prereg_fo_verified'    => 'Pre-Reg FO Verified',
            'prereg_fo_rejected'    => 'Pre-Reg FO Rejected',
            'prereg_approved'       => 'Pre-Reg Approved',
            'prereg_rejected'       => 'Pre-Reg Rejected',
            'dropdown_create'       => 'Dropdown Option Created',
            'dropdown_update'       => 'Dropdown Option Updated',
            'dropdown_enabled'      => 'Dropdown Option Enabled',
            'dropdown_disabled'     => 'Dropdown Option Disabled',
        ];

        return $labels[$this->action] ?? ucwords(str_replace('_', ' ', $this->action));
    }
}
