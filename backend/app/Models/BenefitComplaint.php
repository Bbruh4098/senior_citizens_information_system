<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BenefitComplaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'senior_id',
        'benefit_claim_id',
        'category',
        'subject',
        'message',
        'status',
        'admin_response',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    //Get the senior who filed the complaint.

    public function senior()
    {
        return $this->belongsTo(SeniorCitizen::class, 'senior_id');
    }

    // Get the benefit claim this complaint is about (optional).
    public function claim()
    {
        return $this->belongsTo(BenefitClaim::class, 'benefit_claim_id');
    }

    // Get the admin who responded to the complaint.
    public function respondedBy()
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    // Get the status label.
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'open' => 'Open',
            'in_review' => 'In Review',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
            default => ucfirst($this->status),
        };
    }
}
