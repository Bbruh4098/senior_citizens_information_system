<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    protected $fillable = [
        'phone_number',
        'message_type',
        'message',
        'status',
        'response_data',
        'error_message',
    ];

    protected $casts = [
        'response_data' => 'array',
    ];

    //Count SMS sent to a phone number within a time window
    public static function countForPhone(string $phone, string $type, int $hours = 1): int
    {
        return static::where('phone_number', $phone)
            ->where('message_type', $type)
            ->where('status', 'sent')
            ->where('created_at', '>=', now()->subHours($hours))
            ->count();
    }

    //Count total SMS sent today
    public static function countToday(): int
    {
        return static::where('status', 'sent')
            ->whereDate('created_at', today())
            ->count();
    }

    //Scope for filtering by type
    public function scopeOfType($query, string $type)
    {
        return $query->where('message_type', $type);
    }

    //Scope for filtering by status
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
