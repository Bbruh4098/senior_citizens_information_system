<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SmsSetting extends Model
{
    protected $fillable = ['key', 'value', 'description'];

    //Get a setting value by key
    public static function getValue(string $key, $default = null): ?string
    {
        return Cache::remember("sms_setting_{$key}", 300, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    //Set a setting value by key
    public static function setValue(string $key, ?string $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
        Cache::forget("sms_setting_{$key}");
    }

    //Get all settings as key-value array
    public static function getAllSettings(): array
    {
        return static::pluck('value', 'key')->toArray();
    }

    //Check if SMS is enabled
    public static function isEnabled(): bool
    {
        return static::getValue('sms_enabled') === '1';
    }

    //Check if SMS provider is properly configured
    public static function isConfigured(): bool
    {
        $provider = static::getValue('sms_provider', 'twilio');

        return match ($provider) {
            'twilio' => !empty(static::getValue('twilio_account_sid'))
                && !empty(static::getValue('twilio_auth_token'))
                && !empty(static::getValue('twilio_phone_number')),
            'semaphore' => !empty(static::getValue('semaphore_api_key')),
            'unisms' => !empty(static::getValue('unisms_api_key')),
            default => false,
        };
    }
}
