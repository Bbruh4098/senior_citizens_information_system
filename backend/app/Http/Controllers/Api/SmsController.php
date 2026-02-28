<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsSetting;
use App\Models\SmsLog;
use App\Services\SmsService;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SmsController extends Controller
{
    use LogsAudit;

    //Get SMS settings for admin panel
    public function getSettings(Request $request): JsonResponse
    {
        $settings = SmsSetting::getAllSettings();

        // Mask sensitive values
        $masked = $settings;
        if (!empty($masked['globe_app_secret'])) {
            $masked['globe_app_secret'] = str_repeat('•', 8) . substr($masked['globe_app_secret'], -4);
        }
        if (!empty($masked['globe_access_token'])) {
            $masked['globe_access_token'] = str_repeat('•', 8) . substr($masked['globe_access_token'], -4);
        }
        if (!empty($masked['twilio_auth_token'])) {
            $masked['twilio_auth_token'] = str_repeat('•', 8) . substr($masked['twilio_auth_token'], -4);
        }
        if (!empty($masked['semaphore_api_key'])) {
            $masked['semaphore_api_key'] = str_repeat('•', 8) . substr($masked['semaphore_api_key'], -4);
        }

        // Add status info
        $masked['is_configured'] = SmsSetting::isConfigured();
        $masked['is_enabled'] = SmsSetting::isEnabled();

        return response()->json([
            'success' => true,
            'data' => $masked,
        ]);
    }

    //Update SMS settings
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        $allowedKeys = [
            'sms_enabled',
            'sms_provider',
            'twilio_account_sid',
            'twilio_auth_token',
            'twilio_phone_number',
            'semaphore_api_key',
            'globe_app_id',
            'globe_app_secret',
            'globe_shortcode',
            'globe_access_token',
            'otp_message_template',
            'reference_message_template',
            'max_otp_per_hour',
            'max_otp_per_day',
            'max_sms_per_day',
        ];

        $updated = [];
        foreach ($request->settings as $key => $value) {
            if (in_array($key, $allowedKeys)) {
                // Don't update masked values
                if (in_array($key, ['globe_app_secret', 'globe_access_token', 'twilio_auth_token', 'semaphore_api_key']) && str_contains($value, '•')) {
                    continue;
                }
                SmsSetting::setValue($key, $value);
                $updated[] = $key;
            }
        }

        $this->logAudit(
            'update',
            'sms_settings',
            null,
            'Updated SMS settings: ' . implode(', ', $updated),
            null,
            null,
            $request->user()->full_name
        );

        return response()->json([
            'success' => true,
            'message' => 'SMS settings updated successfully',
            'updated' => $updated,
        ]);
    }

    //Get SMS logs with filters
    public function getLogs(Request $request): JsonResponse
    {
        $query = SmsLog::query()->orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('message_type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('phone')) {
            $query->where('phone_number', 'like', '%' . $request->phone . '%');
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    //Get SMS statistics
    public function getStats(Request $request): JsonResponse
    {
        $today = SmsLog::whereDate('created_at', today());
        $thisMonth = SmsLog::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year);

        return response()->json([
            'success' => true,
            'data' => [
                'today' => [
                    'total' => (clone $today)->count(),
                    'sent' => (clone $today)->where('status', 'sent')->count(),
                    'failed' => (clone $today)->where('status', 'failed')->count(),
                    'otp' => (clone $today)->where('message_type', 'otp')->count(),
                    'reference' => (clone $today)->where('message_type', 'reference')->count(),
                ],
                'this_month' => [
                    'total' => (clone $thisMonth)->count(),
                    'sent' => (clone $thisMonth)->where('status', 'sent')->count(),
                    'failed' => (clone $thisMonth)->where('status', 'failed')->count(),
                ],
                'daily_limit' => (int) SmsSetting::getValue('max_sms_per_day', '100'),
                'daily_remaining' => max(0, (int) SmsSetting::getValue('max_sms_per_day', '100') - SmsLog::countToday()),
                'is_enabled' => SmsSetting::isEnabled(),
                'is_configured' => SmsSetting::isConfigured(),
            ],
        ]);
    }

    //Send a test SMS
    public function sendTest(Request $request): JsonResponse
    {
        $request->validate([
            'phone_number' => 'required|string|min:10|max:15',
        ]);

        $smsService = new SmsService();
        $result = $smsService->sendSms(
            $request->phone_number,
            'This is a test SMS from OSCA Senior Citizens Information System.',
            'notification'
        );

        $this->logAudit(
            'test_sms',
            'sms_settings',
            null,
            "Test SMS sent to {$request->phone_number}: " . ($result['success'] ? 'Success' : $result['message']),
            null,
            null,
            $request->user()->full_name
        );

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Test SMS sent successfully' : $result['message'],
        ]);
    }
}
