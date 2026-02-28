<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add provider setting and Twilio credentials
        $newSettings = [
            ['key' => 'sms_provider', 'value' => 'twilio', 'description' => 'SMS provider: twilio, semaphore, or globe', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'twilio_account_sid', 'value' => null, 'description' => 'Twilio Account SID', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'twilio_auth_token', 'value' => null, 'description' => 'Twilio Auth Token', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'twilio_phone_number', 'value' => null, 'description' => 'Twilio Phone Number (sender)', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($newSettings as $setting) {
            DB::table('sms_settings')->updateOrInsert(
                ['key' => $setting['key']],
                $setting
            );
        }
    }

    public function down(): void
    {
        DB::table('sms_settings')->whereIn('key', [
            'sms_provider', 'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number',
        ])->delete();
    }
};
