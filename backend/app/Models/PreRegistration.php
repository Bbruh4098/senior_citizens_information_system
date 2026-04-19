<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreRegistration extends Model
{
    protected $fillable = [
        'reference_number',
        'applicant_data',
        'barangay_id',
        'status',
        'fo_reviewed_by',
        'fo_reviewed_at',
        'main_reviewed_by',
        'main_reviewed_at',
        'notes',
        'rejection_reason',
        'application_id',
    ];

    protected $casts = [
        'applicant_data' => 'array',
        'fo_reviewed_at' => 'datetime',
        'main_reviewed_at' => 'datetime',
    ];

    // Status constants
    const STATUS_FOR_VERIFICATION = 'for_verification';
    const STATUS_FOR_APPROVAL = 'for_approval';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Generate a unique reference number
     */
    public static function generateReferenceNumber(): string
    {
        $date = now()->format('Ymd');
        $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        return "PRE-{$date}-{$random}";
    }

    /**
     * Barangay relationship
     */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /**
     * Branch/FO reviewer relationship
     */
    public function foReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fo_reviewed_by');
    }

    /**
     * Main Admin reviewer relationship
     */
    public function mainReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'main_reviewed_by');
    }

    /**
     * Converted application relationship
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Get status label for display
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_FOR_VERIFICATION => 'For Verification',
            self::STATUS_FOR_APPROVAL => 'For Approval',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            default => ucfirst(str_replace('_', ' ', $this->status)),
        };
    }
}
