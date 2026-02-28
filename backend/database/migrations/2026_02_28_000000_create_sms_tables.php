<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SMS Settings (key-value store for Globe Labs config)
        if (!Schema::hasTable('sms_settings')) {
            Schema::create('sms_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->string('description')->nullable();
                $table->timestamps();
            });

            // Seed default settings
            DB::table('sms_settings')->insert([
                ['key' => 'sms_enabled', 'value' => '0', 'description' => 'Enable/disable SMS sending globally', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'globe_app_id', 'value' => null, 'description' => 'Globe Labs App ID', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'globe_app_secret', 'value' => null, 'description' => 'Globe Labs App Secret', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'globe_shortcode', 'value' => null, 'description' => 'Globe Labs Shortcode (last 4 digits)', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'globe_access_token', 'value' => null, 'description' => 'Globe Labs Access Token (from subscriber opt-in)', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'otp_message_template', 'value' => 'Your OSCA Senior Portal OTP is: {otp}. Valid for 10 minutes. Do not share this code.', 'description' => 'OTP SMS message template', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'reference_message_template', 'value' => 'Your OSCA online application has been received! Reference Number: {reference_number}. Use this to track your application status.', 'description' => 'Reference number SMS message template', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'max_otp_per_hour', 'value' => '3', 'description' => 'Max OTP requests per phone number per hour', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'max_otp_per_day', 'value' => '10', 'description' => 'Max OTP requests per phone number per day', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'max_sms_per_day', 'value' => '100', 'description' => 'Max total SMS sends per day (global limit)', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // SMS Logs
        if (!Schema::hasTable('sms_logs')) {
            Schema::create('sms_logs', function (Blueprint $table) {
                $table->id();
                $table->string('phone_number', 20);
                $table->enum('message_type', ['otp', 'reference', 'notification']);
                $table->text('message');
                $table->enum('status', ['sent', 'failed', 'queued'])->default('queued');
                $table->text('response_data')->nullable();
                $table->string('error_message')->nullable();
                $table->timestamps();

                $table->index('phone_number');
                $table->index('message_type');
                $table->index('status');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_settings');
    }
};
