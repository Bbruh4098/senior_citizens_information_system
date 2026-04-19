<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeniorAccount extends Model
{
    protected $fillable = [
        'senior_id',
        'phone_number',
        'pin_hash',
        'otp_code',
        'otp_expires_at',
        'is_verified',
        'last_login',
        'failed_attempts',
        'locked_until',
    ];

    protected $casts = [
        'otp_expires_at' => 'datetime',
        'last_login' => 'datetime',
        'locked_until' => 'datetime',
        'is_verified' => 'boolean',
    ];

    protected $hidden = [
        'pin_hash',
        'otp_code',
    ];

    /**
     * Related senior citizen
     */
    public function senior(): BelongsTo
    {
        return $this->belongsTo(SeniorCitizen::class, 'senior_id');
    }

    /**
     * Check if account is locked
     */
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Lock account for a duration
     */
    public function lock(int $minutes = 30): void
    {
        $this->update([
            'locked_until' => now()->addMinutes($minutes),
        ]);
    }

    /**
     * Unlock account
     */
    public function unlock(): void
    {
        $this->update([
            'locked_until' => null,
            'failed_attempts' => 0,
        ]);
    }

    /**
     * Increment failed attempts
     */
    public function incrementFailedAttempts(): void
    {
        $this->increment('failed_attempts');
        
        // Lock after 5 failed attempts
        if ($this->failed_attempts >= 5) {
            $this->lock();
        }
    }

    /**
     * Generate OTP
     */
    public function generateOtp(): string
    {
        $otp = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $this->update([
            'otp_code' => $otp,
            'otp_expires_at' => now()->addMinutes(5),
        ]);
        return $otp;
    }

    /**
     * Verify OTP
     */
    public function verifyOtp(string $code): bool
    {
        if ($this->otp_code === $code && $this->otp_expires_at?->isFuture()) {
            $this->update([
                'otp_code' => null,
                'otp_expires_at' => null,
                'is_verified' => true,
            ]);
            return true;
        }
        return false;
    }
}
