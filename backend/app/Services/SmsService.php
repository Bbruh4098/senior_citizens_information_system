<?php

namespace App\Services;

use App\Models\SmsSetting;
use App\Models\SmsLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    //Send an SMS message via the configured provider
    public function sendSms(string $phoneNumber, string $message, string $type = 'notification'): array
    {
        $phoneNumber = $this->formatPhoneNumber($phoneNumber);

        // Create log entry
        $log = SmsLog::create([
            'phone_number' => $phoneNumber,
            'message_type' => $type,
            'message' => $message,
            'status' => 'queued',
        ]);

        // Check if SMS is enabled
        if (!SmsSetting::isEnabled()) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'SMS is disabled globally',
            ]);
            return [
                'success' => false,
                'reason' => 'sms_disabled',
                'message' => 'SMS sending is disabled. Enable it in Admin → SMS Settings.',
            ];
        }

        // Check if configured
        if (!SmsSetting::isConfigured()) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'SMS provider not configured',
            ]);
            return [
                'success' => false,
                'reason' => 'not_configured',
                'message' => 'SMS provider is not configured. Set your credentials in Admin → SMS Settings.',
            ];
        }

        // Check daily limit
        $maxPerDay = (int) SmsSetting::getValue('max_sms_per_day', '100');
        if (SmsLog::countToday() >= $maxPerDay) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'Daily SMS limit reached',
            ]);
            return [
                'success' => false,
                'reason' => 'daily_limit',
                'message' => 'Daily SMS limit reached.',
            ];
        }

        // Send via configured provider
        $provider = SmsSetting::getValue('sms_provider', 'twilio');

        try {
            $result = match ($provider) {
                'twilio' => $this->sendViaTwilio($phoneNumber, $message),
                'semaphore' => $this->sendViaSemaphore($phoneNumber, $message),
                'unisms' => $this->sendViaUniSms($phoneNumber, $message),
                default => ['success' => false, 'error' => "Unknown provider: {$provider}"],
            };

            if ($result['success']) {
                $log->update([
                    'status' => 'sent',
                    'response_data' => json_encode($result['response'] ?? null),
                ]);
                return ['success' => true, 'message' => 'SMS sent successfully'];
            }

            $log->update([
                'status' => 'failed',
                'response_data' => json_encode($result['response'] ?? null),
                'error_message' => $result['error'] ?? 'Unknown error',
            ]);

            Log::error('SMS send failed', [
                'provider' => $provider,
                'phone' => $phoneNumber,
                'error' => $result['error'] ?? 'Unknown',
            ]);

            return [
                'success' => false,
                'reason' => 'api_error',
                'message' => 'SMS sending failed: ' . ($result['error'] ?? 'Unknown error'),
            ];
        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('SMS exception', [
                'provider' => $provider,
                'phone' => $phoneNumber,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'reason' => 'exception',
                'message' => 'SMS service error: ' . $e->getMessage(),
            ];
        }
    }

    //Send via Twilio
    private function sendViaTwilio(string $phoneNumber, string $message): array
    {
        $accountSid = SmsSetting::getValue('twilio_account_sid');
        $authToken = SmsSetting::getValue('twilio_auth_token');
        $fromNumber = SmsSetting::getValue('twilio_phone_number');

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->asForm()
            ->post(
                "https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json",
                [
                    'To' => $this->toE164($phoneNumber),
                    'From' => $fromNumber,
                    'Body' => $message,
                ]
            );

        $data = $response->json();

        if ($response->successful() && isset($data['sid'])) {
            return ['success' => true, 'response' => $data];
        }

        return [
            'success' => false,
            'error' => $data['message'] ?? $response->body(),
            'response' => $data,
        ];
    }

    //Send via Semaphore
    private function sendViaSemaphore(string $phoneNumber, string $message): array
    {
        $apiKey = SmsSetting::getValue('semaphore_api_key');
        $senderName = SmsSetting::getValue('semaphore_sender_name', 'SEMAPHORE');

        $response = Http::post('https://api.semaphore.co/api/v4/messages', [
            'apikey' => $apiKey,
            'number' => $phoneNumber,
            'message' => $message,
            'sendername' => $senderName,
        ]);

        $data = $response->json();

        if ($response->successful() && isset($data[0]['message_id'])) {
            return ['success' => true, 'response' => $data];
        }

        return [
            'success' => false,
            'error' => is_array($data) && isset($data[0]) ? json_encode($data[0]) : ($data['message'] ?? $response->body()),
            'response' => $data,
        ];
    }

    //Send via UniSMS
    private function sendViaUniSms(string $phoneNumber, string $message): array
    {
        $apiKey = SmsSetting::getValue('unisms_api_key');

        $response = Http::withBasicAuth($apiKey, '')
            ->post('https://unismsapi.com/api/sms', [
                'recipient' => $this->toE164($phoneNumber),
                'content' => $message,
            ]);

        $data = $response->json();

        if ($response->successful() && isset($data['message']['reference_id'])) {
            return ['success' => true, 'response' => $data];
        }

        return [
            'success' => false,
            'error' => $data['error'] ?? $data['message'] ?? $response->body(),
            'response' => $data,
        ];
    }

    //Send OTP via SMS
    public function sendOtp(string $phoneNumber, string $otp): array
    {
        $template = SmsSetting::getValue(
            'otp_message_template',
            'Your OSCA Senior Portal OTP is: {otp}. Valid for 5 minutes. Do not share this code.'
        );
        $message = str_replace('{otp}', $otp, $template);

        return $this->sendSms($phoneNumber, $message, 'otp');
    }

    //Send reference number via SMS
    public function sendReferenceNumber(string $phoneNumber, string $referenceNumber): array
    {
        $template = SmsSetting::getValue(
            'reference_message_template',
            'Your OSCA online application has been received! Reference Number: {reference_number}. Use this to track your application status.'
        );
        $message = str_replace('{reference_number}', $referenceNumber, $template);

        return $this->sendSms($phoneNumber, $message, 'reference');
    }

    //Check OTP rate limits for a phone number
    public function checkOtpRateLimit(string $phoneNumber): array
    {
        $phoneNumber = $this->formatPhoneNumber($phoneNumber);
        $maxPerHour = (int) SmsSetting::getValue('max_otp_per_hour', '3');
        $maxPerDay = (int) SmsSetting::getValue('max_otp_per_day', '10');

        $hourlyCount = SmsLog::countForPhone($phoneNumber, 'otp', 1);
        $dailyCount = SmsLog::countForPhone($phoneNumber, 'otp', 24);

        if ($hourlyCount >= $maxPerHour) {
            return [
                'allowed' => false,
                'message' => 'Too many OTP requests. Please try again later.',
                'retry_after' => 3600,
            ];
        }

        if ($dailyCount >= $maxPerDay) {
            return [
                'allowed' => false,
                'message' => 'Daily OTP limit reached. Please try again tomorrow.',
                'retry_after' => 86400,
            ];
        }

        return ['allowed' => true, 'remaining_hourly' => $maxPerHour - $hourlyCount];
    }

    //Normalize phone number to 09XX format
    private function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9+]/', '', $phone);

        // Convert +639XX to 09XX
        if (str_starts_with($phone, '+63') && strlen($phone) === 13) {
            $phone = '0' . substr($phone, 3);
        }

        // Convert 639XX to 09XX
        if (str_starts_with($phone, '63') && strlen($phone) === 12) {
            $phone = '0' . substr($phone, 2);
        }

        return $phone;
    }

    //Convert to E.164 format (+639XXXXXXXXX) for Twilio
    private function toE164(string $phone): string
    {
        $phone = $this->formatPhoneNumber($phone);

        if (str_starts_with($phone, '0')) {
            return '+63' . substr($phone, 1);
        }

        if (!str_starts_with($phone, '+')) {
            return '+' . $phone;
        }

        return $phone;
    }
}
