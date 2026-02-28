<?php

namespace App\Http\Controllers;

use App\Models\SeniorAccount;
use App\Models\SeniorCitizen;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class SeniorAuthController extends Controller
{
    /**
     * Register/Request OTP for senior portal
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'osca_id' => 'required|string',
            'phone_number' => 'required|string|min:10|max:15',
        ]);

        // Find senior by OSCA ID
        $senior = SeniorCitizen::where('osca_id', $request->osca_id)->first();

        if (!$senior) {
            return response()->json([
                'message' => 'No senior citizen found with this OSCA ID. Please ensure you are registered with OSCA.',
            ], 404);
        }

        // Get or create account
        $account = SeniorAccount::firstOrCreate(
            ['senior_id' => $senior->id],
            ['phone_number' => $request->phone_number]
        );

        // Check if locked
        if ($account->isLocked()) {
            return response()->json([
                'message' => 'Account is temporarily locked. Please try again after ' . $account->locked_until->diffForHumans(),
            ], 423);
        }

        // Update phone if different
        if ($account->phone_number !== $request->phone_number) {
            $account->update(['phone_number' => $request->phone_number]);
        }

        // Check SMS rate limits
        $smsService = new SmsService();
        $rateCheck = $smsService->checkOtpRateLimit($request->phone_number);
        if (!$rateCheck['allowed']) {
            return response()->json([
                'message' => $rateCheck['message'],
                'retry_after' => $rateCheck['retry_after'] ?? 60,
            ], 429);
        }

        // Generate OTP
        $otp = $account->generateOtp();

        // Send OTP via SMS
        $smsResult = $smsService->sendOtp($request->phone_number, $otp);

        return response()->json([
            'message' => $smsResult['success']
                ? 'OTP sent to your registered phone number'
                : 'OTP generated. ' . ($smsResult['message'] ?? 'SMS delivery may be delayed.'),
            'senior_id' => $senior->id,
            'expires_in' => 600, // 10 minutes
            'sms_sent' => $smsResult['success'],
            // Show OTP in dev mode OR when SMS failed (so login still works)
            'dev_otp' => (config('app.debug') || !$smsResult['success']) ? $otp : null,
        ]);
    }

    /**
     * Verify OTP and create account (set PIN)
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'senior_id' => 'required|integer',
            'otp' => 'required|string|size:6',
            'pin' => 'nullable|string|size:6',
        ]);

        $account = SeniorAccount::where('senior_id', $request->senior_id)->first();

        if (!$account) {
            return response()->json(['message' => 'Account not found'], 404);
        }

        if ($account->isLocked()) {
            return response()->json(['message' => 'Account is locked'], 423);
        }

        if (!$account->verifyOtp($request->otp)) {
            $account->incrementFailedAttempts();
            return response()->json([
                'message' => 'Invalid or expired OTP',
                'attempts_remaining' => max(0, 5 - $account->failed_attempts),
            ], 401);
        }

        // Set PIN if provided (first time setup)
        if ($request->filled('pin')) {
            $account->update([
                'pin_hash' => Hash::make($request->pin),
            ]);
        }

        // Reset failed attempts
        $account->unlock();

        // Generate token
        $token = $account->senior_id . '-' . bin2hex(random_bytes(32));

        $account->update(['last_login' => now()]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'senior' => [
                'id' => $account->senior->id,
                'osca_id' => $account->senior->osca_id,
                'name' => $account->senior->first_name . ' ' . $account->senior->last_name,
                'barangay_id' => $account->senior->barangay_id,
                'barangay' => $account->senior->barangay?->name,
            ],
            'needs_pin_setup' => empty($account->pin_hash),
        ]);
    }

    /**
     * Login with PIN (for returning users)
     */
    public function loginWithPin(Request $request): JsonResponse
    {
        $request->validate([
            'osca_id' => 'required|string',
            'pin' => 'required|string|size:6',
        ]);

        $senior = SeniorCitizen::where('osca_id', $request->osca_id)->first();

        if (!$senior) {
            return response()->json(['message' => 'Invalid OSCA ID'], 404);
        }

        $account = SeniorAccount::where('senior_id', $senior->id)->first();

        if (!$account || !$account->is_verified) {
            return response()->json([
                'message' => 'Account not set up. Please use OTP login first.',
                'requires_otp' => true,
            ], 401);
        }

        if ($account->isLocked()) {
            return response()->json([
                'message' => 'Account is temporarily locked',
                'locked_until' => $account->locked_until,
            ], 423);
        }

        if (!Hash::check($request->pin, $account->pin_hash)) {
            $account->incrementFailedAttempts();
            return response()->json([
                'message' => 'Invalid PIN',
                'attempts_remaining' => max(0, 5 - $account->failed_attempts),
            ], 401);
        }

        // Success - reset and login
        $account->unlock();
        $token = $account->senior_id . '-' . bin2hex(random_bytes(32));
        $account->update(['last_login' => now()]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'senior' => [
                'id' => $senior->id,
                'osca_id' => $senior->osca_id,
                'name' => $senior->first_name . ' ' . $senior->last_name,
                'barangay_id' => $senior->barangay_id,
                'barangay' => $senior->barangay?->name,
            ],
        ]);
    }

    /**
     * Get senior profile
     */
    public function profile(Request $request): JsonResponse
    {
        // In production, validate token from header
        $seniorId = $request->input('senior_id');
        
        $senior = SeniorCitizen::with('barangay')->find($seniorId);

        if (!$senior) {
            return response()->json(['message' => 'Senior not found'], 404);
        }

        return response()->json([
            'data' => [
                'id' => $senior->id,
                'osca_id' => $senior->osca_id,
                'first_name' => $senior->first_name,
                'middle_name' => $senior->middle_name,
                'last_name' => $senior->last_name,
                'birthdate' => $senior->birthdate,
                'age' => $senior->age,
                'sex' => $senior->sex,
                'civil_status' => $senior->civil_status,
                'barangay' => $senior->barangay?->name,
                'address' => $senior->address,
                'contact_number' => $senior->contact_number,
                'photo' => $senior->photo_path,
            ],
        ]);
    }

    /**
     * Get senior benefits (claims and eligibility)
     */
    public function benefits(Request $request): JsonResponse
    {
        $seniorId = $request->input('senior_id');
        
        $senior = SeniorCitizen::with(['benefitClaims.benefitType'])->find($seniorId);

        if (!$senior) {
            return response()->json(['message' => 'Senior not found'], 404);
        }

        // Get all benefit types (exclude sexagenarian and septuagenarian)
        $benefitTypes = \App\Models\BenefitType::active()
            ->whereNotIn('name', ['Sexagenarian', 'Septuagenarian'])
            ->orderBy('min_age')
            ->get();
        
        // Calculate age
        $age = $senior->age;

        // Build eligibility info
        $eligibility = [];
        foreach ($benefitTypes as $type) {
            $isEligible = $type->isEligibleForAge($age);
            
            // Check if already claimed
            $claim = $senior->benefitClaims
                ->where('benefit_type_id', $type->id)
                ->whereIn('status', ['pending', 'approved', 'released'])
                ->first();
            
            $eligibility[] = [
                'benefit_type_id' => $type->id,
                'name' => $type->name,
                'description' => $type->description,
                'age_range' => $type->age_range,
                'amount' => $type->amount,
                'formatted_amount' => $type->formatted_amount,
                'is_eligible' => $isEligible,
                'has_claimed' => $claim !== null,
                'claim_status' => $claim?->status,
            ];
        }

        // Get claim history
        $claims = $senior->benefitClaims->map(function ($claim) {
            return [
                'id' => $claim->id,
                'benefit_type' => $claim->benefitType->name,
                'amount' => $claim->amount,
                'claim_year' => $claim->claim_year,
                'status' => $claim->status,
                'released_at' => $claim->released_at?->format('Y-m-d'),
                'created_at' => $claim->created_at->format('Y-m-d'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'senior_name' => $senior->full_name,
                'age' => $age,
                'eligibility' => $eligibility,
                'claims' => $claims,
            ],
        ]);
    }

    /**
     * Get senior dashboard stats (for quick stats cards)
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $seniorId = $request->input('senior_id');
        
        $senior = SeniorCitizen::with(['benefitClaims'])->find($seniorId);

        if (!$senior) {
            return response()->json(['message' => 'Senior not found'], 404);
        }

        $age = $senior->age;
        
        // Get benefit types (exclude sexa/septua)
        $benefitTypes = \App\Models\BenefitType::active()
            ->whereNotIn('name', ['Sexagenarian', 'Septuagenarian'])
            ->get();
        
        $totalBenefits = $benefitTypes->count();
        $eligibleBenefits = 0;
        
        foreach ($benefitTypes as $type) {
            if ($type->isEligibleForAge($age)) {
                $eligibleBenefits++;
            }
        }

        // Count announcements (for the senior's barangay)
        $announcements = \App\Models\Announcement::where('is_published', true)
            ->where(function ($q) use ($senior) {
                $q->whereNull('barangay_id')
                    ->orWhere('barangay_id', $senior->barangay_id);
            })
            ->count();

        // Count complaints
        $complaints = \App\Models\Complaint::where('complainant_id', $seniorId)->count();

        return response()->json([
            'data' => [
                'id_status' => $senior->is_active ? 'Active' : 'Inactive',
                'eligible_benefits' => $eligibleBenefits,
                'total_benefits' => $totalBenefits,
                'announcements' => $announcements,
                'complaints' => $complaints,
            ],
        ]);
    }
}
