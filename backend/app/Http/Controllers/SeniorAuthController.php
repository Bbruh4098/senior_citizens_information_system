<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\SeniorAccount;
use App\Models\SeniorCitizen;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SeniorAuthController extends Controller
{
    /**
     * Request OTP for sign up or forgot PIN
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'osca_id' => 'required|string',
            'otp_channel' => 'required|in:phone,email',
            'turnstile_token' => 'nullable|string',
        ]);

        // Verify Turnstile CAPTCHA (skip if no secret configured or if resending)
        if (!$request->boolean('skip_turnstile') && config('services.turnstile.secret')) {
            $token = $request->input('turnstile_token');
            if (!$token) {
                return response()->json([
                    'message' => 'Please complete the verification check.',
                ], 422);
            }

            $verified = $this->verifyTurnstile($token, $request->ip());
            if (!$verified) {
                return response()->json([
                    'message' => 'Verification failed. Please try again.',
                ], 422);
            }
        }

        // Find senior by OSCA ID (with contact for email/phone lookup)
        $senior = SeniorCitizen::with('contact')->where('osca_id', $request->osca_id)->first();

        if (!$senior) {
            return response()->json([
                'message' => 'No senior citizen found with this OSCA ID. Please ensure you are registered with OSCA.',
            ], 404);
        }

        $otpChannel = $request->input('otp_channel', 'phone');

        // Validate chosen channel has contact info on file
        if ($otpChannel === 'email') {
            $seniorEmail = $senior->contact?->email;
            if (!$seniorEmail) {
                return response()->json([
                    'message' => 'No email address found on your file. Please use phone number instead, or contact OSCA to update your records.',
                ], 422);
            }
        } else {
            $seniorPhone = $senior->contact?->mobile_number;
            if (!$seniorPhone) {
                return response()->json([
                    'message' => 'No phone number found on your file. Please use email instead, or contact OSCA to update your records.',
                ], 422);
            }
        }

        // Get or create account (use contact's phone number)
        $phoneNumber = $senior->contact?->mobile_number ?? '0000000000';
        $account = SeniorAccount::firstOrCreate(
            ['senior_id' => $senior->id],
            ['phone_number' => $phoneNumber]
        );

        // Check if locked
        if ($account->isLocked()) {
            return response()->json([
                'message' => 'Account is temporarily locked. Please try again after ' . $account->locked_until->diffForHumans(),
            ], 423);
        }

        // Check rate limits (using phone number for tracking)
        $smsService = new SmsService();
        $trackingNumber = $account->phone_number;
        $rateCheck = $smsService->checkOtpRateLimit($trackingNumber);
        if (!$rateCheck['allowed']) {
            return response()->json([
                'message' => $rateCheck['message'],
                'retry_after' => $rateCheck['retry_after'] ?? 60,
            ], 429);
        }

        // Generate OTP
        $otp = $account->generateOtp();

        // Send OTP via the chosen channel
        $responseData = [
            'senior_id' => $senior->id,
            'expires_in' => 300,
        ];

        if ($otpChannel === 'email') {
            $seniorEmail = $senior->contact->email;
            try {
                Mail::to($seniorEmail)->send(new OtpMail(
                    $otp,
                    $senior->full_name,
                    5
                ));
                $maskedEmail = $this->maskEmail($seniorEmail);
                $responseData['message'] = "OTP sent to your email at {$maskedEmail}";
                Log::info('OTP email sent', ['senior_id' => $senior->id, 'email' => $maskedEmail]);
            } catch (\Exception $e) {
                Log::error('OTP email failed', [
                    'senior_id' => $senior->id,
                    'error' => $e->getMessage(),
                ]);
                return response()->json([
                    'message' => 'Failed to send OTP email. Please try using phone number instead.',
                ], 500);
            }
        } else {
            // Send via SMS
            $smsResult = $smsService->sendOtp($account->phone_number, $otp);
            if ($smsResult['success']) {
                $maskedPhone = $this->maskPhone($account->phone_number);
                $responseData['message'] = "OTP sent to {$maskedPhone}";
            } else {
                return response()->json([
                    'message' => 'Failed to send OTP via SMS. Please try again later or contact OSCA.',
                ], 500);
            }
        }

        return response()->json($responseData);
    }

    // Verify Cloudflare Turnstile token
    private function verifyTurnstile(string $token, ?string $ip): bool
    {
        try {
            $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => config('services.turnstile.secret'),
                'response' => $token,
                'remoteip' => $ip,
            ]);

            $data = $response->json();
            return $data['success'] ?? false;
        } catch (\Exception $e) {
            Log::error('Turnstile verification failed', ['error' => $e->getMessage()]);
            // Fail open — allow request if Turnstile is down
            return true;
        }
    }

    // Mask an email address for display (e.g., a***l@gmail.com)
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***@***';
        }

        $local = $parts[0];
        $domain = $parts[1];

        if (strlen($local) <= 2) {
            $masked = $local[0] . '***';
        } else {
            $masked = $local[0] . str_repeat('*', strlen($local) - 2) . substr($local, -1);
        }

        return $masked . '@' . $domain;
    }

    // Mask a phone number for display (e.g., 09***5678)
    private function maskPhone(string $phone): string
    {
        if (strlen($phone) <= 4) return '****';
        return substr($phone, 0, 2) . str_repeat('*', strlen($phone) - 4) . substr($phone, -4);
    }

    // Verify OTP and create account (set PIN)
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
        
        $senior = SeniorCitizen::with([
            'barangay', 'gender', 'civilStatus', 'contact',
            'familyMembers', 'healthProfile',
        ])->find($seniorId);

        if (!$senior) {
            return response()->json(['message' => 'Senior not found'], 404);
        }

        // Build address from contact fields
        $contact = $senior->contact;
        $addressParts = array_filter([
            $contact?->house_number,
            $contact?->street,
            $senior->barangay?->name,
            $contact?->city,
        ]);
        $address = implode(', ', $addressParts) ?: null;

        return response()->json([
            'data' => [
                'id' => $senior->id,
                'osca_id' => $senior->osca_id,
                'first_name' => $senior->first_name,
                'middle_name' => $senior->middle_name,
                'last_name' => $senior->last_name,
                'extension' => $senior->extension,
                'birthdate' => $senior->birthdate,
                'age' => $senior->age,
                'gender' => $senior->gender?->name,
                'civil_status' => $senior->civilStatus?->name,
                'barangay' => $senior->barangay?->name,
                'address' => $address,
                'mobile_number' => $contact?->mobile_number,
                'telephone_number' => $contact?->telephone_number,
                'email' => $contact?->email,
                'photo' => $senior->photo_path,
                'family_members' => $senior->familyMembers,
                'health_profile' => $senior->healthProfile,
                'target_sectors' => $senior->target_sectors ?? [],
                'sub_categories' => $senior->sub_categories ?? [],
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
                'benefit_type' => $claim->benefitType?->name ?? 'Unknown',
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

        // Count published announcements
        $announcements = \App\Models\Announcement::published()->count();

        // Count complaints (benefit complaints filed by this senior)
        $complaints = \App\Models\BenefitComplaint::where('senior_id', $seniorId)->count();

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
